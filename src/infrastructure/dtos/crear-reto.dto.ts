import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";
import type { CrearRetoInput } from "../../domain/models/Reto.ts";
import { trimIfString, type BodyDto } from "./body-dto.ts";

export class CrearRetoDto implements BodyDto<CrearRetoInput> {
  @MaxLength(120, { message: "El nombre no puede tener más de 120 caracteres" })
  @IsString({ message: "El nombre debe ser un texto" })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  nombre: string;

  @MaxLength(1000, { message: "La descripción no puede tener más de 1000 caracteres" })
  @IsString({ message: "La descripción debe ser un texto" })
  @IsNotEmpty({ message: "La descripción es obligatoria" })
  descripcion: string;

  @Max(2147483647, { message: "La duración excede el máximo permitido" })
  @Min(1, { message: "La duración debe ser positiva" })
  @IsInt({ message: "La duración debe ser un entero" })
  duracionDias: number;

  @Max(2147483647, { message: "La categoría excede el máximo permitido" })
  @Min(1, { message: "La categoría debe ser positiva" })
  @IsInt({ message: "La categoría debe ser un entero" })
  categoriaId: number;

  constructor(payload: Record<string, unknown>) {
    this.nombre = trimIfString(payload["nombre"]) as string;
    this.descripcion = trimIfString(payload["descripcion"]) as string;
    this.duracionDias = payload["duracionDias"] as number;
    this.categoriaId = payload["categoriaId"] as number;
  }

  toInput(): CrearRetoInput {
    return {
      nombre: this.nombre,
      descripcion: this.descripcion,
      duracionDias: this.duracionDias,
      categoriaId: this.categoriaId,
    };
  }
}
