import { Router } from "express";
import { UsuariosController } from "../controllers/usuarios.controller.ts";
import { usuariosUseCase } from "../dependencies.ts";
import { authenticate, authorize } from "../middlewares/auth.middleware.ts";

const router = Router();
const controller = new UsuariosController(usuariosUseCase);

// Vista de administración: primero authenticate (401 sin token) y luego authorize (403 si no es admin)
router.use(authenticate, authorize("admin"));

router.get("/", controller.list);

export default router;
