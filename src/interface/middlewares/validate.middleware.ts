import { validate } from "class-validator";
import type { RequestHandler } from "express";
import { BadRequestError } from "../../application/errors/app.error.ts";
import type { BodyDtoClass } from "../../infrastructure/dtos/body-dto.ts";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Valida el body con un DTO antes de llegar al controlador.
 * Si hay errores responde 400 con un mensaje por campo; si no, reemplaza req.body
 * por los datos limpios (solo los campos permitidos, ya recortados).
 *
 *   router.post("/register", validateBody(RegisterDto), controller.register);
 */
export const validateBody =
  <T>(Dto: BodyDtoClass<T>): RequestHandler =>
  async (req, _res, next) => {
    if (!isPlainObject(req.body)) {
      throw new BadRequestError("El cuerpo de la petición debe ser un objeto JSON");
    }
    const dto = new Dto(req.body);
    const errors = await validate(dto, { stopAtFirstError: true });
    if (errors.length > 0) {
      const details: Record<string, string> = {};
      for (const error of errors) {
        details[error.property] = Object.values(error.constraints ?? {})[0] ?? "Valor inválido";
      }
      throw new BadRequestError("Los datos enviados no son válidos", details);
    }
    req.body = dto.toInput();
    next();
  };
