import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/** Superficie mínima del bucket para poder sustituirlo en las pruebas. */
export interface ImageStorage {
  upload(
    path: string,
    content: Uint8Array,
    options: { contentType: string; upsert: false },
  ): Promise<{ data: { path: string } | null; error: unknown }>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

/** Inicialización diferida: importar el módulo no crea clientes ni realiza peticiones. */
export function createSupabaseImageStorage(): ImageStorage {
  const url = process.env["SUPABASE_URL"]?.trim();
  const key = process.env["SUPABASE_SECRET_KEY"]?.trim();
  const bucket = process.env["SUPABASE_STORAGE_BUCKET"]?.trim();
  if (!url || !key || !bucket) {
    throw new Error("Falta configurar SUPABASE_URL, SUPABASE_SECRET_KEY o SUPABASE_STORAGE_BUCKET");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL debe ser una URL HTTPS válida");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("SUPABASE_URL debe ser una URL HTTPS válida sin credenciales ni parámetros");
  }
  if (bucket !== "retos") {
    throw new Error("SUPABASE_STORAGE_BUCKET debe ser retos");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client.storage.from(bucket);
}
