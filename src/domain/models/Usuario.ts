// Modelo de dominio del usuario: camelCase e independiente de las columnas de la tabla.

export type RolUsuario = "admin" | "user";
export type Estado = "ACTIVE" | "INACTIVE";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  /** Hash de bcrypt. Solo lo usa el login; nunca sale en una respuesta (ver toPublicUser). */
  passwordHash: string;
  rol: RolUsuario;
  status: Estado;
  createdAt: Date;
}

/** Lo que se puede mostrar del usuario: todo menos el hash de la contraseña. */
export type UsuarioPublico = Omit<Usuario, "passwordHash">;

/** Datos del usuario que viajan dentro del JWT y quedan en req.user. */
export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

/** Datos para crear un usuario. El rol lo decide el caso de uso, no el body. */
export interface NuevoUsuario {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: RolUsuario;
}

export interface UsuarioFiltros {
  /** Texto a buscar en nombre o email (sin importar mayúsculas). */
  q?: string;
  rol?: RolUsuario;
  page: number;
  limit: number;
}
