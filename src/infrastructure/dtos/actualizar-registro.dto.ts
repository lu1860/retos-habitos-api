import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import type { ActualizarRegistro } from "../../domain/models/Registro.ts";
import { trimIfString, type BodyDto } from "./body-dto.ts";

export class ActualizarRegistroDto
  implements BodyDto<ActualizarRegistro>
{
  @IsOptional()
  @IsString({ message: "La nota debe ser un texto" })
  @MaxLength(500, {
    message: "La nota no puede superar los 500 caracteres",
  })
  nota?: string | null;

  constructor(payload: Record<string, unknown>) {
    this.nota =
      payload["nota"] === undefined
        ? undefined
        : payload["nota"] === null
          ? null
          : (trimIfString(payload["nota"]) as string);
  }

  toInput(): ActualizarRegistro {
    return {
      nota: this.nota,
    };
  }
}