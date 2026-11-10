import type {
  Registro,
  NuevoRegistro,
  ActualizarRegistro,
} from "../../domain/models/Registro.ts";

import type {
  IRegistroRepository,
} from "../../domain/repository/IRegistro.repository.ts";

import type { registros } from "../../generated/prisma/client.ts";
import { prisma } from "./prisma.client.ts";

export class RegistrosPgRepository implements IRegistroRepository {
  constructor(private readonly client: typeof prisma = prisma) {}

  async findByUsuarioRetoFecha(
    usuarioId: number,
    retoId: number,
    fecha: Date,
  ): Promise<Registro | null> {
    const row = await this.client.registros.findUnique({
      where: {
        usuario_id_reto_id_fecha: {
          usuario_id: usuarioId,
          reto_id: retoId,
          fecha,
        },
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async create(data: NuevoRegistro): Promise<Registro> {
    const row = await this.client.registros.create({
      data: {
        usuario_id: data.usuarioId,
        reto_id: data.retoId,
        fecha: data.fecha,
        nota: data.nota ?? null,
        status: "ACTIVE",
      },
    });

    return this.toDomain(row);
  }

  async reactivate(id: number, nota: string | null): Promise<Registro> {
    const row = await this.client.registros.update({
      where: {
        id,
        status: "INACTIVE",
      },
      data: {
        status: "ACTIVE",
        nota,
      },
    });

    return this.toDomain(row);
  }

  async findByIdAndUsuario(
    id: number,
    usuarioId: number,
  ): Promise<Registro | null> {
    const row = await this.client.registros.findFirst({
      where: {
        id,
        usuario_id: usuarioId,
        status: "ACTIVE",
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findAllByUsuarioYReto(
    usuarioId: number,
    retoId: number,
  ): Promise<Registro[]> {
    const rows = await this.client.registros.findMany({
      where: {
        usuario_id: usuarioId,
        reto_id: retoId,
        status: "ACTIVE",
      },
      orderBy: {
        fecha: "desc",
      },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async update(
    id: number,
    usuarioId: number,
    data: ActualizarRegistro,
  ): Promise<Registro> {
    const row = await this.client.registros.update({
      where: {
        id,
        usuario_id: usuarioId,
        status: "ACTIVE",
      },
      data: {
        nota: data.nota,
      },
    });

    return this.toDomain(row);
  }

  async deactivate(id: number, usuarioId: number): Promise<void> {
    await this.client.registros.update({
      where: {
        id,
        usuario_id: usuarioId,
        status: "ACTIVE",
      },
      data: {
        status: "INACTIVE",
      },
    });
  }

  async countActiveByUsuarioYReto(
    usuarioId: number,
    retoId: number,
  ): Promise<number> {
    return this.client.registros.count({
      where: {
        usuario_id: usuarioId,
        reto_id: retoId,
        status: "ACTIVE",
      },
    });
  }

  private toDomain(row: registros): Registro {
    return {
      id: row.id,
      usuarioId: row.usuario_id,
      retoId: row.reto_id,
      fecha: row.fecha,
      nota: row.nota,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}