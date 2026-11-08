import type { PaginatedResult } from "../../domain/models/Pagination.ts";
import type { CrearRetoInput, Reto, RetoFiltros } from "../../domain/models/Reto.ts";
import type { AuthUser } from "../../domain/models/Usuario.ts";
import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";
import type { IRetoRepository } from "../../domain/repository/IReto.repository.ts";
import { NotFoundError } from "../errors/app.error.ts";
import { toPaginatedResult } from "../validation/pagination.ts";

export class RetosUseCase {
  constructor(
    private readonly retos: IRetoRepository,
    private readonly categorias: ICategoriaRepository,
  ) {}

  async create(input: CrearRetoInput, user: AuthUser): Promise<Reto> {
    if (!(await this.categorias.findActiveById(input.categoriaId))) {
      throw new NotFoundError("Categoría no encontrada o inactiva");
    }
    return this.retos.create({
      nombre: input.nombre,
      descripcion: input.descripcion,
      duracionDias: input.duracionDias,
      categoriaId: input.categoriaId,
      creadorId: user.id,
      esOficial: user.rol === "admin",
    });
  }

  async list(filtros: RetoFiltros): Promise<PaginatedResult<Reto>> {
    const { rows, total } = await this.retos.findAll(filtros);
    return toPaginatedResult(rows, total, filtros.page, filtros.limit);
  }

  async findById(id: number): Promise<Reto> {
    const reto = await this.retos.findActiveById(id);
    if (!reto) throw new NotFoundError("Reto no encontrado");
    return reto;
  }
}
