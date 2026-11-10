
import type {
  Categoria,
  CategoriaActiva,
  NuevaCategoria,
  ActualizarCategoria,
} from "../../domain/models/Categoria.ts";

import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";

import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/app.error.ts";

export class CategoriasUseCase {
  constructor(private readonly categorias: ICategoriaRepository) {}

  async listActive(): Promise<CategoriaActiva[]> {
    return this.categorias.findAllActive();
  }

  async findById(id: number): Promise<Categoria> {
    const categoria = await this.categorias.findById(id);

    if (!categoria) {
      throw new NotFoundError("Categoría no encontrada");
    }

    return categoria;
  }

  async create(data: NuevaCategoria): Promise<Categoria> {
    const nombre = data.nombre?.trim();

    if (!nombre) {
      throw new BadRequestError("El nombre de la categoría es obligatorio");
    }

    return this.categorias.create({
      nombre,
      descripcion: data.descripcion?.trim() || null,
    });
  }

  async update(
    id: number,
    data: ActualizarCategoria,
  ): Promise<Categoria> {
    await this.findById(id);

    if (Object.keys(data).length === 0) {
      throw new BadRequestError("Debes enviar al menos un campo para actualizar");
    }

    const nombre = data.nombre?.trim();

    if (data.nombre !== undefined && !nombre) {
      throw new BadRequestError("El nombre no puede estar vacío");
    }

    return this.categorias.update(id, {
      ...data,
      nombre,
      descripcion:
        data.descripcion === undefined
          ? undefined
          : data.descripcion === null
            ? null
            : data.descripcion.trim() || null,
    });
  }

  async deactivate(id: number): Promise<void> {
    await this.findById(id);

    if (await this.categorias.hasActiveRetos(id)) {
      throw new ConflictError(
        "No se puede eliminar una categoría que tiene retos activos",
      );
    }

    await this.categorias.deactivate(id);
  }
}
