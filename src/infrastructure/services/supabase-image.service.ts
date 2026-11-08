import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { BadRequestError } from "../../application/errors/app.error.ts";
import { ImageStorageError } from "../../application/errors/image-storage.error.ts";
import type { IImageService, ImageFile, StoredImage } from "../../domain/services/IImageService.ts";
import { createSupabaseImageStorage, type ImageStorage } from "../config/supabase.ts";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FORMATS = {
  "image/jpeg": { extension: "jpg", allowed: [".jpg", ".jpeg"] },
  "image/png": { extension: "png", allowed: [".png"] },
  "image/webp": { extension: "webp", allowed: [".webp"] },
} as const;

export class SupabaseImageService implements IImageService {
  constructor(private readonly storage: ImageStorage = createSupabaseImageStorage()) {}

  async upload(file: ImageFile): Promise<StoredImage> {
    // Copia estable: ni el tamaño ni el contenido pueden cambiar durante la validación asíncrona.
    if (file.content.byteLength === 0) throw new BadRequestError("La imagen está vacía");
    if (file.content.byteLength > MAX_IMAGE_BYTES) {
      throw new BadRequestError("La imagen supera el límite de 2 MB");
    }
    const content = new Uint8Array(file.content);
    let detected;
    try {
      detected = await fileTypeFromBuffer(content);
    } catch {
      throw new BadRequestError("El contenido de la imagen no es válido");
    }
    if (!detected || !Object.hasOwn(FORMATS, detected.mime)) {
      throw new BadRequestError("Solo se permiten imágenes JPEG, PNG y WebP");
    }
    const format = FORMATS[detected.mime as keyof typeof FORMATS];
    const extension = extname(file.originalName).toLowerCase();
    if (!(format.allowed as readonly string[]).includes(extension)) {
      throw new BadRequestError("La extensión no corresponde al formato real de la imagen");
    }
    const path = `${randomUUID()}.${format.extension}`;
    try {
      const { data, error } = await this.storage.upload(path, content, {
        contentType: detected.mime,
        upsert: false,
      });
      if (error || !data || data.path !== path) throw new ImageStorageError();
      const { data: publicData } = this.storage.getPublicUrl(data.path);
      if (!publicData.publicUrl) throw new ImageStorageError();
      return { path: data.path, publicUrl: publicData.publicUrl };
    } catch {
      throw new ImageStorageError();
    }
  }
}
