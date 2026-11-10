import { Router } from "express";

import { CategoriasController } from "../controllers/categorias.controller.ts";
import { categoriasUseCase } from "../dependencies.ts";

import { authenticate, authorize } from "../middlewares/auth.middleware.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";

import { CrearCategoriaDto } from "../../infrastructure/dtos/crear-categoria.dto.ts";
import { ActualizarCategoriaDto } from "../../infrastructure/dtos/actualizar-categoria.dto.ts";

const router = Router();
const controller = new CategoriasController(categoriasUseCase);

// Consultar categorías: cualquier usuario autenticado
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.detail);

// Crear categoría: solamente administrador
router.post(
  "/",
  authenticate,
  authorize("admin"),
  validateBody(CrearCategoriaDto),
  controller.create,
);

// Actualizar categoría: solamente administrador
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  validateBody(ActualizarCategoriaDto),
  controller.update,
);

// Eliminar categoría (eliminación lógica): solamente administrador
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  controller.deactivate,
);

export default router;