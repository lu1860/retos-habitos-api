import assert from "node:assert/strict";
import { it } from "node:test";
import { ParticipacionesUseCase } from "../src/application/participaciones/participaciones.use-case.ts";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../src/application/errors/app.error.ts";

for (const [kind, error] of [
  ["already-active", ConflictError],
  ["reto-not-found", NotFoundError],
  ["unauthorized", UnauthorizedError],
] as const) {
  it(`join traduce ${kind}`, async () => {
    const uc = new ParticipacionesUseCase({
      join: async () => ({ kind }),
      leave: async () => "left",
    });
    await assert.rejects(uc.join(7, 5), error);
  });
}
for (const [result, error] of [
  ["not-active", NotFoundError],
  ["reto-not-found", NotFoundError],
  ["unauthorized", UnauthorizedError],
] as const) {
  it(`leave traduce ${result}`, async () => {
    const uc = new ParticipacionesUseCase({
      join: async () => ({ kind: "already-active" }),
      leave: async () => result,
    });
    await assert.rejects(uc.leave(7, 5), error);
  });
}
