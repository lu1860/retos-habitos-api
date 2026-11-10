import type { Request, Response } from "express";
import type { CategoriasUseCase } from "../../application/categorias/categorias.use-case.ts";
import { parseId } from "../../application/validation/id.ts";

export class CategoriasController {
  constructor(private readonly categoriasUseCase: CategoriasUseCase) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      data: await this.categoriasUseCase.listActive(),
    });
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);

    res.status(200).json({
      data: await this.categoriasUseCase.findById(id),
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const categoria = await this.categoriasUseCase.create(req.body);

    res.status(201).json({
      data: categoria,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);

    const categoria = await this.categoriasUseCase.update(id, req.body);

    res.status(200).json({
      data: categoria,
    });
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);

    await this.categoriasUseCase.deactivate(id);

    res.status(204).end();
  };
}