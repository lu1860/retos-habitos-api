import type { Participacion } from "../../domain/models/Participacion.ts";
import type { IParticipacionRepository } from "../../domain/repository/IParticipacion.repository.ts";
import type {
  IParticipacionLifecycleRepository,
  JoinResult,
  LeaveResult,
} from "../../domain/repository/IParticipacionLifecycle.repository.ts";
import { Prisma, type participaciones } from "../../generated/prisma/client.ts";
import { prisma } from "./prisma.client.ts";

const toDomain = (row: participaciones): Participacion => ({
  id: row.id,
  usuarioId: row.usuario_id,
  retoId: row.reto_id,
  fechaUnion: row.fecha_union,
  status: row.status,
});

export class ParticipacionesPgRepository
  implements IParticipacionRepository, IParticipacionLifecycleRepository
{
  constructor(private readonly client: typeof prisma = prisma) {}

  private async validate(tx: Prisma.TransactionClient, usuarioId: number, retoId: number) {
    // El bloqueo serializa el ciclo de vida por reto y coordina su desactivación.
    const rows = await tx.$queryRaw<
      { status: string }[]
    >`SELECT status FROM retos WHERE id = ${retoId} FOR UPDATE`;
    if (rows[0]?.status !== "ACTIVE") return "reto-not-found" as const;
    const user = await tx.usuarios.findFirst({
      where: { id: usuarioId, status: "ACTIVE" },
      select: { id: true },
    });
    return user ? null : ("unauthorized" as const);
  }

  async join(usuarioId: number, retoId: number): Promise<JoinResult> {
    try {
      return await this.client.$transaction(async (tx) => {
        const invalid = await this.validate(tx, usuarioId, retoId);
        if (invalid) return { kind: invalid };
        const where = { usuario_id: usuarioId, reto_id: retoId };
        const row = await tx.participaciones.findUnique({ where: { usuario_id_reto_id: where } });
        if (row?.status === "ACTIVE") return { kind: "already-active" };
        if (!row) {
          const created = await tx.participaciones.create({ data: { ...where, status: "ACTIVE" } });
          return { kind: "created", participacion: toDomain(created) };
        }
        const changed = await tx.participaciones.updateMany({
          where: { ...where, id: row.id, status: "INACTIVE" },
          data: { status: "ACTIVE" },
        });
        if (changed.count !== 1) return { kind: "already-active" };
        return { kind: "reactivated", participacion: toDomain({ ...row, status: "ACTIVE" }) };
      });
    } catch (error) {
      // La restricción única sigue siendo la defensa final; no se reintenta.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        return { kind: "already-active" };
      throw error;
    }
  }

  async leave(usuarioId: number, retoId: number): Promise<LeaveResult> {
    return this.client.$transaction(async (tx) => {
      const invalid = await this.validate(tx, usuarioId, retoId);
      if (invalid) return invalid;
      const changed = await tx.participaciones.updateMany({
        where: { usuario_id: usuarioId, reto_id: retoId, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      });
      return changed.count === 1 ? "left" : "not-active";
    });
  }

  async findByUsuarioYReto(usuarioId: number, retoId: number): Promise<Participacion | null> {
    const row = await this.client.participaciones.findUnique({
      where: { usuario_id_reto_id: { usuario_id: usuarioId, reto_id: retoId } },
    });
    return row ? toDomain(row) : null;
  }

  async isActiveParticipant(usuarioId: number, retoId: number): Promise<boolean> {
    return (await this.findByUsuarioYReto(usuarioId, retoId))?.status === "ACTIVE";
  }

  async create(usuarioId: number, retoId: number): Promise<Participacion> {
    return toDomain(
      await this.client.participaciones.create({
        data: { usuario_id: usuarioId, reto_id: retoId, status: "ACTIVE" },
      }),
    );
  }

  async reactivate(id: number): Promise<Participacion> {
    return toDomain(
      await this.client.participaciones.update({
        where: { id, status: "INACTIVE" },
        data: { status: "ACTIVE" },
      }),
    );
  }

  async deactivate(id: number): Promise<void> {
    await this.client.participaciones.update({
      where: { id, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }
}
