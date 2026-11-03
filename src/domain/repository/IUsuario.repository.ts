import type { Page } from "../models/Pagination.ts";
import type { NuevoUsuario, Usuario, UsuarioFiltros } from "../models/Usuario.ts";

// Contrato del repositorio de usuarios. Los casos de uso dependen de esta interfaz,
// no de Prisma: la implementación vive en infrastructure/repository.
export interface IUsuarioRepository {
  create(data: NuevoUsuario): Promise<Usuario>;
  /** Busca por email sin importar el estado (el email es único en la tabla). */
  findByEmail(email: string): Promise<Usuario | null>;
  /** Busca un usuario ACTIVO por id. */
  findActiveById(id: number): Promise<Usuario | null>;
  /** Lista usuarios activos con paginación y filtros opcionales. */
  findAll(filtros: UsuarioFiltros): Promise<Page<Usuario>>;
}
