import type { Request, Response } from "express";
import type { CategoriasUseCase } from "../../application/categorias/categorias.use-case.ts";

export class CategoriasController {
  constructor(private readonly categoriasUseCase: CategoriasUseCase) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({ data: await this.categoriasUseCase.listActive() });
  };
}
