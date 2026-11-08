import type { CategoriaActiva } from "../../domain/models/Categoria.ts";
import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";
import { prisma } from "./prisma.client.ts";

export class CategoriasPgRepository implements ICategoriaRepository {
  constructor(private readonly tabla: typeof prisma.categorias = prisma.categorias) {}

  async findActiveById(id: number): Promise<{ id: number } | null> {
    return this.tabla.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true } });
  }

  async findAllActive(): Promise<CategoriaActiva[]> {
    return this.tabla.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, nombre: true },
      orderBy: { id: "asc" },
    });
  }
}
