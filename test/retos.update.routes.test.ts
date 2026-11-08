import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, it, mock } from "node:test";
import type { ActualizarReto, Reto } from "../src/domain/models/Reto.ts";

process.env["DATABASE_URL"] = "postgresql://usuario:clave@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
let server: Server;
let url: string;
let sign: (id: number, rol?: "user" | "admin") => string;
let row: Reto;
let writes = 0;
let categoryQueries = 0;

before(async () => {
  const { RetosPgRepository } = await import(
    "../src/infrastructure/repository/retos.pg.repository.ts"
  );
  const { CategoriasPgRepository } = await import(
    "../src/infrastructure/repository/categorias.pg.repository.ts"
  );
  mock.method(RetosPgRepository.prototype, "findActiveById", async (id: number) =>
    id === row.id && row.status === "ACTIVE" ? { ...row } : null,
  );
  mock.method(RetosPgRepository.prototype, "update", async (id: number, data: ActualizarReto) => {
    assert.equal(id, row.id);
    writes++;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) Object.assign(row, { [key]: value });
    }
    return { ...row };
  });
  mock.method(CategoriasPgRepository.prototype, "findActiveById", async (id: number) => {
    categoryQueries++;
    return id === 2 || id === 4 ? { id } : null;
  });
  const { tokenService } = await import("../src/interface/dependencies.ts");
  sign = (id, rol = "user") =>
    tokenService.generate({ id, rol, nombre: "Ana", email: "ana@example.test" }).accessToken;
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/retos`;
});
beforeEach(() => {
  writes = 0;
  categoryQueries = 0;
  row = {
    id: 5,
    nombre: "Agua",
    descripcion: "Beber agua",
    imagenUrl: null,
    duracionDias: 30,
    categoriaId: 2,
    creadorId: 7,
    esOficial: false,
    status: "ACTIVE",
    createdAt: new Date("2026-11-07"),
    updatedAt: new Date("2026-11-07"),
  };
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  mock.restoreAll();
});
const patch = async (body: unknown, id = "5", token: string | null = sign(7)) => {
  const response = await fetch(`${url}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

for (const admin of [false, true]) {
  it(`permite editar como ${admin ? "administrador ajeno" : "creador"} y conserva campos omitidos`, async () => {
    const previous = structuredClone(row);
    const result = await patch(
      { nombre: " Leer " },
      "5",
      sign(admin ? 8 : 7, admin ? "admin" : "user"),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(row, { ...previous, nombre: "Leer" });
    assert.equal(categoryQueries, 0);
    assert.equal(writes, 1);
    assert.deepEqual(Object.keys(result.body), ["data"]);
    const detail = await fetch(`${url}/5`);
    assert.equal(detail.status, 200);
    assert.deepEqual(await detail.json(), result.body);
  });
}
it("actualiza todos los campos permitidos y acepta sus límites", async () => {
  const data = {
    nombre: "a".repeat(120),
    descripcion: "a".repeat(1000),
    duracionDias: 2147483647,
    categoriaId: 4,
  };
  const result = await patch(data);
  assert.equal(result.status, 200);
  for (const [key, value] of Object.entries(data)) assert.equal(result.body.data[key], value);
});
it("conserva la oficialidad de un reto oficial", async () => {
  row.esOficial = true;
  assert.equal((await patch({ descripcion: "Nueva" }, "5", sign(8, "admin"))).status, 200);
  assert.equal(row.esOficial, true);
  assert.equal(row.creadorId, 7);
});
it("rechaza otro usuario sin modificar datos ni consultar la categoría", async () => {
  const previous = structuredClone(row);
  assert.equal((await patch({ nombre: "Cambio", categoriaId: 4 }, "5", sign(9))).status, 403);
  assert.deepEqual(row, previous);
  assert.equal(writes, 0);
  assert.equal(categoryQueries, 0);
});
for (const token of [null, "invalido"]) {
  it(`requiere JWT válido: ${token}`, async () => {
    assert.equal((await patch({ nombre: "Cambio" }, "5", token)).status, 401);
    assert.equal(writes, 0);
  });
}
for (const id of ["abc", "0", "-1", "1.5", "9007199254740992"]) {
  it(`rechaza ID inválido ${id}`, async () => {
    assert.equal((await patch({ nombre: "Cambio" }, id)).status, 400);
    assert.equal(writes, 0);
  });
}
for (const body of [{}, null, [], "texto"]) {
  it(`rechaza body inválido ${JSON.stringify(body)}`, async () => {
    assert.equal((await patch(body)).status, 400);
    assert.equal(writes, 0);
  });
}
for (const field of ["nombre", "descripcion", "duracionDias", "categoriaId"]) {
  const values =
    field === "nombre" || field === "descripcion"
      ? [null, "", "   ", 5, {}, "a".repeat(field === "nombre" ? 121 : 1001)]
      : [null, 0, -1, 1.5, "2", true, 2147483648, 9007199254740992];
  for (const [index, value] of values.entries()) {
    it(`rechaza ${field} inválido ${index} sin modificar`, async () => {
      const previous = structuredClone(row);
      const result = await patch({ [field]: value });
      assert.equal(result.status, 400);
      assert.ok(result.body.details[field]);
      assert.deepEqual(row, previous);
      assert.equal(writes, 0);
    });
  }
}
for (const field of [
  "creadorId",
  "esOficial",
  "status",
  "id",
  "createdAt",
  "updatedAt",
  "imagenUrl",
  "desconocido",
  "creador_id",
  "__proto__",
]) {
  it(`rechaza campo protegido o desconocido ${field}`, async () => {
    const previous = structuredClone(row);
    assert.equal(
      (await patch({ nombre: "Cambio", [field]: 99 }, "5", sign(8, "admin"))).status,
      400,
    );
    assert.deepEqual(row, previous);
    assert.equal(writes, 0);
  });
}
for (const inactive of [false, true]) {
  it(`responde 404 para reto ${inactive ? "inactivo" : "inexistente"}`, async () => {
    if (inactive) row.status = "INACTIVE";
    assert.equal((await patch({ nombre: "Cambio" }, inactive ? "5" : "999")).status, 404);
    assert.equal(writes, 0);
  });
}
for (const categoriaId of [3, 999]) {
  it(`rechaza categoría inactiva o inexistente ${categoriaId} sin modificar`, async () => {
    const previous = structuredClone(row);
    assert.equal((await patch({ nombre: "Cambio", categoriaId })).status, 404);
    assert.deepEqual(row, previous);
    assert.equal(writes, 0);
  });
}
