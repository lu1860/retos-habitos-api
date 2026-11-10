import type { Request, Response } from "express";

import type { RegistrosUseCase } from "../../application/registros/registros.use-case.ts";
import { parseId } from "../../application/validation/id.ts";
import { requireUser } from "../middlewares/auth.middleware.ts";

export class RegistrosController {
  constructor(private readonly registrosUseCase: RegistrosUseCase) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const retoId = parseId(req.params["retoId"], "retoId");
    const usuario = requireUser(req);

    const registro = await this.registrosUseCase.create(
      usuario.id,
      retoId,
      req.body.nota,
    );

    res.status(201).json({ data: registro });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const retoId = parseId(req.params["retoId"], "retoId");
    const usuario = requireUser(req);

    const registros = await this.registrosUseCase.list(
      usuario.id,
      retoId,
    );

    res.status(200).json({ data: registros });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);
    const usuario = requireUser(req);

    const registro = await this.registrosUseCase.update(
      id,
      usuario.id,
      req.body,
    );

    res.status(200).json({ data: registro });
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params["id"]);
    const usuario = requireUser(req);

    await this.registrosUseCase.deactivate(id, usuario.id);

    res.status(204).end();
  };

  progress = async (req: Request, res: Response): Promise<void> => {
    const retoId = parseId(req.params["id"]);
    const usuario = requireUser(req);

    const progreso = await this.registrosUseCase.progress(
      usuario.id,
      retoId,
    );

    res.status(200).json({ data: progreso });
  };
}