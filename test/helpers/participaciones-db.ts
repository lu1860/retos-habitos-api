import assert from "node:assert/strict";
import type { PrismaClient } from "../../src/generated/prisma/client.ts";

/** Serialización simulada; el bloqueo PostgreSQL real requiere prueba de integración. */
export function participationDb() {
  type Row = { id: number; usuario_id: number; reto_id: number; fecha_union: Date; status: string };
  const state = { rows: [] as Row[], reto: "ACTIVE", user: "ACTIVE", writes: 0, locks: 0 };
  let queue = Promise.resolve();
  const tx = {
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      assert.equal(strings.join("?"), "SELECT status FROM retos WHERE id = ? FOR UPDATE");
      assert.deepEqual(values, [5]);
      state.locks++;
      return state.reto === "missing" ? [] : [{ status: state.reto }];
    },
    usuarios: {
      async findFirst() {
        return state.user === "ACTIVE" ? { id: 7 } : null;
      },
    },
    participaciones: {
      async findUnique({
        where,
      }: {
        where: { usuario_id_reto_id: { usuario_id: number; reto_id: number } };
      }) {
        const key = where.usuario_id_reto_id;
        return (
          state.rows.find((r) => r.usuario_id === key.usuario_id && r.reto_id === key.reto_id) ??
          null
        );
      },
      async create({ data }: { data: { usuario_id: number; reto_id: number } }) {
        const row = {
          ...data,
          id: 1,
          fecha_union: new Date("2026-11-08T12:00:00Z"),
          status: "ACTIVE",
        };
        state.rows.push(row);
        state.writes++;
        return row;
      },
      async updateMany({ where, data }: { where: Partial<Row>; data: { status: string } }) {
        let count = 0;
        for (const row of state.rows)
          if (Object.entries(where).every(([key, value]) => row[key as keyof Row] === value)) {
            row.status = data.status;
            count++;
          }
        state.writes += count;
        return { count };
      },
      async update({ where, data }: { where: Partial<Row>; data: { status: string } }) {
        const row = state.rows.find((r) => r.id === where.id && r.status === where.status);
        assert.ok(row);
        row.status = data.status;
        return row;
      },
      delete() {
        assert.fail("Borrado físico prohibido");
      },
      deleteMany() {
        assert.fail("Borrado físico prohibido");
      },
    },
  };
  const client = {
    ...tx,
    async $transaction<T>(callback: (value: typeof tx) => Promise<T>) {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(tx);
      } finally {
        release();
      }
    },
  };
  return { state, client: client as unknown as PrismaClient };
}
