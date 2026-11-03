import { Router } from "express";
import { LoginDto } from "../../infrastructure/dtos/login.dto.ts";
import { RegisterDto } from "../../infrastructure/dtos/register.dto.ts";
import { AuthController } from "../controllers/auth.controller.ts";
import { authUseCase } from "../dependencies.ts";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { validateBody } from "../middlewares/validate.middleware.ts";

const router = Router();
const controller = new AuthController(authUseCase);

// Públicas
router.post("/register", validateBody(RegisterDto), controller.register);
router.post("/login", validateBody(LoginDto), controller.login);

// Protegida: sin token o con token inválido/vencido → 401
router.get("/me", authenticate, controller.me);

export default router;
