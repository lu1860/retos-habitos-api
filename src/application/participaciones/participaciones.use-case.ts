import type { IParticipacionLifecycleRepository } from "../../domain/repository/IParticipacionLifecycle.repository.ts";
import { ConflictError, NotFoundError, UnauthorizedError } from "../errors/app.error.ts";

export class ParticipacionesUseCase {
  constructor(private readonly repository: IParticipacionLifecycleRepository) {}

  async join(usuarioId: number, retoId: number) {
    const result = await this.repository.join(usuarioId, retoId);
    switch (result.kind) {
      case "unauthorized":
        throw new UnauthorizedError("La sesión ya no es válida. Inicia sesión de nuevo");
      case "reto-not-found":
        throw new NotFoundError("Reto no encontrado");
      case "already-active":
        throw new ConflictError("Ya participas en este reto");
      default:
        return { created: result.kind === "created", participacion: result.participacion };
    }
  }

  async leave(usuarioId: number, retoId: number): Promise<void> {
    const result = await this.repository.leave(usuarioId, retoId);
    if (result === "unauthorized")
      throw new UnauthorizedError("La sesión ya no es válida. Inicia sesión de nuevo");
    if (result === "reto-not-found") throw new NotFoundError("Reto no encontrado");
    if (result === "not-active") throw new NotFoundError("Participación activa no encontrada");
  }
  async findActiveByUsuario(usuarioId: number) {
  return this.repository.findActiveByUsuario(usuarioId);
}

}
