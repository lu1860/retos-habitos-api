import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { UnauthorizedError } from "../../application/errors/app.error.ts";
import type { AuthToken } from "../../domain/models/Auth.ts";
import type { AuthUser } from "../../domain/models/Usuario.ts";
import type { ITokenService } from "../../domain/services/ITokenService.ts";
import { getJwtExpiresIn, requireEnv } from "../config/env.ts";

const ALGORITHM = "HS256";

/** Emite y verifica los JWT. El secreto y la duración salen del .env; el secreto no tiene valor por defecto. */
export class JwtService implements ITokenService {
  private readonly secret = requireEnv("JWT_SECRET");
  private readonly expiresIn = getJwtExpiresIn();

  generate(user: AuthUser): AuthToken {
    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const accessToken = jwt.sign(payload, this.secret, {
      algorithm: ALGORITHM,
      expiresIn: this.expiresIn as SignOptions["expiresIn"],
    });
    // expiresIn en segundos, calculado del propio token (exp - iat)
    const { exp = 0, iat = 0 } = jwt.decode(accessToken) as JwtPayload;
    return { accessToken, tokenType: "Bearer", expiresIn: exp - iat };
  }

  verify(token: string): AuthUser {
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, this.secret, { algorithms: [ALGORITHM] });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("La sesión expiró. Inicia sesión de nuevo");
      }
      throw new UnauthorizedError("Token inválido");
    }
    if (!this.isAuthUser(payload)) {
      throw new UnauthorizedError("Token inválido");
    }
    return { id: payload.id, nombre: payload.nombre, email: payload.email, rol: payload.rol };
  }

  // Un token bien firmado pero con otra forma (por ejemplo, de otra versión de la API) no se acepta
  private isAuthUser(payload: string | JwtPayload): payload is JwtPayload & AuthUser {
    return (
      typeof payload !== "string" &&
      Number.isInteger(payload["id"]) &&
      typeof payload["nombre"] === "string" &&
      typeof payload["email"] === "string" &&
      (payload["rol"] === "admin" || payload["rol"] === "user")
    );
  }
}
