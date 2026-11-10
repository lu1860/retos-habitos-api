import { Router } from "express";

import { RegistrosController } from "../controllers/registros.controller.ts";
import { registrosUseCase } from "../dependencies.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { ActualizarRegistroDto } from "../../infrastructure/dtos/actualizar-registro.dto.ts";

const router = Router();
const controller = new RegistrosController(registrosUseCase);

router.put(
  "/:id",
  authenticate,
  validateBody(ActualizarRegistroDto),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  controller.deactivate,
);

export default router;