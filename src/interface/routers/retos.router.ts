import { Router } from "express";
import { RetosController } from "../controllers/retos.controller.ts";
import {
  retosUseCase,
  participacionesUseCase,
  consultarParticipacionUseCase,
} from "../dependencies.ts";
import { ParticipacionesController } from "../controllers/participaciones.controller.ts";
import { CrearRetoDto } from "../../infrastructure/dtos/crear-reto.dto.ts";
import { retosImage, validateRetoUpdate } from "../middlewares/retos-image.middleware.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";

const router = Router();
const controller = new RetosController(retosUseCase);
const participaciones = new ParticipacionesController(
  participacionesUseCase,
  consultarParticipacionUseCase,
);

router.get("/:id/participacion", authenticate, participaciones.consultar);

router.post("/:id/participantes", authenticate, participaciones.join);
router.delete("/:id/participantes", authenticate, participaciones.leave);

router.post("/", authenticate, retosImage, validateBody(CrearRetoDto), controller.create);
router.patch("/:id", authenticate, retosImage, validateRetoUpdate, controller.update);
router.delete("/:id", authenticate, controller.deactivate);

router.get("/", controller.list);
router.get("/:id", controller.detail);

export default router;
