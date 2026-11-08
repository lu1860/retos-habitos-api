import assert from "node:assert/strict";
import { before, after, beforeEach, it, mock } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { ActualizarReto, NuevoReto, Reto } from "../src/domain/models/Reto.ts";
import type { ImageStorage } from "../src/infrastructure/config/supabase.ts";
import { SupabaseImageService } from "../src/infrastructure/services/supabase-image.service.ts";
import { Prisma } from "../src/generated/prisma/client.ts";

process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);
const jpg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCfAAv/2Q==",
  "base64",
);
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
let uploads = 0,
  writes = 0;
let removed: string[] = [];
let failure: unknown;
let storageFailure = false,
  cleanupFailure = false;
let row: Reto;
let server: Server, url: string;
let sign: (id?: number, rol?: "user" | "admin") => string;
const storage: ImageStorage = {
  async upload(path) {
    uploads++;
    if (storageFailure) throw new Error("SECRET proveedor");
    return { data: { path }, error: null };
  },
  getPublicUrl(path) {
    return { data: { publicUrl: "https://example.test/" + path } };
  },
  async remove(paths) {
    removed.push(...paths);
    return { error: cleanupFailure ? new Error("SECRET limpieza") : null };
  },
};
before(async () => {
  const { UsuariosPgRepository } = await import(
    "../src/infrastructure/repository/usuarios.pg.repository.ts"
  );
  mock.method(UsuariosPgRepository.prototype, "findActiveById", async (id: number) => ({
    id,
    nombre: "Ana",
    email: "ana@example.test",
    passwordHash: "no-se-usa",
    rol: id === 8 ? "admin" : "user",
    status: "ACTIVE",
    createdAt: new Date(),
  }));
  const { RetosPgRepository } = await import(
    "../src/infrastructure/repository/retos.pg.repository.ts"
  );
  const { CategoriasPgRepository } = await import(
    "../src/infrastructure/repository/categorias.pg.repository.ts"
  );
  mock.method(CategoriasPgRepository.prototype, "findActiveById", async (id: number) =>
    id === 2 ? { id } : null,
  );
  mock.method(RetosPgRepository.prototype, "findActiveById", async (id: number) =>
    id === 5 && row.status === "ACTIVE" ? { ...row } : null,
  );
  mock.method(RetosPgRepository.prototype, "create", async (data: NuevoReto) => {
    writes++;
    if (failure) throw failure;
    return { ...row, ...data, imagenUrl: data.imagenUrl ?? null };
  });
  mock.method(RetosPgRepository.prototype, "update", async (_id: number, data: ActualizarReto) => {
    writes++;
    if (failure) throw failure;
    for (const [key, value] of Object.entries(data))
      if (value !== undefined) Object.assign(row, { [key]: value });
    return { ...row };
  });
  const service = new SupabaseImageService(storage);
  mock.method(SupabaseImageService.prototype, "upload", service.upload.bind(service));
  mock.method(SupabaseImageService.prototype, "remove", service.remove.bind(service));
  const { retosUseCase, tokenService } = await import("../src/interface/dependencies.ts");
  // Sustituir también la fábrica diferida: las pruebas nunca crean un cliente real.
  Object.assign(retosUseCase, { images: service });
  sign = (id = 7, rol = "user") =>
    tokenService.generate({ id, rol, nombre: "Ana", email: "ana@example.test" }).accessToken;
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/retos";
});
beforeEach(() => {
  uploads = writes = 0;
  removed = [];
  failure = undefined;
  storageFailure = cleanupFailure = false;
  row = {
    id: 5,
    nombre: "Agua",
    descripcion: "Beber agua",
    duracionDias: 30,
    categoriaId: 2,
    creadorId: 7,
    esOficial: false,
    status: "ACTIVE",
    imagenUrl: "https://example.test/anterior.png",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  mock.restoreAll();
});
function form(create = false, bytes: Uint8Array = png, name = "foto.png", field = "imagen") {
  const body = new FormData();
  if (create)
    for (const [key, value] of Object.entries({
      nombre: "Agua",
      descripcion: "Beber agua",
      duracionDias: "30",
      categoriaId: "2",
    }))
      body.set(key, value);
  body.set(field, new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }), name);
  return body;
}
async function send(
  body: FormData | string,
  method = "PATCH",
  token: string | null = sign(),
  headers: Record<string, string> = {},
) {
  const response = await fetch(url + (method === "PATCH" ? "/5" : ""), {
    method,
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...headers },
    body,
  });
  const result = await response.json();
  assert.ok(!JSON.stringify(result).includes("SECRET"));
  return { status: response.status, body: result };
}
for (const [name, bytes] of [
  ["foto.jpg", jpg],
  ["foto.png", png],
  ["foto.webp", webp],
] as const) {
  it("POST guarda URL para " + name, async () => {
    const result = await send(form(true, bytes, name), "POST");
    assert.equal(result.status, 201);
    assert.ok(result.body.data.imagenUrl.startsWith("https://example.test/"));
    assert.equal(uploads, 1);
    assert.equal(writes, 1);
  });
}
it("POST JSON conserva compatibilidad y protege campos", async () => {
  const result = await send(
    JSON.stringify({
      nombre: "Agua",
      descripcion: "Beber agua",
      duracionDias: 30,
      categoriaId: 2,
      imagen_url: "manual",
      imagenUrl: "manual",
      creadorId: 99,
      esOficial: true,
      status: "INACTIVE",
    }),
    "POST",
    sign(),
    { "Content-Type": "application/json" },
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.data.imagenUrl, null);
  assert.equal(result.body.data.creadorId, 7);
  assert.equal(result.body.data.esOficial, false);
  assert.equal(uploads, 0);
});
for (const combined of [false, true])
  it("PATCH imagen con otros campos: " + combined, async () => {
    const body = form();
    if (combined) {
      body.set("nombre", "Nuevo");
      body.set("duracionDias", "10");
    }
    const result = await send(body);
    assert.equal(result.status, 200);
    assert.notEqual(row.imagenUrl, "https://example.test/anterior.png");
    if (combined) {
      assert.equal(row.nombre, "Nuevo");
      assert.equal(row.duracionDias, 10);
    }
    assert.deepEqual(removed, []);
  });
for (const [name, bytes] of [
  ["foto.png", Buffer.from("texto")],
  ["foto.jpg", png],
  ["foto.png", Buffer.alloc(2 * 1024 * 1024 + 1)],
  ["foto.png", Buffer.alloc(0)],
] as const)
  it("rechaza archivo " + name + " bytes " + bytes.length, async () => {
    assert.equal((await send(form(false, bytes, name))).status, 400);
    assert.equal(uploads, 0);
    assert.equal(writes, 0);
  });
it("rechaza campo de archivo inesperado", async () => {
  assert.equal((await send(form(false, png, "foto.png", "otro"))).status, 400);
  assert.equal(uploads, 0);
});
it("rechaza multipart malformado", async () => {
  assert.equal(
    (
      await send("incorrecto", "PATCH", sign(), {
        "Content-Type": "multipart/form-data; boundary=abc",
      })
    ).status,
    400,
  );
});
it("401 sin JWT antes de procesar imagen", async () => {
  assert.equal((await send(form(), "PATCH", null)).status, 401);
  assert.equal(uploads, 0);
});
it("403 ajeno sin subida", async () => {
  assert.equal((await send(form(), "PATCH", sign(9))).status, 403);
  assert.equal(uploads, 0);
});
it("permite administrador ajeno", async () => {
  assert.equal((await send(form(), "PATCH", sign(8, "admin"))).status, 200);
});
it("404 inactivo sin subida", async () => {
  row.status = "INACTIVE";
  assert.equal((await send(form())).status, 404);
  assert.equal(uploads, 0);
});
for (const method of ["POST", "PATCH"])
  it("categoría inválida antes de subir " + method, async () => {
    const body = form(method === "POST");
    body.set("categoriaId", "999");
    assert.equal((await send(body, method)).status, 404);
    assert.equal(uploads, 0);
  });
for (const value of ["2.0", " 2", "2e0", "0", "-1", "2147483648", "9007199254740993"])
  it("entero multipart estricto " + value, async () => {
    const body = form();
    body.set("categoriaId", value);
    assert.equal((await send(body)).status, 400);
    assert.equal(uploads, 0);
  });
for (const field of ["imagenUrl", "imagen_url", "creadorId", "esOficial", "status"])
  it("PATCH bloquea " + field, async () => {
    const body = form();
    body.set(field, "manual");
    assert.equal((await send(body)).status, 400);
    assert.equal(uploads, 0);
  });
it("fallo Supabase no persiste ni filtra detalles", async () => {
  storageFailure = true;
  assert.equal((await send(form())).status, 500);
  assert.equal(writes, 0);
});
for (const method of ["POST", "PATCH"])
  it("compensa rechazo confirmado " + method, async () => {
    failure = new Prisma.PrismaClientKnownRequestError("SECRET", {
      code: "P2003",
      clientVersion: "test",
    });
    assert.equal((await send(form(method === "POST"), method)).status, 400);
    assert.equal(removed.length, 1);
    assert.ok(!removed.includes("anterior.png"));
  });
it("conserva subida si persistencia es incierta", async () => {
  failure = new Prisma.PrismaClientKnownRequestError("SECRET", {
    code: "P1001",
    clientVersion: "test",
  });
  assert.equal((await send(form())).status, 503);
  assert.equal(removed.length, 0);
});
it("fallo de limpieza conserva error original", async () => {
  cleanupFailure = true;
  failure = new Prisma.PrismaClientKnownRequestError("SECRET", {
    code: "P2003",
    clientVersion: "test",
  });
  assert.equal((await send(form())).status, 400);
  assert.equal(removed.length, 1);
});

it("acepta exactamente 2 MiB en multipart", async () => {
  const content = Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024 - png.length)]);
  assert.equal((await send(form(false, content))).status, 200);
  assert.equal(uploads, 1);
});
it("rechaza dos archivos sin subir", async () => {
  const body = form();
  body.append("imagen", new Blob([png]), "otra.png");
  assert.equal((await send(body)).status, 400);
  assert.equal(uploads, 0);
});
it("POST multipart sin archivo conserva campos", async () => {
  const body = form(true);
  body.delete("imagen");
  const result = await send(body, "POST");
  assert.equal(result.status, 201);
  assert.equal(result.body.data.imagenUrl, null);
  assert.equal(uploads, 0);
});
it("POST sin JWT no sube", async () => {
  assert.equal((await send(form(true), "POST", null)).status, 401);
  assert.equal(uploads, 0);
});
it("rechaza números multipart repetidos", async () => {
  const body = form();
  body.append("categoriaId", "2");
  body.append("categoriaId", "2");
  assert.equal((await send(body)).status, 400);
  assert.equal(uploads, 0);
});
