import type { AuthToken } from "../models/Auth.ts";
import type { AuthUser } from "../models/Usuario.ts";

// Contrato para emitir y verificar tokens. Implementación: infrastructure/services/jwt.service.ts
export interface ITokenService {
  generate(user: AuthUser): AuthToken;
  /** Devuelve el usuario del token o lanza UnauthorizedError si es inválido o expiró. */
  verify(token: string): AuthUser;
}
