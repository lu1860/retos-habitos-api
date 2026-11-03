import type { PaginatedResult } from "../../domain/models/Pagination.ts";
import { BadRequestError } from "../errors/app.error.ts";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// page y limit llegan como texto. Si no vienen se usa el valor por defecto;
// si vienen mal (0, -1, "abc", 1.5) se responde 400 en lugar de un 500.
const toPositiveInt = (value: unknown, field: string, defaultValue: number): number => {
  if (value === undefined || value === "") return defaultValue;
  const text = typeof value === "string" ? value.trim() : "";
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1) {
    throw new BadRequestError(`${field} debe ser un número entero mayor o igual a 1`, {
      [field]: "Debe ser un número entero mayor o igual a 1",
    });
  }
  return number;
};

/**
 * Lee ?page=&limit= de la query.
 * Uso en un controlador: const { page, limit } = parsePagination(req.query);
 */
export const parsePagination = (query: Record<string, unknown>) => {
  const page = toPositiveInt(query["page"], "page", DEFAULT_PAGE);
  const limit = toPositiveInt(query["limit"], "limit", DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) {
    throw new BadRequestError(`limit no puede ser mayor a ${MAX_LIMIT}`, {
      limit: `Máximo ${MAX_LIMIT}`,
    });
  }
  return { page, limit };
};

/** Cuántas filas saltar para llegar a la página pedida (el "skip" de Prisma). */
export const toSkip = (page: number, limit: number) => (page - 1) * limit;

/** Arma la respuesta de lista { data, pagination } que pide el documento del curso. */
export const toPaginatedResult = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> => ({
  data,
  pagination: {
    total,
    currentPage: page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
});
