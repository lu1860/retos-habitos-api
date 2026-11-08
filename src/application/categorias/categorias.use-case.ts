import type { CategoriaActiva } from "../../domain/models/Categoria.ts";
import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";

export class CategoriasUseCase {
  constructor(private readonly categorias: ICategoriaRepository) {}

  async listActive(): Promise<CategoriaActiva[]> {
    return this.categorias.findAllActive();
  }
}
