import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";
import { prisma } from "./prisma.client.ts";

export class CategoriasPgRepository implements ICategoriaRepository {
  constructor(private readonly tabla: typeof prisma.categorias = prisma.categorias) {}

  async findActiveById(id: number): Promise<{ id: number } | null> {
    return this.tabla.findFirst({ where: { id, status: "ACTIVE" }, select: { id: true } });
  }
}
