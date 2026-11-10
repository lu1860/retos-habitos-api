import { Router } from "express";
import { RetosController } from "../controllers/retos.controller.ts";
import {
  retosUseCase,
  participacionesUseCase,
  consultarParticipacionUseCase,
  registrosUseCase,
} from "../dependencies.ts";
import { ParticipacionesController } from "../controllers/participaciones.controller.ts";
import { CrearRetoDto } from "../../infrastructure/dtos/crear-reto.dto.ts";
import { retosImage, validateRetoUpdate } from "../middlewares/retos-image.middleware.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";
import { RegistrosController } from "../controllers/registros.controller.ts";
import { CrearRegistroDto } from "../../infrastructure/dtos/crear-registro.dto.ts";



const router = Router();
const controller = new RetosController(retosUseCase);
const participaciones = new ParticipacionesController(
  participacionesUseCase,
  consultarParticipacionUseCase,
);
const registros = new RegistrosController(registrosUseCase);

// Registros diarios del usuario
router.post(
  "/:retoId/registros",
  authenticate,
  validateBody(CrearRegistroDto),
  registros.create,
);

router.get(
  "/:retoId/registros",
  authenticate,
  registros.list,
);

// Progreso del usuario en el reto
router.get(
  "/:id/progreso",
  authenticate,
  registros.progress,
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
