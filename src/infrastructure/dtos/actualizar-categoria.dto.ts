import {
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import type { ActualizarCategoria } from "../../domain/models/Categoria.ts";
import { trimIfString, type BodyDto } from "./body-dto.ts";

export class ActualizarCategoriaDto
  implements BodyDto<ActualizarCategoria>
{
  @IsOptional()
  @MaxLength(100, {
    message: "El nombre no puede tener más de 100 caracteres",
  })
  @IsString({ message: "El nombre debe ser un texto" })
  nombre?: string;

  @IsOptional()
  @MaxLength(500, {
    message: "La descripción no puede tener más de 500 caracteres",
  })
  @IsString({ message: "La descripción debe ser un texto" })
  descripcion?: string | null;

  constructor(payload: Record<string, unknown>) {
    this.nombre =
      payload["nombre"] === undefined
        ? undefined
        : (trimIfString(payload["nombre"]) as string);

    this.descripcion =
      payload["descripcion"] === undefined
        ? undefined
        : payload["descripcion"] === null
          ? null
          : (trimIfString(payload["descripcion"]) as string);
  }

  toInput(): ActualizarCategoria {
    return {
      nombre: this.nombre,
      descripcion: this.descripcion,
    };
  }
}