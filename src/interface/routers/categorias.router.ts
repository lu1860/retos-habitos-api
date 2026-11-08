import { Router } from "express";
import { CategoriasController } from "../controllers/categorias.controller.ts";
import { categoriasUseCase } from "../dependencies.ts";

const router = Router();
const controller = new CategoriasController(categoriasUseCase);

// Consulta pública de solo lectura. La gestión administrativa queda fuera de este contrato.
router.get("/", controller.list);

export default router;
