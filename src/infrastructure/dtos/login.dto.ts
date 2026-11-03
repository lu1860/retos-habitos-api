import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { Credenciales } from "../../domain/models/Auth.ts";
import { trimIfString, type BodyDto } from "./body-dto.ts";

// En el login solo se valida la forma. Si los datos no coinciden, el caso de uso responde 401.
export class LoginDto implements BodyDto<Credenciales> {
  @MaxLength(150, { message: "El email no puede tener más de 150 caracteres" })
  @IsEmail({}, { message: "El email no tiene un formato válido" })
  @IsString({ message: "El email debe ser un texto" })
  @IsNotEmpty({ message: "El email es obligatorio" })
  email: string;

  @MaxLength(72, { message: "La contraseña no puede tener más de 72 caracteres" })
  @IsString({ message: "La contraseña debe ser un texto" })
  @IsNotEmpty({ message: "La contraseña es obligatoria" })
  password: string;

  constructor(payload: Record<string, unknown>) {
    const email = trimIfString(payload["email"]);
    this.email = (typeof email === "string" ? email.toLowerCase() : email) as string;
    this.password = payload["password"] as string;
  }

  toInput(): Credenciales {
    return { email: this.email, password: this.password };
  }
}
