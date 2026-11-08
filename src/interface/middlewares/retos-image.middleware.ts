import multer from "multer";
import type { RequestHandler } from "express";
import { BadRequestError } from "../../application/errors/app.error.ts";
import { MAX_IMAGE_BYTES } from "../../infrastructure/services/supabase-image.service.ts";
import { ActualizarRetoDto } from "../../infrastructure/dtos/actualizar-reto.dto.ts";
import { validateBody } from "./validate.middleware.ts";

const parse = multer({
  storage: multer.memoryStorage(),
  // Busboy dispara el límite al alcanzarlo: un byte extra permite aceptar exactamente 2 MiB.
  limits: { fileSize: MAX_IMAGE_BYTES + 1, files: 1, fields: 12, parts: 13, fieldSize: 4096 },
}).single("imagen");

/** Multipart exclusivo de retos; nunca sube archivos al almacenamiento remoto. */
export const retosImage: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  parse(req, res, (error: unknown) => {
    if (error)
      return next(new BadRequestError("Imagen o formulario multipart inválido (máximo 2 MiB)"));
    if (req.file && req.file.size > MAX_IMAGE_BYTES) {
      return next(new BadRequestError("La imagen supera el límite de 2 MiB"));
    }
    for (const field of ["duracionDias", "categoriaId"]) {
      const value: unknown = req.body?.[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        return next(
          new BadRequestError("Los datos enviados no son válidos", {
            [field]: "Debe ser un entero positivo",
          }),
        );
      }
      req.body[field] = Number(value);
    }
    next();
  });
};

/** Un archivo permite PATCH vacío; el resto mantiene la validación existente. */
export const validateRetoUpdate: RequestHandler = (req, res, next) => {
  if (req.file && req.body && Object.keys(req.body).length === 0) return next();
  return validateBody(ActualizarRetoDto)(req, res, next);
};
