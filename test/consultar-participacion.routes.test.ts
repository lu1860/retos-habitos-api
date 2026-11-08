import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, it, mock } from "node:test";
import jwt from "jsonwebtoken";

process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
const { UsuariosPgRepository } = await import(
  "../src/infrastructure/repository/usuarios.pg.repository.ts"
);
const { RetosPgRepository } = await import(
  "../src/infrastructure/repository/retos.pg.repository.ts"
);
const { ParticipacionesPgRepository } = await import(
  "../src/infrastructure/repository/participaciones.pg.repository.ts"
);
let server: Server;
let url: string;
let user = "ACTIVE";
let reto = "ACTIVE";
let participation = "ACTIVE";
let failure = "";
let calls: unknown[][] = [];
const sign = (id = 7, expiresIn = 3600) =>
  jwt.sign(
    { id, rol: "user", nombre: "Ana", email: "ana@example.test" },
    process.env["JWT_SECRET"]!,
    { expiresIn },
  );
before(async () => {
  mock.method(UsuariosPgRepository.prototype, "findActiveById", async (id: number) => {
    calls.push(["usuario", id]);
    if (failure === "usuario") throw new Error("fallo simulado");
    return user === "ACTIVE" ? { id } : null;
  });
  mock.method(RetosPgRepository.prototype, "findActiveById", async (id: number) => {
    calls.push(["reto", id]);
    if (failure === "reto") throw new Error("fallo simulado");
    return reto === "ACTIVE" ? { id } : null;
  });
  mock.method(
    ParticipacionesPgRepository.prototype,
    "isActiveParticipant",
    async (usuarioId: number, retoId: number) => {
      calls.push(["participacion", usuarioId, retoId]);
      if (failure === "participacion") throw new Error("fallo simulado");
      return usuarioId === 7 && participation === "ACTIVE";
    },
  );
  for (const [prototype, methods] of [
    [UsuariosPgRepository.prototype, ["create"]],
    [RetosPgRepository.prototype, ["create", "update", "deactivate"]],
    [
      ParticipacionesPgRepository.prototype,
      ["create", "reactivate", "deactivate", "join", "leave"],
    ],
  ] as const) {
    for (const method of methods)
      mock.method(prototype, method as never, () => assert.fail("Escritura inesperada"));
  }
  mock.method(console, "error", () => {});
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/retos`;
});
beforeEach(() => {
  user = reto = participation = "ACTIVE";
  failure = "";
  calls = [];
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  mock.restoreAll();
});
const request = (id = "5", token: string | null = sign(), query = "") =>
  fetch(`${url}/${id}/participacion${query}`, {
    headers: token === null ? {} : { Authorization: `Bearer ${token}`, usuarioId: "7" },
  });

for (const state of ["ACTIVE", "missing", "INACTIVE"]) {
  it(`GET participación ${state}: booleano, no-store y solo lecturas en orden`, async () => {
    participation = state;
    const response = await request();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { data: { participa: state === "ACTIVE" } });
    assert.deepEqual(calls, [
      ["usuario", 7],
      ["reto", 5],
      ["participacion", 7, 5],
    ]);
  });
}
for (const state of ["missing", "INACTIVE"]) {
  it(`usuario ${state}: 401 sin consultar reto ni participación`, async () => {
    user = state;
    const response = await request();
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "La sesión ya no es válida. Inicia sesión de nuevo",
    });
    assert.deepEqual(calls, [["usuario", 7]]);
  });
  it(`reto ${state}: 404 sin consultar participación`, async () => {
    reto = state;
    const response = await request();
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Reto no encontrado" });
    assert.deepEqual(calls, [
      ["usuario", 7],
      ["reto", 5],
    ]);
  });
}
for (const token of ["missing", "invalid", "expired"]) {
  it(`JWT ${token}: 401 sin repositorios`, async () => {
    assert.equal(
      (
        await request(
          "5",
          token === "missing" ? null : token === "expired" ? sign(7, -1) : "invalido",
        )
      ).status,
      401,
    );
    assert.deepEqual(calls, []);
  });
}
for (const id of ["abc", "0", "-1", "1.5", "2147483648", "9007199254740992"]) {
  it(`ID ${id}: 400 sin repositorios`, async () => {
    assert.equal((await request(id)).status, 400);
    assert.deepEqual(calls, []);
  });
}
it("acepta el límite Int de PostgreSQL", async () => {
  assert.equal((await request("2147483647")).status, 200);
  assert.deepEqual(calls[2], ["participacion", 7, 2147483647]);
});
it("aísla usuarios e ignora identidad enviada en query y headers", async () => {
  assert.deepEqual(
    await (await request("5", sign(8), "?usuarioId=7&usuario_id=7&user[id]=7")).json(),
    { data: { participa: false } },
  );
  assert.deepEqual(calls, [
    ["usuario", 8],
    ["reto", 5],
    ["participacion", 8, 5],
  ]);
  assert.deepEqual(await (await request()).json(), { data: { participa: true } });
});
for (const stage of ["usuario", "reto", "participacion"]) {
  it(`error de base de datos en ${stage}: 500 sin falso negativo`, async () => {
    failure = stage;
    const response = await request();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Error interno del servidor" });
  });
}
it("la ruta de detalle existente sigue respondiendo", async () => {
  assert.equal((await fetch(`${url}/5`)).status, 200);
  assert.deepEqual(calls, [["reto", 5]]);
});
