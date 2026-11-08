import type { IUsuarioRepository } from "../../domain/repository/IUsuario.repository.ts";
import type { IRetoRepository } from "../../domain/repository/IReto.repository.ts";
import type { IParticipacionRepository } from "../../domain/repository/IParticipacion.repository.ts";
import { NotFoundError, UnauthorizedError } from "../errors/app.error.ts";

export class ConsultarParticipacionUseCase {
  constructor(
    private readonly usuarios: IUsuarioRepository,
    private readonly retos: IRetoRepository,
    private readonly participaciones: IParticipacionRepository,
  ) {}

  async execute(usuarioId: number, retoId: number): Promise<{ participa: boolean }> {
    if (!(await this.usuarios.findActiveById(usuarioId)))
      throw new UnauthorizedError("La sesión ya no es válida. Inicia sesión de nuevo");
    if (!(await this.retos.findActiveById(retoId))) throw new NotFoundError("Reto no encontrado");
    return { participa: await this.participaciones.isActiveParticipant(usuarioId, retoId) };
  }
}
