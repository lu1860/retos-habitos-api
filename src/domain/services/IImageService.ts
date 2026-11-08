export interface ImageFile {
  /** Bytes reales del archivo; el MIME declarado por el cliente no se utiliza. */
  content: Uint8Array;
  originalName: string;
}

export interface StoredImage {
  path: string;
  publicUrl: string;
}

export interface IImageService {
  /** Valida y sube una imagen. Solo devuelve una URL tras confirmar la subida. */
  upload(file: ImageFile): Promise<StoredImage>;
  /** Elimina exclusivamente una subida nueva identificada por su ruta interna. */
  remove(path: string): Promise<void>;
}
