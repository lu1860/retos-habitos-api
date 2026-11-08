import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestError } from "../src/application/errors/app.error.ts";
import { ImageStorageError } from "../src/application/errors/image-storage.error.ts";
import type { ImageStorage } from "../src/infrastructure/config/supabase.ts";
import {
  MAX_IMAGE_BYTES,
  SupabaseImageService,
} from "../src/infrastructure/services/supabase-image.service.ts";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
const jpg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAAv/2Q==",
  "base64",
);
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");

class FakeStorage implements ImageStorage {
  uploads: {
    path: string;
    content: Uint8Array;
    options: { contentType: string; upsert: false };
  }[] = [];
  urls: string[] = [];
  failure: "response" | "throw" | "null" | "path" | "url" | undefined;

  async upload(path: string, content: Uint8Array, options: { contentType: string; upsert: false }) {
    this.uploads.push({ path, content, options });
    if (this.failure === "throw") throw new Error("SECRET internal provider details");
    if (this.failure === "response") return { data: null, error: { message: "SECRET" } };
    if (this.failure === "null") return { data: null, error: null };
    return { data: { path: this.failure === "path" ? "unexpected" : path }, error: null };
  }

  getPublicUrl(path: string) {
    this.urls.push(path);
    if (this.failure === "url") throw new Error("SECRET URL failure");
    assert.equal(this.uploads.at(-1)?.path, path);
    return { data: { publicUrl: `https://example.test/storage/v1/object/public/retos/${path}` } };
  }
}

describe("SupabaseImageService", () => {
  for (const [originalName, content, mime, extension] of [
    ["foto.jpg", jpg, "image/jpeg", "jpg"],
    ["foto.jpeg", jpg, "image/jpeg", "jpg"],
    ["foto.PNG", png, "image/png", "png"],
    ["foto.webp", webp, "image/webp", "webp"],
  ] as const) {
    it(`acepta ${originalName}, usa MIME real, UUID y upsert false`, async () => {
      const storage = new FakeStorage();
      const result = await new SupabaseImageService(storage).upload({ originalName, content });
      assert.match(
        result.path,
        new RegExp(
          `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension}$`,
        ),
      );
      assert.equal(
        result.publicUrl,
        `https://example.test/storage/v1/object/public/retos/${result.path}`,
      );
      assert.deepEqual(storage.uploads[0]?.options, { contentType: mime, upsert: false });
      assert.deepEqual(storage.uploads[0]?.content, new Uint8Array(content));
    });
  }

  for (const [label, originalName, content] of [
    ["vacío", "foto.png", Buffer.alloc(0)],
    ["texto disfrazado", "foto.jpg", Buffer.from("no soy una imagen")],
    [
      "GIF no permitido",
      "foto.gif",
      Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
    ],
    ["extensión de otro formato", "foto.jpg", png],
    ["extensión no permitida", "foto.svg", png],
    ["sin extensión", "foto", png],
    ["doble extensión final incorrecta", "foto.png.exe", png],
    ["contenido truncado", "foto.png", png.subarray(0, 10)],
    [
      "mayor de 2 MB",
      "foto.png",
      Buffer.concat([png, Buffer.alloc(MAX_IMAGE_BYTES + 1 - png.length)]),
    ],
  ] as const) {
    it(`rechaza ${label} sin llamar al almacenamiento`, async () => {
      const storage = new FakeStorage();
      await assert.rejects(
        new SupabaseImageService(storage).upload({ originalName, content }),
        BadRequestError,
      );
      assert.equal(storage.uploads.length, 0);
      assert.equal(storage.urls.length, 0);
    });
  }

  it("acepta exactamente 2 * 1024 * 1024 bytes reales", async () => {
    const storage = new FakeStorage();
    const content = Buffer.concat([jpg, Buffer.alloc(MAX_IMAGE_BYTES - jpg.length)]);
    await new SupabaseImageService(storage).upload({ originalName: "limite.jpg", content });
    assert.equal(storage.uploads[0]?.content.byteLength, MAX_IMAGE_BYTES);
  });

  it("genera rutas distintas sin usar rutas ni nombres del usuario", async () => {
    const storage = new FakeStorage();
    const service = new SupabaseImageService(storage);
    const file = { originalName: "../../nombre-privado.png", content: png };
    const first = await service.upload(file);
    const second = await service.upload(file);
    assert.notEqual(first.path, second.path);
    assert.ok(!first.path.includes("nombre-privado"));
    assert.ok(!first.path.includes("/"));
  });

  for (const failure of ["response", "throw", "null", "path", "url"] as const) {
    it(`controla fallo ${failure} sin devolver URL ni detalles internos`, async () => {
      const storage = new FakeStorage();
      storage.failure = failure;
      await assert.rejects(
        new SupabaseImageService(storage).upload({ originalName: "foto.png", content: png }),
        (error: unknown) => {
          assert.ok(error instanceof ImageStorageError);
          assert.ok(!error.message.includes("SECRET"));
          assert.equal(error.cause, undefined);
          assert.ok(!("publicUrl" in error));
          return true;
        },
      );
      assert.equal(storage.urls.length, failure === "url" ? 1 : 0);
    });
  }
});
