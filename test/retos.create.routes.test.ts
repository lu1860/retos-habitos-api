import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, it, mock } from "node:test";
import type { NuevoReto, Reto } from "../src/domain/models/Reto.ts";

process.env["DATABASE_URL"] = "postgresql://usuario:clave@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
let server: Server;
let url: string;
let sign: (rol: "user" | "admin") => string;
let queries = 0;
let writes = 0;
const rows: Reto[] = [];
const input = { nombre: " Agua ", descripcion: " Beber agua ", duracionDias: 30, categoriaId: 2 };

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
  const categorias = new CategoriasPgRepository({
    findFirst: async (args: { where: { id: number; status: string } }) => {
      queries++;
      assert.deepEqual(args, {
        where: { id: args.where.id, status: "ACTIVE" },
        select: { id: true },
      });
      const data = [
        { id: 2, status: "ACTIVE" },
        { id: 3, status: "INACTIVE" },
      ];
      const row = data.find((row) => row.id === args.where.id && row.status === args.where.status);
      return row ? { id: row.id } : null;
    },
  } as unknown as ConstructorParameters<typeof CategoriasPgRepository>[0]);
  mock.method(
    CategoriasPgRepository.prototype,
    "findActiveById",
    categorias.findActiveById.bind(categorias),
  );
  mock.method(RetosPgRepository.prototype, "create", async (data: NuevoReto) => {
    writes++;
    const row: Reto = {
      ...data,
      id: rows.length + 1,
      imagenUrl: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    rows.push(row);
    return row;
  });
  mock.method(
    RetosPgRepository.prototype,
    "findActiveById",
    async (id: number) => rows.find((row) => row.id === id) ?? null,
  );
  const { tokenService } = await import("../src/interface/dependencies.ts");
  sign = (rol) =>
    tokenService.generate({
      id: rol === "admin" ? 8 : 7,
      nombre: "Ana",
      email: "ana@example.test",
      rol,
    }).accessToken;
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/retos`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  mock.restoreAll();
});
const post = async (body: unknown, token: string | null = sign("user")) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};
for (const rol of ["user", "admin"] as const) {
  it(`crea como ${rol}, ignora campos protegidos y permite GET`, async () => {
    const result = await post(
      {
        ...input,
        creadorId: 999,
        esOficial: rol !== "admin",
        status: "INACTIVE",
        imagenUrl: "ignorada",
      },
      sign(rol),
    );
    assert.equal(result.status, 201);
    assert.deepEqual(Object.keys(result.body), ["data"]);
    assert.equal(result.body.data.creadorId, rol === "admin" ? 8 : 7);
    assert.equal(result.body.data.esOficial, rol === "admin");
    assert.equal(result.body.data.status, "ACTIVE");
    assert.equal(result.body.data.nombre, "Agua");
    assert.equal(result.body.data.descripcion, "Beber agua");
    assert.equal(result.body.data.imagenUrl, null);
    const detail = await fetch(`${url}/${result.body.data.id}`);
    assert.equal(detail.status, 200);
    assert.deepEqual(await detail.json(), result.body);
  });
}
for (const token of [null, "invalido"]) {
  it(`responde 401 con token ${token}`, async () => {
    const previous = queries;
    const result = await post(input, token);
    assert.equal(result.status, 401);
    assert.deepEqual(Object.keys(result.body), ["error"]);
    assert.equal(queries, previous);
  });
}
for (const field of ["nombre", "descripcion", "duracionDias", "categoriaId"]) {
  const values =
    field === "nombre" || field === "descripcion"
      ? [undefined, null, "", "   ", 5, {}, "a".repeat(field === "nombre" ? 121 : 1001)]
      : [undefined, null, 0, -1, 1.5, "2", true, 2147483648, 9007199254740992];
  for (const [index, value] of values.entries()) {
    it(`rechaza ${field}, caso inválido ${index}`, async () => {
      const previous = queries;
      const result = await post({ ...input, [field]: value });
      assert.equal(result.status, 400);
      assert.ok(result.body.details[field]);
      assert.equal(result.body.stack, undefined);
      assert.equal(queries, previous);
    });
  }
}
for (const body of [null, [], "texto"]) {
  it(`rechaza body ${JSON.stringify(body)}`, async () =>
    assert.equal((await post(body)).status, 400));
}
for (const categoriaId of [3, 999]) {
  it(`responde 404 sin guardar para categoría ${categoriaId}`, async () => {
    const previous = writes;
    const result = await post({ ...input, categoriaId });
    assert.equal(result.status, 404);
    assert.deepEqual(Object.keys(result.body), ["error"]);
    assert.equal(writes, previous);
  });
}
it("acepta límites válidos de texto y duración Int de PostgreSQL", async () => {
  const result = await post({
    ...input,
    nombre: "a".repeat(120),
    descripcion: "a".repeat(1000),
    duracionDias: 2147483647,
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.duracionDias, 2147483647);
});
