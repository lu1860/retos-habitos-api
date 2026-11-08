import type { Estado } from "./Usuario.ts";

/** Modelo de dominio independiente de las columnas snake_case de Prisma. */
export interface Reto {
  id: number;
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  duracionDias: number;
  esOficial: boolean;
  categoriaId: number;
  creadorId: number;
  status: Estado;
  createdAt: Date;
  updatedAt: Date;
}

/** El caso de uso determina creadorId y esOficial, nunca el body directamente. */
export interface NuevoReto {
  nombre: string;
  descripcion: string;
  imagenUrl?: string | null;
  duracionDias: number;
  esOficial: boolean;
  categoriaId: number;
  creadorId: number;
}

/** No permite cambiar creador, oficialidad ni estado mediante una edición. */
export type ActualizarReto = Partial<
  Pick<NuevoReto, "nombre" | "descripcion" | "imagenUrl" | "duracionDias" | "categoriaId">
>;

export interface RetoFiltros {
  categoriaId?: number;
  /** Busca en nombre o descripción sin distinguir mayúsculas. */
  q?: string;
  page: number;
  limit: number;
}
