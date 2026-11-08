import { AppError } from "./app.error.ts";

/** Error controlado, sin detalles del proveedor ni credenciales. */
export class ImageStorageError extends AppError {
  constructor() {
    super("No se pudo almacenar la imagen. Intenta de nuevo más tarde");
  }
}
