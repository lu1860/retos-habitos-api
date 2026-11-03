import type { UsuarioPublico } from "./Usuario.ts";

export interface Credenciales {
  email: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
}

/** Token que recibe el frontend. expiresIn va en segundos. */
export interface AuthToken {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

/** Respuesta de registro y login: el usuario (sin contraseña) y su token. */
export interface AuthResult {
  user: UsuarioPublico;
  token: AuthToken;
}
