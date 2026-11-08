import type { Request, Response } from "express";
import type { RetosUseCase } from "../../application/retos/retos.use-case.ts";
import { parseId } from "../../application/validation/id.ts";
import { parsePagination } from "../../application/validation/pagination.ts";
import { optionalText } from "../../application/validation/query.ts";
import { requireUser } from "../middlewares/auth.middleware.ts";

export class RetosController {
  constructor(private readonly retosUseCase: RetosUseCase) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const reto = await this.retosUseCase.create(
      req.body,
      requireUser(req),
      req.file ? { content: req.file.buffer, originalName: req.file.originalname } : undefined,
    );
    res.status(201).json({ data: reto });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);
    const reto = await this.retosUseCase.update(
      id,
      req.body,
      requireUser(req),
      req.file ? { content: req.file.buffer, originalName: req.file.originalname } : undefined,
    );
    res.status(200).json({ data: reto });
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);
    await this.retosUseCase.deactivate(id, requireUser(req));
    res.status(204).end();
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = parsePagination(req.query);
    const q = optionalText(req.query["q"], "q");
    const categoriaId =
      req.query["categoriaId"] === undefined
        ? undefined
        : parseId(req.query["categoriaId"], "categoriaId");
    res.status(200).json(await this.retosUseCase.list({ page, limit, q, categoriaId }));
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);
    res.status(200).json({ data: await this.retosUseCase.findById(id) });
  };
}
