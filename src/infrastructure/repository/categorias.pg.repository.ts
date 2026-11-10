
import type {
  Categoria,
  CategoriaActiva,
  NuevaCategoria,
  ActualizarCategoria,
} from "../../domain/models/Categoria.ts";

import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";

import type { categorias } from "../../generated/prisma/client.ts";

import { prisma } from "./prisma.client.ts";

export class CategoriasPgRepository implements ICategoriaRepository {
  constructor(
    private readonly tabla: typeof prisma.categorias = prisma.categorias,
  ) {}

  async findActiveById(id: number): Promise<{ id: number } | null> {
    return this.tabla.findFirst({
      where: { id, status: "ACTIVE" },
      select: { id: true },
    });
  }

  async findAllActive(): Promise<CategoriaActiva[]> {
    return this.tabla.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, nombre: true },
      orderBy: { id: "asc" },
    });
  }

  async findById(id: number): Promise<Categoria | null> {
    const row = await this.tabla.findFirst({
      where: { id, status: "ACTIVE" },
    });

    return row ? this.toDomain(row) : null;
  }

  async create(data: NuevaCategoria): Promise<Categoria> {
    const row = await this.tabla.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        status: "ACTIVE",
      },
    });

    return this.toDomain(row);
  }

  async update(
    id: number,
    data: ActualizarCategoria,
  ): Promise<Categoria> {
    const row = await this.tabla.update({
      where: { id, status: "ACTIVE" },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });

    return this.toDomain(row);
  }

  async deactivate(id: number): Promise<void> {
    await this.tabla.update({
      where: { id, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  async hasActiveRetos(id: number): Promise<boolean> {
    const total = await prisma.retos.count({
      where: {
        categoria_id: id,
        status: "ACTIVE",
      },
    });

    return total > 0;
  }

  private toDomain(row: categorias): Categoria {
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
