import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it, mock } from "node:test";
import type { Prisma } from "../src/generated/prisma/client.ts";

// Configurar antes de importar la app. Prisma se sustituye y no se conecta a PostgreSQL.
process.env["DATABASE_URL"] ??= "postgresql://usuario:clave@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";

const fecha = new Date("2026-11-07T12:00:00Z");
const base = {
  descripcion: "Beber AGUA diariamente",
  imagen_url: null,
  duracion_dias: 30,
  es_oficial: false,
  categoria_id: 2,
  creador_id: 7,
  status: "ACTIVE" as const,
  created_at: fecha,
  updated_at: fecha,
};
const rows = [
  { ...base, id: 1, nombre: "Agua" },
  { ...base, id: 2, nombre: "Leer", descripcion: "Un libro", categoria_id: 3 },
  { ...base, id: 3, nombre: "Caminar" },
  { ...base, id: 4, nombre: "Agua inactiva", status: "INACTIVE" },
];

let server: Server;
let url: string;
let queries = 0;

before(async () => {
  const { RetosPgRepository } = await import(
    "../src/infrastructure/repository/retos.pg.repository.ts"
  );
  const filtered = (where: Prisma.retosWhereInput) => {
    queries++;
    // Comprueba el contrato real del repositorio, incluyendo el filtro obligatorio.
    assert.equal(where.status, "ACTIVE");
    const terms = where.OR;
    let q: string | undefined;
    if (terms) {
      assert.equal(terms.length, 2);
      const nombre = terms[0].nombre as Prisma.StringFilter;
      const descripcion = terms[1].descripcion as Prisma.StringFilter;
      assert.equal(nombre.mode, "insensitive");
      assert.equal(descripcion.mode, "insensitive");
      assert.equal(nombre.contains, descripcion.contains);
      q = nombre.contains as string;
    }
    return rows.filter(
      (row) =>
        row.status === where.status &&
        (where.categoria_id === undefined || row.categoria_id === where.categoria_id) &&
        (!q ||
          [row.nombre, row.descripcion].some((text) =>
            text.toLowerCase().includes(q.toLowerCase()),
          )),
    );
  };
  const tabla = {
    count: async ({ where }: { where: Prisma.retosWhereInput }) => filtered(where).length,
    findMany: async (args: {
      where: Prisma.retosWhereInput;
      skip: number;
      take: number;
      orderBy: unknown;
    }) => {
      assert.deepEqual(args.orderBy, { id: "asc" });
      return filtered(args.where).slice(args.skip, args.skip + args.take);
    },
    findFirst: async ({ where }: { where: { id: number; status: string } }) => {
      queries++;
      assert.equal(where.status, "ACTIVE");
      return rows.find((row) => row.id === where.id && row.status === where.status) ?? null;
    },
  };
  const repository = new RetosPgRepository(
    tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
  );
  // Ejecutar los métodos reales con la tabla simulada también desde las dependencias de la app.
  const list = repository.findAll.bind(repository);
  const detail = repository.findActiveById.bind(repository);
  mock.method(RetosPgRepository.prototype, "findAll", list);
  mock.method(RetosPgRepository.prototype, "findActiveById", detail);
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

const get = async (path = "") => {
  const response = await fetch(`${url}${path}`);
  return { status: response.status, body: await response.json() };
};

describe("GET /api/retos (rutas públicas con Prisma sustituido)", () => {
  it("lista solo ACTIVE, usa camelCase y paginación por defecto sin token", async () => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(
      body.data.map((row: { id: number }) => row.id),
      [1, 2, 3],
    );
    assert.deepEqual(body.pagination, { total: 3, currentPage: 1, limit: 10, totalPages: 1 });
    assert.deepEqual(body.data[0], {
      id: 1,
      nombre: "Agua",
      descripcion: base.descripcion,
      imagenUrl: null,
      duracionDias: 30,
      esOficial: false,
      categoriaId: 2,
      creadorId: 7,
      status: "ACTIVE",
      createdAt: fecha.toISOString(),
      updatedAt: fecha.toISOString(),
    });
  });

  for (const [query, ids] of [
    ["?categoriaId=3", [2]],
    ["?q=aGuA", [1, 3]],
    ["?q=lEeR", [2]],
    ["?categoriaId=2&q=AGUA", [1, 3]],
    ["?categoriaId=3&q=agua", []],
    ["?q=%20%20", [1, 2, 3]],
  ] as const) {
    it(`aplica los filtros ${query}`, async () => {
      const { status, body } = await get(query);
      assert.equal(status, 200);
      assert.deepEqual(
        body.data.map((row: { id: number }) => row.id),
        ids,
      );
      assert.equal(body.pagination.total, ids.length);
    });
  }

  it("pagina y conserva el total incluso en una página vacía", async () => {
    const { body } = await get("?page=2&limit=2");
    assert.deepEqual(
      body.data.map((row: { id: number }) => row.id),
      [3],
    );
    assert.deepEqual(body.pagination, { total: 3, currentPage: 2, limit: 2, totalPages: 2 });
    const empty = await get("?page=3&limit=2");
    assert.deepEqual(empty.body.data, []);
    assert.deepEqual(empty.body.pagination, { total: 3, currentPage: 3, limit: 2, totalPages: 2 });
  });

  it("devuelve detalle activo con { data } sin token", async () => {
    const detail = await get("/1");
    assert.equal(detail.status, 200);
    assert.deepEqual(Object.keys(detail.body), ["data"]);
    assert.deepEqual(detail.body.data, (await get()).body.data[0]);
  });

  for (const id of [4, 999]) {
    it(`responde 404 para el reto ${id} inactivo o inexistente`, async () => {
      const result = await get(`/${id}`);
      assert.equal(result.status, 404);
      assert.deepEqual(result.body, { error: "Reto no encontrado" });
    });
  }

  for (const path of [
    "/0",
    "/-1",
    "/abc",
    "/1.5",
    "/9007199254740992",
    "?categoriaId=0",
    "?categoriaId=",
    "?categoriaId=abc",
    "?categoriaId=1.5",
    "?categoriaId=1&categoriaId=2",
    "?categoriaId=9007199254740992",
    "?page=0",
    "?page=-1",
    "?page=1.5",
    "?page=abc",
    "?page=1&page=2",
    "?limit=0",
    "?limit=51",
    "?limit=abc",
    "?limit=1&limit=2",
    "?q=a&q=b",
    `?q=${"a".repeat(101)}`,
  ]) {
    it(`responde 400 sin consultar Prisma para ${path}`, async () => {
      const previous = queries;
      const result = await get(path);
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.error, "string");
      assert.ok(result.body.details);
      assert.equal(queries, previous);
    });
  }

  for (const method of ["PATCH", "DELETE"]) {
    it(`no expone ${method}`, async () => {
      const response = await fetch(`${url}${method === "POST" ? "" : "/1"}`, { method });
      assert.equal(response.status, 404);
    });
  }
});
