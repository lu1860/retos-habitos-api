import type { CategoriaActiva } from "../models/Categoria.ts";

export interface ICategoriaRepository {
  findActiveById(id: number): Promise<{ id: number } | null>;
  findAllActive(): Promise<CategoriaActiva[]>;
}
