import assert from "node:assert/strict";
import { it } from "node:test";
import { participationDb } from "./helpers/participaciones-db.ts";
process.env["DATABASE_URL"] = "postgresql://usuario:clave@localhost:5432/no-se-usa";
const { ParticipacionesPgRepository: Repository } = await import(
  "../src/infrastructure/repository/participaciones.pg.repository.ts"
);

it("ciclo conserva ID/fecha, interfaz C y filas sin borrado físico", async () => {
  const { client, state } = participationDb();
  const repo = new Repository(client);
  assert.equal(await repo.findByUsuarioYReto(7, 5), null);
  assert.equal((await repo.join(7, 5)).kind, "created");
  const original = structuredClone(await repo.findByUsuarioYReto(7, 5));
  assert.equal(await repo.isActiveParticipant(7, 5), true);
  assert.equal((await repo.join(7, 5)).kind, "already-active");
  assert.equal(await repo.leave(8, 5), "not-active");
  assert.equal(await repo.leave(7, 5), "left");
  assert.equal(await repo.isActiveParticipant(7, 5), false);
  assert.equal(await repo.leave(7, 5), "not-active");
  assert.equal((await repo.join(7, 5)).kind, "reactivated");
  assert.deepEqual(await repo.findByUsuarioYReto(7, 5), original);
  assert.equal(state.rows.length, 1);
});
for (const reto of ["missing", "INACTIVE"])
  it(`valida reto ${reto} después del bloqueo`, async () => {
    const { client, state } = participationDb();
    state.reto = reto;
    const repo = new Repository(client);
    assert.equal((await repo.join(7, 5)).kind, "reto-not-found");
    assert.equal(await repo.leave(7, 5), "reto-not-found");
    assert.equal(state.writes, 0);
    assert.equal(state.locks, 2);
  });
it("usuario INACTIVE no escribe", async () => {
  const { client, state } = participationDb();
  state.user = "INACTIVE";
  const repo = new Repository(client);
  assert.equal((await repo.join(7, 5)).kind, "unauthorized");
  assert.equal(await repo.leave(7, 5), "unauthorized");
  assert.equal(state.writes, 0);
});
it("concurrencia simulada: un éxito entre dos POST, DELETE y reactivaciones", async () => {
  const { client, state } = participationDb();
  const repo = new Repository(client);
  assert.deepEqual(
    (await Promise.all([repo.join(7, 5), repo.join(7, 5)])).map((r) => r.kind),
    ["created", "already-active"],
  );
  assert.deepEqual(await Promise.all([repo.leave(7, 5), repo.leave(7, 5)]), ["left", "not-active"]);
  assert.deepEqual(
    (await Promise.all([repo.join(7, 5), repo.join(7, 5)])).map((r) => r.kind),
    ["reactivated", "already-active"],
  );
  assert.equal(state.rows.length, 1);
  assert.equal(state.writes, 3);
});
it("mantiene escrituras de interfaz compartida", async () => {
  const { client, state } = participationDb();
  const repo = new Repository(client);
  await repo.create(7, 5);
  await repo.deactivate(1);
  await repo.reactivate(1);
  assert.equal(state.rows.length, 1);
  assert.equal(await repo.isActiveParticipant(7, 5), true);
});
