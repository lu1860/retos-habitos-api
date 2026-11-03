import { Router } from "express";
import { health } from "../controllers/health.controller.ts";
import authRouter from "./auth.router.ts";
import usuariosRouter from "./usuarios.router.ts";

/**
 * Todas las rutas de la API, montadas bajo /api en app.ts.
 * Para un módulo nuevo: crear su router y agregar una línea aquí, por ejemplo
 *   router.use("/retos", retosRouter);
 */
const router = Router();

router.get("/health", health);
router.use("/auth", authRouter);
router.use("/usuarios", usuariosRouter);

export default router;
