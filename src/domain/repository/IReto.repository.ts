import type { Page } from "../models/Pagination.ts";
import type { ActualizarReto, NuevoReto, Reto, RetoFiltros } from "../models/Reto.ts";

export interface IRetoRepository {
  create(data: NuevoReto): Promise<Reto>;
  /** Devuelve null si no existe o está inactivo. */
  findActiveById(id: number): Promise<Reto | null>;
  /** Filas activas paginadas y total con los mismos filtros. */
  findAll(filtros: RetoFiltros): Promise<Page<Reto>>;
  /** Solo actualiza retos activos; la autorización corresponde al caso de uso. */
  update(id: number, data: ActualizarReto): Promise<Reto>;
  /** Cambia un reto activo a INACTIVE sin borrar sus relaciones. */
  deactivate(id: number): Promise<void>;
}
