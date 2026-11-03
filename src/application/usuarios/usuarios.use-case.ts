import type { PaginatedResult } from "../../domain/models/Pagination.ts";
import type { UsuarioFiltros, UsuarioPublico } from "../../domain/models/Usuario.ts";
import type { IUsuarioRepository } from "../../domain/repository/IUsuario.repository.ts";
import { toPaginatedResult } from "../validation/pagination.ts";
import { toPublicUser } from "./usuario.mapper.ts";

/** Consulta de usuarios para la vista de administración (solo admin, ver usuarios.router.ts). */
export class UsuariosUseCase {
  private readonly usuarios: IUsuarioRepository;

  constructor(usuarios: IUsuarioRepository) {
    this.usuarios = usuarios;
  }

  async list(filtros: UsuarioFiltros): Promise<PaginatedResult<UsuarioPublico>> {
    const { rows, total } = await this.usuarios.findAll(filtros);
    return toPaginatedResult(rows.map(toPublicUser), total, filtros.page, filtros.limit);
  }
}
