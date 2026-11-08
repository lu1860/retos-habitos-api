import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, it, mock } from "node:test";
import jwt from "jsonwebtoken";
import { participationDb } from "./helpers/participaciones-db.ts";
process.env["DATABASE_URL"] = "postgresql://usuario:clave@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
const { ParticipacionesPgRepository } = await import(
  "../src/infrastructure/repository/participaciones.pg.repository.ts"
);
const originals = {
  join: ParticipacionesPgRepository.prototype.join,
  leave: ParticipacionesPgRepository.prototype.leave,
};
let server: Server;
let url: string;
let sign: (id: number) => string;
let db = participationDb();
before(async () => {
  mock.method(ParticipacionesPgRepository.prototype, "join", (user: number, reto: number) =>
    originals.join.call(new ParticipacionesPgRepository(db.client), user, reto),
  );
  mock.method(ParticipacionesPgRepository.prototype, "leave", (user: number, reto: number) =>
    originals.leave.call(new ParticipacionesPgRepository(db.client), user, reto),
  );
  const { tokenService } = await import("../src/interface/dependencies.ts");
  sign = (id) =>
    tokenService.generate({ id, rol: "user", nombre: "Ana", email: "ana@example.test" })
      .accessToken;
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/retos`;
});
beforeEach(() => {
  db = participationDb();
});
after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  mock.restoreAll();
});
const request = (method = "POST", id = "5", token: string | null = sign(7), body?: unknown) =>
  fetch(`${url}/${id}/participantes`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
it("POST 201, duplicado 409, DELETE 204 vacío, repetido 404 y reactivación 200 conserva ID/fecha", async () => {
  const first = await request();
  assert.equal(first.status, 201);
  const original = await first.json();
  assert.deepEqual(Object.keys(original.data).sort(), [
    "fechaUnion",
    "id",
    "retoId",
    "status",
    "usuarioId",
  ]);
  assert.equal((await request()).status, 409);
  const leave = await request("DELETE");
  assert.equal(leave.status, 204);
  assert.equal(await leave.text(), "");
  assert.equal((await request("DELETE")).status, 404);
  const rejoin = await request();
  assert.equal(rejoin.status, 200);
  assert.deepEqual(await rejoin.json(), original);
  assert.equal(db.state.rows.length, 1);
});
it("usa solo JWT e impide abandonar participación ajena", async () => {
  assert.equal(
    (await request("POST", "5", sign(7), { usuarioId: 8, usuario_id: 8, user: { id: 8 } })).status,
    201,
  );
  assert.equal(db.state.rows[0].usuario_id, 7);
  assert.equal((await request("DELETE", "5", sign(8), { usuarioId: 7 })).status, 404);
  assert.equal(db.state.rows[0].status, "ACTIVE");
});
for (const method of ["POST", "DELETE"]) {
  for (const token of [null, "invalido", "expired"] as const)
    it(`${method} JWT ${token}: 401 sin consultas`, async () => {
      const value =
        token === "expired"
          ? jwt.sign(
              { id: 7, nombre: "Ana", email: "ana@example.test", rol: "user" },
              process.env["JWT_SECRET"]!,
              { expiresIn: -1 },
            )
          : token;
      const response = await request(method, "5", value);
      assert.equal(response.status, 401);
      assert.equal(typeof (await response.json()).error, "string");
      assert.equal(db.state.locks, 0);
    });
  for (const id of ["abc", "0", "-1", "1.5", "2147483648", "9007199254740992"])
    it(`${method} ID ${id}: 400`, async () => {
      assert.equal((await request(method, id)).status, 400);
      assert.equal(db.state.locks, 0);
    });
  for (const status of ["missing", "INACTIVE"])
    it(`${method} reto ${status}: 404`, async () => {
      db.state.reto = status;
      assert.equal((await request(method)).status, 404);
      assert.equal(db.state.writes, 0);
    });
  it(`${method} usuario INACTIVE: 401`, async () => {
    db.state.user = "INACTIVE";
    assert.equal((await request(method)).status, 401);
    assert.equal(db.state.writes, 0);
  });
}
it("concurrencia HTTP con bloqueo simulado: un éxito por operación", async () => {
  assert.deepEqual(
    (await Promise.all([request(), request()])).map((r) => r.status).sort(),
    [201, 409],
  );
  assert.deepEqual(
    (await Promise.all([request("DELETE"), request("DELETE")])).map((r) => r.status).sort(),
    [204, 404],
  );
  assert.deepEqual(
    (await Promise.all([request(), request()])).map((r) => r.status).sort(),
    [200, 409],
  );
});
