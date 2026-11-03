import cors from "cors";
import express, { type Express } from "express";
import { getCorsOrigins } from "./infrastructure/config/env.ts";
import { errorHandler, notFoundHandler } from "./interface/middlewares/error.middleware.ts";
import apiRouter from "./interface/routers/index.ts";

/** Crea la aplicación de Express sin ponerla a escuchar (server.ts la arranca). */
export const createApp = (): Express => {
  const app = express();
  app.disable("x-powered-by");

  // Solo el frontend del equipo puede llamar a la API desde el navegador (CORS_ORIGINS en el .env)
  app.use(cors({ origin: getCorsOrigins() }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "API de Retos de hábitos en grupo" });
  });
  app.use("/api", apiRouter);

  // Siempre al final: primero la ruta que no existe (404) y luego el manejador de errores
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
