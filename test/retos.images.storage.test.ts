import assert from "node:assert/strict";
import { it } from "node:test";
import { SupabaseImageService } from "../src/infrastructure/services/supabase-image.service.ts";
import { ImageStorageError } from "../src/application/errors/image-storage.error.ts";
import type { ImageStorage } from "../src/infrastructure/config/supabase.ts";

const path = "12345678-1234-4234-8234-123456789abc.png";
function storage() {
  const removed: string[] = [];
  const bucket: ImageStorage = {
    async upload(path) {
      return { data: { path }, error: null };
    },
    getPublicUrl() {
      throw new Error("SECRET");
    },
    async remove(paths) {
      removed.push(...paths);
      return { error: null };
    },
  };
  return { bucket, removed };
}
it("limpia subida confirmada si falla obtener URL", async () => {
  const { bucket, removed } = storage();
  const service = new SupabaseImageService(bucket);
  const content = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  await assert.rejects(service.upload({ originalName: "foto.png", content }), ImageStorageError);
  assert.equal(removed.length, 1);
});
it("elimina exclusivamente ruta UUID nueva", async () => {
  const { bucket, removed } = storage();
  await new SupabaseImageService(bucket).remove(path);
  assert.deepEqual(removed, [path]);
});
for (const invalid of ["../anterior.png", "https://example.test/foto.png", "anterior.png"])
  it("bloquea eliminación por ruta inválida " + invalid, async () => {
    const { bucket, removed } = storage();
    await assert.rejects(new SupabaseImageService(bucket).remove(invalid), ImageStorageError);
    assert.deepEqual(removed, []);
  });
it("oculta error del proveedor al eliminar", async () => {
  const { bucket } = storage();
  bucket.remove = async () => {
    throw new Error("SECRET");
  };
  await assert.rejects(
    new SupabaseImageService(bucket).remove(path),
    (error: unknown) => error instanceof ImageStorageError && !error.message.includes("SECRET"),
  );
});

it("repositorio guarda URL pública en imagen_url para create y update", async () => {
  process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/no-se-usa";
  const { RetosPgRepository } = await import(
    "../src/infrastructure/repository/retos.pg.repository.ts"
  );
  const publicUrl = "https://example.test/" + path;
  const calls: unknown[] = [];
  const row = {
    id: 5,
    nombre: "Agua",
    descripcion: "Beber",
    imagen_url: publicUrl,
    duracion_dias: 30,
    categoria_id: 2,
    creador_id: 7,
    es_oficial: false,
    status: "ACTIVE",
    created_at: new Date(),
    updated_at: new Date(),
  };
  const write = async (args: { data: { imagen_url: string } }) => {
    calls.push(args.data.imagen_url);
    return row;
  };
  const repository = new RetosPgRepository({
    create: write,
    update: write,
  } as unknown as ConstructorParameters<typeof RetosPgRepository>[0]);
  assert.equal(
    (
      await repository.create({
        nombre: "Agua",
        descripcion: "Beber",
        duracionDias: 30,
        categoriaId: 2,
        creadorId: 7,
        esOficial: false,
        imagenUrl: publicUrl,
      })
    ).imagenUrl,
    publicUrl,
  );
  assert.equal((await repository.update(5, { imagenUrl: publicUrl })).imagenUrl, publicUrl);
  assert.deepEqual(calls, [publicUrl, publicUrl]);
});
