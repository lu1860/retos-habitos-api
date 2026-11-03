import type { ErrorRequestHandler, RequestHandler } from "express";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../application/errors/app.error.ts";
import {
  isDatabaseConnectionError,
  translatePrismaError,
} from "../../infrastructure/repository/prisma-errors.ts";

/**
 * Formato ÚNICO de error de toda la API:
 *   { "error": "mensaje para el usuario", "details": { "campo": "mensaje" } }
 * "details" solo aparece en errores de validación. Nunca se envía el stack trace.
 */
interface ErrorBody {
  error: string;
  details?: Record<string, string>;
}

const statusOf = (error: AppError): number => {
  if (error instanceof BadRequestError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 500;
};

const toBody = (error: AppError): ErrorBody =>
  error.details ? { error: error.message, details: error.details } : { error: error.message };

/** Ninguna ruta coincidió: responde JSON en lugar del HTML por defecto de Express. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `La ruta ${req.method} ${req.path} no existe` });
};

/**
 * Manejador central de errores. Express 5 envía aquí cualquier error lanzado
 * (o promesa rechazada) en un middleware o controlador: no hace falta try/catch en cada uno.
 * Va registrado de último en app.ts.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = error instanceof AppError ? error : translatePrismaError(error);
  if (appError) {
    res.status(statusOf(appError)).json(toBody(appError));
    return;
  }

  // Errores del parser de JSON de Express (body mal formado o demasiado grande)
  const type = (error as { type?: unknown } | null)?.type;
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
    return;
  }
  if (type === "entity.too.large") {
    res.status(413).json({ error: "El cuerpo de la petición es demasiado grande" });
    return;
  }

  if (isDatabaseConnectionError(error)) {
    console.error("[db] No se pudo conectar a la base de datos:", error);
    res.status(503).json({ error: "La base de datos no está disponible. Intenta más tarde" });
    return;
  }

  // Error no previsto: se registra completo en la consola del servidor, pero al cliente
  // solo le llega un mensaje genérico (sin stack trace ni detalles internos)
  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
};
