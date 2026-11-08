import { Allow, validateSync } from "class-validator";
import { BadRequestError } from "../../application/errors/app.error.ts";
import type { EditarRetoInput } from "../../domain/models/Reto.ts";
import type { BodyDto } from "./body-dto.ts";
import { CrearRetoDto } from "./crear-reto.dto.ts";

/** Valida solo los campos presentes con las mismas reglas de creación. */
export class ActualizarRetoDto implements BodyDto<EditarRetoInput> {
  @Allow()
  private readonly input: EditarRetoInput;

  constructor(payload: Record<string, unknown>) {
    const allowed = ["nombre", "descripcion", "duracionDias", "categoriaId"] as const;
    const keys = Object.keys(payload);
    if (!keys.length || keys.some((key) => !allowed.includes(key as (typeof allowed)[number]))) {
      throw new BadRequestError("Envía únicamente campos editables y al menos uno");
    }
    const dto = new CrearRetoDto(payload);
    const errors = validateSync(dto, { stopAtFirstError: true }).filter((error) =>
      keys.includes(error.property),
    );
    if (errors.length) {
      const details = Object.fromEntries(
        errors.map((error) => [
          error.property,
          Object.values(error.constraints ?? {})[0] ?? "Valor inválido",
        ]),
      );
      throw new BadRequestError("Los datos enviados no son válidos", details);
    }
    const clean = dto.toInput();
    this.input = Object.fromEntries(keys.map((key) => [key, clean[key as keyof typeof clean]]));
  }

  toInput(): EditarRetoInput {
    return this.input;
  }
}
