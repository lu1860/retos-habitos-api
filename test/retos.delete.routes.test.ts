import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, it, mock } from "node:test";

process.env["DATABASE_URL"] = "postgresql://usuario:clave@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
let server: Server;
let url: string;
let sign: (id: number, rol?: "user" | "admin") => string;
const initial = {
  id: 5,
  nombre: "Agua",
  descripcion: "Beber agua",
  imagen_url: null,
  duracion_dias: 30,
  categoria_id: 2,
  creador_id: 7,
  es_oficial: false,
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  created_at: new Date("2026-11-07"),
  updated_at: new Date("2026-11-07"),
  participaciones: [{ id: 1, reto_id: 5, usuario_id: 9 }],
  registros: [{ id: 2, reto_id: 5, usuario_id: 9 }],
};
let row = structuredClone(initial);
let reads = 0;
let writes = 0;

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
  // Se ejecuta el repositorio real con el delegado Prisma sustituido: nunca hay consultas remotas.
  const { RetosPgRepository } = await import(
    "../src/infrastructure/repository/retos.pg.repository.ts"
  );
  const tabla = {
    findFirst() {},
    update() {},
    count() {},
    findMany() {},
    delete() {},
    deleteMany() {},
  };
  mock.method(tabla, "findFirst", async ({ where }: { where: { id: number; status: string } }) => {
    reads++;
    return row.id === where.id && row.status === where.status ? structuredClone(row) : null;
  });
  mock.method(tabla, "update", async (args: unknown) => {
    assert.deepEqual(args, {
      where: { id: 5, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
    writes++;
    row.status = "INACTIVE";
    return structuredClone(row);
  });
  mock.method(tabla, "count", async ({ where }: { where: { status: string } }) =>
    row.status === where.status ? 1 : 0,
  );
  mock.method(tabla, "findMany", async ({ where }: { where: { status: string } }) =>
    row.status === where.status ? [structuredClone(row)] : [],
  );
  for (const method of ["delete", "deleteMany"] as const) {
    mock.method(tabla, method, async () => {
      assert.fail("No se permite borrado físico");
    });
  }
  const repository = new RetosPgRepository(
    tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
  );
  for (const method of ["findActiveById", "deactivate", "findAll"] as const) {
    mock.method(RetosPgRepository.prototype, method, repository[method].bind(repository));
  }
  const { tokenService } = await import("../src/interface/dependencies.ts");
  sign = (id, rol = "user") =>
    tokenService.generate({ id, rol, nombre: "Ana", email: "ana@example.test" }).accessToken;
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/retos`;
});
beforeEach(() => {
  row = structuredClone(initial);
  reads = 0;
  writes = 0;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  mock.restoreAll();
});
const remove = (id = "5", token: string | null = sign(7), body?: unknown) =>
  fetch(`${url}/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

for (const admin of [false, true]) {
  it(`elimina como ${admin ? "administrador ajeno" : "creador"}: 204 vacío y conserva fila e historial`, async () => {
    const response = await remove("5", sign(admin ? 8 : 7, admin ? "admin" : "user"));
    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
    assert.deepEqual(row, { ...initial, status: "INACTIVE" });
    assert.equal(writes, 1);
    assert.equal((await fetch(`${url}/5`)).status, 404);
    const list = await fetch(url);
    assert.equal(list.status, 200);
    const result = await list.json();
    assert.deepEqual(result.data, []);
    assert.equal(result.pagination.total, 0);
    assert.equal((await remove("5", sign(admin ? 8 : 7, admin ? "admin" : "user"))).status, 404);
    assert.equal(writes, 1);
  });
}
it("rechaza otro usuario aunque suplante al creador o administrador en el body", async () => {
  const response = await remove("5", sign(9), {
    creadorId: 9,
    user: { id: 7, rol: "admin" },
    rol: "admin",
    status: "INACTIVE",
  });
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
  assert.deepEqual(row, initial);
});
it("ignora campos del body y utiliza exclusivamente el usuario autenticado", async () => {
  assert.equal((await remove("5", sign(7), { nombre: "Cambio", status: "ACTIVE" })).status, 204);
  assert.deepEqual(row, { ...initial, status: "INACTIVE" });
});
for (const token of [null, "invalido"]) {
  it(`requiere JWT válido: ${token}`, async () => {
    assert.equal((await remove("5", token)).status, 401);
    assert.equal(reads, 0);
    assert.equal(writes, 0);
    assert.deepEqual(row, initial);
  });
}
for (const id of ["abc", "0", "-1", "1.5", "9007199254740992"]) {
  it(`rechaza ID inválido ${id} antes de consultar o escribir`, async () => {
    assert.equal((await remove(id)).status, 400);
    assert.equal(reads, 0);
    assert.equal(writes, 0);
  });
}
for (const inactive of [false, true]) {
  it(`responde 404 para reto ${inactive ? "inactivo" : "inexistente"}`, async () => {
    if (inactive) row.status = "INACTIVE";
    const previous = structuredClone(row);
    assert.equal((await remove(inactive ? "5" : "999")).status, 404);
    assert.equal(writes, 0);
    assert.deepEqual(row, previous);
  });
}
