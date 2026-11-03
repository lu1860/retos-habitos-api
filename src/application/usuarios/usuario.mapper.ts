import type { AuthUser, Usuario, UsuarioPublico } from "../../domain/models/Usuario.ts";

// El repositorio devuelve el hash porque el login lo necesita,
// pero nunca debe salir en una respuesta de la API.
export const toPublicUser = ({ passwordHash: _passwordHash, ...user }: Usuario): UsuarioPublico =>
  user;

/** Lo mínimo que viaja en el token y en req.user. */
export const toAuthUser = (user: Usuario): AuthUser => ({
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol,
});
