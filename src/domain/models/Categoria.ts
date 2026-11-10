import type { Estado } from "./Usuario.ts";

export interface CategoriaActiva {
  id: number;
  nombre: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  status: Estado;
  createdAt: Date;
  updatedAt: Date;
}

export interface NuevaCategoria {
  nombre: string;
  descripcion?: string | null;
}

export interface ActualizarCategoria {
  nombre?: string;
  descripcion?: string | null;
}