import type { PaginatedResult } from "../../domain/models/Pagination.ts";
import type { Reto, RetoFiltros } from "../../domain/models/Reto.ts";
import type { IRetoRepository } from "../../domain/repository/IReto.repository.ts";
import { NotFoundError } from "../errors/app.error.ts";
import { toPaginatedResult } from "../validation/pagination.ts";

export class RetosUseCase {
  constructor(private readonly retos: IRetoRepository) {}

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
