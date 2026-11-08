/** Ejecutar únicamente tras autorización: node --import tsx test/manual/supabase-image-upload.ts --allow-write */
import "dotenv/config";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseImageStorage } from "../../src/infrastructure/config/supabase.ts";
import { SupabaseImageService } from "../../src/infrastructure/services/supabase-image.service.ts";

async function main() {
  if (!process.argv.includes("--allow-write")) {
    throw new Error("Se requiere autorización explícita antes de ejecutar con --allow-write");
  }
  const storage = createSupabaseImageStorage();
  const cleanup = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).storage.from("retos");
  const content = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  let attemptedPath: string | undefined;
  const removeTestImage = async (path: string) => {
    const { error } = await cleanup.remove([path]);
    if (error) throw new Error("No se pudo confirmar la limpieza del archivo de prueba");
    const { data, error: listError } = await cleanup.list("", { search: path });
    if (listError || !data || data.some((file) => file.name === path)) {
      throw new Error("No se pudo verificar la eliminación del archivo de prueba");
    }
    console.info("Archivo de prueba eliminado; ausencia verificada en Storage");
  };
  try {
    const service = new SupabaseImageService({
      upload: (path, bytes, options) => {
        attemptedPath = path;
        return storage.upload(path, bytes, options);
      },
      getPublicUrl: (path) => storage.getPublicUrl(path),
    });
    const result = await service.upload({ originalName: "prueba.png", content });
    // Sin Authorization: comprueba que el objeto sea públicamente accesible.
    const response = await fetch(result.publicUrl, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type")?.split(";")[0], "image/png");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), content);
    console.info("Subida y acceso público verificados");
  } finally {
    if (attemptedPath) {
      try {
        await removeTestImage(attemptedPath);
      } catch {
        console.error(`No se confirmó la limpieza del objeto de prueba: ${attemptedPath}`);
        process.exitCode = 1;
      }
    }
  }
}

main().catch(() => {
  console.error("La prueba real o su limpieza falló. Revisar el bucket antes de repetirla");
  process.exitCode = 1;
});
