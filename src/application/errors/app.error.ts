/**
 * Errores de aplicación. Los casos de uso lanzan estos errores y el middleware central
 * (interface/middlewares/error.middleware.ts) los convierte en la respuesta HTTP:
 *
 *   BadRequestError → 400   UnauthorizedError → 401   ForbiddenError → 403
 *   NotFoundError   → 404   ConflictError     → 409
 *
 * Así ningún caso de uso conoce Express ni los códigos HTTP.
 */
export abstract class AppError extends Error {
  /** Detalle opcional por campo, por ejemplo { email: "email no es válido" }. */
  readonly details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

/** Datos de entrada inválidos: body, params o query. */
export class BadRequestError extends AppError {}

/** Sin sesión: falta el token, es inválido, expiró o las credenciales no coinciden. */
export class UnauthorizedError extends AppError {}

/** Con sesión, pero sin permiso para la acción (rol o dueño del recurso). */
export class ForbiddenError extends AppError {}

/** El recurso no existe o fue eliminado (borrado lógico). */
export class NotFoundError extends AppError {}

/** Choca con un dato que ya existe: email repetido, ya participa, registro del día repetido. */
export class ConflictError extends AppError {}
