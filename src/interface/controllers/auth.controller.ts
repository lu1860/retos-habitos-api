import type { Request, Response } from "express";
import type { AuthUseCase } from "../../application/auth/auth.use-case.ts";
import type { Credenciales, DatosRegistro } from "../../domain/models/Auth.ts";
import { requireUser } from "../middlewares/auth.middleware.ts";

/**
 * Controlador de autenticación. Solo traduce HTTP ↔ caso de uso:
 * el body ya llega validado (validateBody) y los errores los responde el middleware central.
 */
export class AuthController {
  private readonly authUseCase: AuthUseCase;

  constructor(authUseCase: AuthUseCase) {
    this.authUseCase = authUseCase;
  }

  // POST /api/auth/register → 201 { data: { user, token } }
  register = async (req: Request, res: Response): Promise<void> => {
    const data = await this.authUseCase.register(req.body as DatosRegistro);
    res.status(201).json({ data });
  };

  // POST /api/auth/login → 200 { data: { user, token } }
  login = async (req: Request, res: Response): Promise<void> => {
    const data = await this.authUseCase.login(req.body as Credenciales);
    res.status(200).json({ data });
  };

  // GET /api/auth/me → 200 { data: user }
  me = async (req: Request, res: Response): Promise<void> => {
    const data = await this.authUseCase.getProfile(requireUser(req).id);
    res.status(200).json({ data });
  };
}
