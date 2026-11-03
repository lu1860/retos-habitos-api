import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";
import type { DatosRegistro } from "../../domain/models/Auth.ts";
import { trimIfString, type BodyDto } from "./body-dto.ts";

// Con stopAtFirstError se reporta el primer decorador que falla, de abajo hacia arriba:
// por eso @IsNotEmpty va al final (se revisa primero).
export class RegisterDto implements BodyDto<DatosRegistro> {
  @MaxLength(100, { message: "El nombre no puede tener más de 100 caracteres" })
  @MinLength(2, { message: "El nombre debe tener al menos 2 caracteres" })
  @IsString({ message: "El nombre debe ser un texto" })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  nombre: string;

  @MaxLength(150, { message: "El email no puede tener más de 150 caracteres" })
  @IsEmail({}, { message: "El email no tiene un formato válido" })
  @IsString({ message: "El email debe ser un texto" })
  @IsNotEmpty({ message: "El email es obligatorio" })
  email: string;

  // bcrypt solo usa los primeros 72 bytes: por eso el máximo
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: "La contraseña debe tener al menos una mayúscula, una minúscula y un número",
  })
  @MaxLength(72, { message: "La contraseña no puede tener más de 72 caracteres" })
  @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
  @IsString({ message: "La contraseña debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  password: string;

  constructor(payload: Record<string, unknown>) {
    this.nombre = trimIfString(payload["nombre"]) as string;
    // El email se guarda en minúsculas: "Ana@Mail.com" y "ana@mail.com" son la misma cuenta
    const email = trimIfString(payload["email"]);
    this.email = (typeof email === "string" ? email.toLowerCase() : email) as string;
    // La contraseña no se recorta: los espacios cuentan
    this.password = payload["password"] as string;
  }

  toInput(): DatosRegistro {
    return { nombre: this.nombre, email: this.email, password: this.password };
  }
}
