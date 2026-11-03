import { Router } from "express";
import { health } from "../controllers/health.controller.ts";

/**
 * Todas las rutas de la API, montadas bajo /api en app.ts.
 * Para un módulo nuevo: crear su router y agregar una línea aquí, por ejemplo
 *   router.use("/retos", retosRouter);
 */
const router = Router();

router.get("/health", health);

export default router;
