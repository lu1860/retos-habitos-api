import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { trimIfString, type BodyDto } from "./body-dto.ts";

export interface CrearRegistroInput {
  nota?: string | null;
}

export class CrearRegistroDto implements BodyDto<CrearRegistroInput> {
  @IsOptional()
  @IsString({ message: "La nota debe ser un texto" })
  @MaxLength(500, {
    message: "La nota no puede superar los 500 caracteres",
  })
  nota?: string | null;

  constructor(payload: Record<string, unknown>) {
    this.nota =
      payload["nota"] === null
        ? null
        : (trimIfString(payload["nota"]) as string | undefined);
  }

  toInput(): CrearRegistroInput {
    return {
      nota: this.nota,
    };
  }
}