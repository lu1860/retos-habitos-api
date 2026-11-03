import { BadRequestError } from "../errors/app.error.ts";

/**
 * Lee un filtro de texto opcional de la query (?q=agua).
 * Si no viene o viene vacío devuelve undefined. Si viene repetido (?q=a&q=b) responde 400.
 */
export const optionalText = (
  value: unknown,
  field: string,
  maxLength = 100,
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestError(`${field} debe enviarse una sola vez`, { [field]: "Valor inválido" });
  }
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > maxLength) {
    throw new BadRequestError(`${field} no puede tener más de ${maxLength} caracteres`, {
      [field]: `Máximo ${maxLength} caracteres`,
    });
  }
  return text;
};

/** Lee un valor opcional que debe pertenecer a una lista cerrada (?rol=admin). */
export const optionalEnum = <T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined => {
  const text = optionalText(value, field);
  if (text === undefined) return undefined;
  if (!allowed.includes(text as T)) {
    throw new BadRequestError(`${field} debe ser uno de: ${allowed.join(", ")}`, {
      [field]: `Valores permitidos: ${allowed.join(", ")}`,
    });
  }
  return text as T;
};
