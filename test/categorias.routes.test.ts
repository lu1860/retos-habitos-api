import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it, mock } from "node:test";

// Valores ficticios: la tabla Prisma se sustituye antes de importar la aplicación.
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/no-se-usa";
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";

const rows = [
  { id: 3, nombre: "Lectura", status: "ACTIVE", descripcion: "No exponer" },
  { id: 2, nombre: "Inactiva", status: "INACTIVE", descripcion: null },
  { id: 1, nombre: "Bienestar", status: "ACTIVE", descripcion: null },
];
let server: Server;
let url: string;
let empty = false;
let failure = false;
let queries = 0;

before(async () => {
  const { CategoriasPgRepository } = await import(
    "../src/infrastructure/repository/categorias.pg.repository.ts"
  );
  const tabla = {
    findMany: async (args: {
      where: { status: string };
      select: { id: boolean; nombre: boolean };
      orderBy: { id: string };
    }) => {
      queries++;
      assert.deepEqual(args, {
        where: { status: "ACTIVE" },
        select: { id: true, nombre: true },
        orderBy: { id: "asc" },
      });
      if (failure) throw new Error("Fallo simulado");
      return (empty ? [] : rows)
        .filter((row) => row.status === args.where.status)
        .sort((a, b) => a.id - b.id)
        .map(({ id, nombre }) => ({ id, nombre }));
    },
  };
  const repository = new CategoriasPgRepository(
    tabla as unknown as ConstructorParameters<typeof CategoriasPgRepository>[0],
  );
  // Se ejecuta el método real contra la tabla simulada, sin conexiones remotas.
  mock.method(
    CategoriasPgRepository.prototype,
    "findAllActive",
    repository.findAllActive.bind(repository),
  );
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/categorias`;
});

after(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  mock.restoreAll();
});

describe("GET /api/categorias (HTTP local con Prisma sustituido)", () => {
  it("es público y devuelve únicamente id y nombre de categorías activas ordenadas", async () => {
    const previous = queries;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await response.json(), {
      data: [
        { id: 1, nombre: "Bienestar" },
        { id: 3, nombre: "Lectura" },
      ],
    });
    assert.equal(queries, previous + 1);
  });

  it("devuelve 200 con data vacío cuando no hay categorías activas", async () => {
    empty = true;
    try {
      const response = await fetch(url);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { data: [] });
    } finally {
      empty = false;
    }
  });

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    for (const path of ["", "/1"]) {
      it(`no registra operaciones de escritura: ${method} /api/categorias${path}`, async () => {
        const previous = queries;
        const response = await fetch(`${url}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: "No persistir", status: "INACTIVE" }),
        });
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
          error: `La ruta ${method} /api/categorias${path} no existe`,
        });
        assert.equal(queries, previous);
      });
    }
  }

  it("propaga los fallos al manejador central sin exponer detalles internos", async (t) => {
    t.mock.method(console, "error", () => {});
    failure = true;
    try {
      const response = await fetch(url);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "Error interno del servidor" });
    } finally {
      failure = false;
    }
  });
});
