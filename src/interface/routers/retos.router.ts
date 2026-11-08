import { Router } from "express";
import { RetosController } from "../controllers/retos.controller.ts";
import { retosUseCase } from "../dependencies.ts";

const router = Router();
const controller = new RetosController(retosUseCase);

router.get("/", controller.list);
router.get("/:id", controller.detail);

export default router;
