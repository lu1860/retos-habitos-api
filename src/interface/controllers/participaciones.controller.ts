import type { Request, Response } from "express";
import type { ParticipacionesUseCase } from "../../application/participaciones/participaciones.use-case.ts";
import { BadRequestError } from "../../application/errors/app.error.ts";
import { parseId } from "../../application/validation/id.ts";
import { requireUser } from "../middlewares/auth.middleware.ts";

const retoId = (req: Request): number => {
  const id = parseId(req.params["id"]);
  if (id > 2147483647)
    throw new BadRequestError("id fuera del rango Int de PostgreSQL", {
      id: "Debe ser menor o igual a 2147483647",
    });
  return id;
};

export class ParticipacionesController {
  constructor(private readonly useCase: ParticipacionesUseCase) {}

  join = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCase.join(requireUser(req).id, retoId(req));
    res.status(result.created ? 201 : 200).json({ data: result.participacion });
  };

  leave = async (req: Request, res: Response): Promise<void> => {
    await this.useCase.leave(requireUser(req).id, retoId(req));
    res.status(204).end();
  };
}
