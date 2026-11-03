import type { Page } from "../../domain/models/Pagination.ts";
import type { NuevoUsuario, Usuario, UsuarioFiltros } from "../../domain/models/Usuario.ts";
import type { IUsuarioRepository } from "../../domain/repository/IUsuario.repository.ts";
import type { Prisma, usuarios } from "../../generated/prisma/client.ts";
import { toSkip } from "../../application/validation/pagination.ts";
import { prisma } from "./prisma.client.ts";

/** Implementación con Prisma del repositorio de usuarios. */
export class UsuariosPgRepository implements IUsuarioRepository {
  async create(data: NuevoUsuario): Promise<Usuario> {
    const row = await prisma.usuarios.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.passwordHash,
        rol: data.rol,
      },
    });
    return this.toDomain(row);
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const row = await prisma.usuarios.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveById(id: number): Promise<Usuario | null> {
    // findFirst y no findUnique porque también se filtra por status
    const row = await prisma.usuarios.findFirst({ where: { id, status: "ACTIVE" } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filtros: UsuarioFiltros): Promise<Page<Usuario>> {
    // Los filtros opcionales solo se agregan al where si vienen
    const where: Prisma.usuariosWhereInput = {
      status: "ACTIVE",
      ...(filtros.rol && { rol: filtros.rol }),
      ...(filtros.q && {
        OR: [
          { nombre: { contains: filtros.q, mode: "insensitive" } },
          { email: { contains: filtros.q, mode: "insensitive" } },
        ],
      }),
    };
    const [total, rows] = await Promise.all([
      prisma.usuarios.count({ where }),
      prisma.usuarios.findMany({
        where,
        // Orden fijo: sin él, la base puede repetir o saltarse filas entre páginas
        orderBy: { id: "asc" },
        skip: toSkip(filtros.page, filtros.limit),
        take: filtros.limit,
      }),
    ]);
    return { total, rows: rows.map((row) => this.toDomain(row)) };
  }

  // Convierte la fila (snake_case) al modelo de dominio (camelCase)
  private toDomain(row: usuarios): Usuario {
    return {
      id: row.id,
      nombre: row.nombre,
      email: row.email,
      passwordHash: row.password,
      rol: row.rol,
      status: row.status,
      createdAt: row.created_at,
    };
  }
}
