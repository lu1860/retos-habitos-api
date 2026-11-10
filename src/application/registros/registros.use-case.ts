import type {
  ActualizarRegistro,
  NuevoRegistro,
  Registro,
} from "../../domain/models/Registro.ts";

import type { IRegistroRepository } from "../../domain/repository/IRegistro.repository.ts";
import type { IParticipacionRepository } from "../../domain/repository/IParticipacion.repository.ts";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/app.error.ts";

export class RegistrosUseCase {
  constructor(
    private readonly registros: IRegistroRepository,
    private readonly participaciones: IParticipacionRepository,
  ) {}

  async create(
    usuarioId: number,
    retoId: number,
    nota?: string | null,
  ): Promise<Registro> {
    const participa = await this.participaciones.isActiveParticipant(
      usuarioId,
      retoId,
    );

    if (!participa) {
      throw new ForbiddenError("Debes participar en el reto para registrar tu cumplimiento");
    }

    // La fecha la establece el servidor.
    const fecha = new Date();
    fecha.setUTCHours(0, 0, 0, 0);

    const existente = await this.registros.findByUsuarioRetoFecha(
      usuarioId,
      retoId,
      fecha,
    );

    const notaLimpia = nota?.trim() || null;

    if (existente?.status === "ACTIVE") {
      throw new ConflictError("Ya tienes un registro para este reto en el día de hoy");
    }

    if (existente?.status === "INACTIVE") {
      return this.registros.reactivate(existente.id, notaLimpia);
    }

    const nuevoRegistro: NuevoRegistro = {
      usuarioId,
      retoId,
      fecha,
      nota: notaLimpia,
    };

    return this.registros.create(nuevoRegistro);
  }

  async list(usuarioId: number, retoId: number): Promise<Registro[]> {
    return this.registros.findAllByUsuarioYReto(usuarioId, retoId);
  }

  async update(
    id: number,
    usuarioId: number,
    data: ActualizarRegistro,
  ): Promise<Registro> {
    const registro = await this.registros.findByIdAndUsuario(id, usuarioId);

    if (!registro) {
      throw new NotFoundError("Registro no encontrado");
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Debes enviar al menos un campo para actualizar");
    }

    return this.registros.update(id, usuarioId, {
      nota: data.nota === undefined ? undefined : data.nota?.trim() || null,
    });
  }

  async deactivate(id: number, usuarioId: number): Promise<void> {
    const registro = await this.registros.findByIdAndUsuario(id, usuarioId);

    if (!registro) {
      throw new NotFoundError("Registro no encontrado");
    }

    await this.registros.deactivate(id, usuarioId);
  }

  async progress(
    usuarioId: number,
    retoId: number,
  ): Promise<{ totalDias: number }> {
    const totalDias = await this.registros.countActiveByUsuarioYReto(
      usuarioId,
      retoId,
    );

    return { totalDias };
  }
}