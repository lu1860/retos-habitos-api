/**
 * Contrato de un DTO de body. Cada DTO:
 *  1. Recibe el body crudo en el constructor y copia SOLO los campos permitidos
 *     (lo que sobre, como "rol" o "creadorId", se ignora).
 *  2. Declara sus reglas con decoradores de class-validator.
 *  3. Entrega los datos limpios con toInput().
 *
 * Se usa en los routers con el middleware validateBody(MiDto).
 */
export interface BodyDto<T> {
  toInput(): T;
}

export type BodyDtoClass<T> = new (payload: Record<string, unknown>) => BodyDto<T>;

/** Devuelve el texto sin espacios a los lados, o el valor tal cual si no es texto (lo rechaza el validador). */
export const trimIfString = (value: unknown): unknown =>
  typeof value === "string" ? value.trim() : value;
