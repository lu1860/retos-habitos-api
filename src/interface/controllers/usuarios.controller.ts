import type { Request, Response } from "express";
import type { UsuariosUseCase } from "../../application/usuarios/usuarios.use-case.ts";
import { parsePagination } from "../../application/validation/pagination.ts";
import { optionalEnum, optionalText } from "../../application/validation/query.ts";

/** Ejemplo de listado paginado con filtros: el mismo patrón sirve para retos y categorías. */
export class UsuariosController {
  private readonly usuariosUseCase: UsuariosUseCase;

  constructor(usuariosUseCase: UsuariosUseCase) {
    this.usuariosUseCase = usuariosUseCase;
  }

  // GET /api/usuarios?page=1&limit=10&q=ana&rol=user → 200 { data, pagination }
  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = parsePagination(req.query);
    const q = optionalText(req.query["q"], "q");
    const rol = optionalEnum(req.query["rol"], "rol", ["admin", "user"] as const);
    res.status(200).json(await this.usuariosUseCase.list({ page, limit, q, rol }));
  };
}
