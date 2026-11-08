import { toSkip } from "../../application/validation/pagination.ts";
import type { Page } from "../../domain/models/Pagination.ts";
import type { ActualizarReto, NuevoReto, Reto, RetoFiltros } from "../../domain/models/Reto.ts";
import type { IRetoRepository } from "../../domain/repository/IReto.repository.ts";
import type { Prisma, retos } from "../../generated/prisma/client.ts";
import { prisma } from "./prisma.client.ts";

export class RetosPgRepository implements IRetoRepository {
  constructor(private readonly tabla: typeof prisma.retos = prisma.retos) {}

  async create(data: NuevoReto): Promise<Reto> {
    const row = await this.tabla.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        imagen_url: data.imagenUrl,
        duracion_dias: data.duracionDias,
        es_oficial: data.esOficial,
        categoria_id: data.categoriaId,
        creador_id: data.creadorId,
        status: "ACTIVE",
      },
    });
    return this.toDomain(row);
  }

  async findActiveById(id: number): Promise<Reto | null> {
    const row = await this.tabla.findFirst({ where: { id, status: "ACTIVE" } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filtros: RetoFiltros): Promise<Page<Reto>> {
    const where: Prisma.retosWhereInput = {
      status: "ACTIVE",
      ...(filtros.categoriaId !== undefined && { categoria_id: filtros.categoriaId }),
      ...(filtros.q && {
        OR: [
          { nombre: { contains: filtros.q, mode: "insensitive" } },
          { descripcion: { contains: filtros.q, mode: "insensitive" } },
        ],
      }),
    };
    const [total, rows] = await Promise.all([
      this.tabla.count({ where }),
      this.tabla.findMany({
        where,
        orderBy: { id: "asc" },
        skip: toSkip(filtros.page, filtros.limit),
        take: filtros.limit,
      }),
    ]);
    return { total, rows: rows.map((row) => this.toDomain(row)) };
  }

  async update(id: number, data: ActualizarReto): Promise<Reto> {
    const row = await this.tabla.update({
      where: { id, status: "ACTIVE" },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        imagen_url: data.imagenUrl,
        duracion_dias: data.duracionDias,
        categoria_id: data.categoriaId,
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

  private toDomain(row: retos): Reto {
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      imagenUrl: row.imagen_url,
      duracionDias: row.duracion_dias,
      esOficial: row.es_oficial,
      categoriaId: row.categoria_id,
      creadorId: row.creador_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
