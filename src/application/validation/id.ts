import { BadRequestError } from "../errors/app.error.ts";

/**
 * Convierte un parámetro de la URL (siempre llega como texto) en un id entero positivo.
 * "abc", "0", "-3" o "1.5" responden 400 en lugar de llegar a Prisma.
 *
 * Uso en un controlador: const id = parseId(req.params.id);
 */
export const parseId = (value: unknown, field = "id"): number => {
  const text = typeof value === "string" ? value.trim() : "";
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1) {
    throw new BadRequestError(`${field} debe ser un número entero mayor o igual a 1`, {
      [field]: "Debe ser un número entero mayor o igual a 1",
    });
  }
  return number;
};
