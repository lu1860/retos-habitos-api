import type { Request, Response } from "express";
import { isDatabaseReachable } from "../../infrastructure/repository/health.pg.repository.ts";

// GET /api/health → 200 si la API y la base de datos responden; 503 si la base no responde.
// Sirve para comprobar el despliegue en Render y la conexión con la base de datos.
export const health = async (_req: Request, res: Response): Promise<void> => {
  const database = await isDatabaseReachable();
  res
    .status(database ? 200 : 503)
    .json({ status: database ? "ok" : "error", database: database ? "ok" : "unreachable" });
};
