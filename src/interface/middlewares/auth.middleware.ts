import type { Request, RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError } from "../../application/errors/app.error.ts";
import type { AuthUser, RolUsuario } from "../../domain/models/Usuario.ts";
import { tokenService } from "../dependencies.ts";

// Agrega "user" a la petición de Express; lo llena authenticate cuando el token es válido.
// Va aquí (y no en un .d.ts aparte) para que siempre entre en la compilación.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * AUTENTICACIÓN: ¿quién eres?
 * Lee "Authorization: Bearer <token>", verifica el JWT y deja el usuario en req.user.
 * Sin token, con un token inválido o vencido → 401.
 *
 *   router.post("/", authenticate, controller.create);
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    throw new UnauthorizedError("Debes iniciar sesión para usar este recurso");
  }
  const [scheme, token, extra] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw new UnauthorizedError("El header debe tener el formato: Authorization: Bearer <token>");
  }
  req.user = tokenService.verify(token);
  next();
};

/**
 * AUTORIZACIÓN: ¿puedes hacer esto?
 * Va DESPUÉS de authenticate, con los roles que sí tienen permiso. Otro rol → 403.
 *
 *   router.post("/", authenticate, authorize("admin"), controller.create);
 */
export const authorize =
  (...roles: RolUsuario[]): RequestHandler =>
  (req, _res, next) => {
    const user = requireUser(req);
    if (!roles.includes(user.rol)) {
      throw new ForbiddenError("No tienes permiso para realizar esta acción");
    }
    next();
  };

/** Usuario autenticado de la petición. Para controladores de rutas que usan authenticate. */
export const requireUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw new UnauthorizedError("Debes iniciar sesión para usar este recurso");
  }
  return req.user;
};
