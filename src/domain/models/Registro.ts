import type { Estado } from "./Usuario.ts";

export interface Registro {
  id: number;
  usuarioId: number;
  retoId: number;
  fecha: Date;
  nota: string | null;
  status: Estado;
  createdAt: Date;
  updatedAt: Date;
}

export interface NuevoRegistro {
  usuarioId: number;
  retoId: number;
  fecha: Date;
  nota?: string | null;
}

export interface ActualizarRegistro {
  nota?: string | null;
}