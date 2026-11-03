import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  type AppError,
} from "../../application/errors/app.error.ts";
import { Prisma } from "../../generated/prisma/client.ts";

/**
 * Traduce los errores de Prisma a errores de aplicación, para que nunca lleguen como 500.
 * La usa el middleware central de errores. Devuelve null si el error no es de Prisma
 * o si es un fallo de conexión (ese se responde aparte como 503).
 *
 * Códigos: https://www.prisma.io/docs/orm/reference/error-reference
 */
export const translatePrismaError = (error: unknown): AppError | null => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": // valor repetido en un campo @unique o @@unique
        return new ConflictError("Ya existe un registro con esos datos");
      case "P2025": // update o delete sobre una fila que no existe
        return new NotFoundError("El recurso no existe");
      case "P2003": // la llave foránea apunta a una fila que no existe
        return new BadRequestError("El recurso relacionado no existe");
      case "P2000": // texto más largo que la columna
        return new BadRequestError("Uno de los valores es demasiado largo");
      default:
        return null;
    }
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError("Los datos enviados no tienen el formato esperado");
  }
  return null;
};

/** true si Prisma no pudo conectarse a la base de datos. */
export const isDatabaseConnectionError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientInitializationError ||
  (error instanceof Prisma.PrismaClientKnownRequestError && /^P10\d\d$/.test(error.code));
