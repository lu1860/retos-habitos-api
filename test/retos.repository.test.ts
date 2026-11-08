import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { RetoFiltros } from "../src/domain/models/Reto.ts";

// Como en middlewares.test.ts: configurar antes del import dinámico. No se conecta a PostgreSQL.
process.env["DATABASE_URL"] ??= "postgresql://usuario:clave@localhost:5432/no-se-usa";

const tabla = {
  create() {},
  findFirst() {},
  count() {},
  findMany() {},
  update() {},
  delete() {},
  deleteMany() {},
};
let RetosPgRepository: (typeof import("../src/infrastructure/repository/retos.pg.repository.ts"))["RetosPgRepository"];

before(async () => {
  ({ RetosPgRepository } = await import("../src/infrastructure/repository/retos.pg.repository.ts"));
});

const fecha = new Date("2026-11-07T12:00:00Z");
const row = {
  id: 5,
  nombre: "Agua",
  descripcion: "Beber agua diariamente",
  imagen_url: null,
  duracion_dias: 30,
  es_oficial: false,
  categoria_id: 2,
  creador_id: 7,
  status: "ACTIVE" as const,
  created_at: fecha,
  updated_at: fecha,
};
const domain = {
  id: 5,
  nombre: "Agua",
  descripcion: "Beber agua diariamente",
  imagenUrl: null,
  duracionDias: 30,
  esOficial: false,
  categoriaId: 2,
  creadorId: 7,
  status: "ACTIVE",
  createdAt: fecha,
  updatedAt: fecha,
};

describe("RetosPgRepository (Prisma sustituido, sin base de datos)", () => {
  it("crea con columnas reales y convierte la fila a camelCase", async (t) => {
    const create = t.mock.method(tabla, "create", async () => row);
    const result = await new RetosPgRepository(
      tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
    ).create({
      nombre: "Agua",
      descripcion: "Beber agua diariamente",
      duracionDias: 30,
      esOficial: false,
      categoriaId: 2,
      creadorId: 7,
    });
    assert.deepEqual(create.mock.calls[0].arguments, [
      {
        data: {
          nombre: "Agua",
          descripcion: "Beber agua diariamente",
          imagen_url: undefined,
          duracion_dias: 30,
          es_oficial: false,
          categoria_id: 2,
          creador_id: 7,
        },
      },
    ]);
    assert.deepEqual(result, domain);
  });

  it("consulta por ID restringiendo a ACTIVE y devuelve null si no hay fila", async (t) => {
    const find = t.mock.method(tabla, "findFirst", async () => row);
    assert.deepEqual(
      await new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).findActiveById(5),
      domain,
    );
    assert.deepEqual(find.mock.calls[0].arguments, [{ where: { id: 5, status: "ACTIVE" } }]);
    find.mock.mockImplementation(async () => null);
    assert.equal(
      await new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).findActiveById(99),
      null,
    );
  });

  for (const filtros of [
    { page: 1, limit: 10 },
    { page: 2, limit: 3, categoriaId: 2 },
    { page: 1, limit: 5, q: "agua" },
    { page: 3, limit: 2, categoriaId: 2, q: "agua" },
  ] satisfies RetoFiltros[]) {
    it(`comparte filtros de conteo y listado: ${JSON.stringify(filtros)}`, async (t) => {
      const count = t.mock.method(tabla, "count", async () => 8);
      const find = t.mock.method(tabla, "findMany", async () => [row]);
      const where = {
        status: "ACTIVE",
        ...("categoriaId" in filtros && { categoria_id: filtros.categoriaId }),
        ...("q" in filtros && {
          OR: [
            { nombre: { contains: filtros.q, mode: "insensitive" } },
            { descripcion: { contains: filtros.q, mode: "insensitive" } },
          ],
        }),
      };
      assert.deepEqual(
        await new RetosPgRepository(
          tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
        ).findAll(filtros),
        {
          total: 8,
          rows: [domain],
        },
      );
      assert.deepEqual(count.mock.calls[0].arguments, [{ where }]);
      assert.deepEqual(find.mock.calls[0].arguments, [
        {
          where,
          orderBy: { id: "asc" },
          skip: (filtros.page - 1) * filtros.limit,
          take: filtros.limit,
        },
      ]);
    });
  }

  it("conserva el total si la página está vacía", async (t) => {
    t.mock.method(tabla, "count", async () => 2);
    t.mock.method(tabla, "findMany", async () => []);
    assert.deepEqual(
      await new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).findAll({ page: 3, limit: 10 }),
      {
        total: 2,
        rows: [],
      },
    );
  });

  it("actualiza solo campos editables de un reto activo y permite quitar la imagen", async (t) => {
    const update = t.mock.method(tabla, "update", async () => ({ ...row, nombre: "Leer" }));
    const result = await new RetosPgRepository(
      tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
    ).update(5, { nombre: "Leer", imagenUrl: null });
    assert.deepEqual(update.mock.calls[0].arguments, [
      {
        where: { id: 5, status: "ACTIVE" },
        data: {
          nombre: "Leer",
          descripcion: undefined,
          imagen_url: null,
          duracion_dias: undefined,
          categoria_id: undefined,
        },
      },
    ]);
    assert.deepEqual(result, { ...domain, nombre: "Leer" });
  });

  it("desactiva con update sin borrar físicamente ni modificar relaciones", async (t) => {
    const update = t.mock.method(tabla, "update", async () => ({
      ...row,
      status: "INACTIVE",
    }));
    const remove = t.mock.method(tabla, "delete", async () => {
      throw new Error("No borrar");
    });
    const removeMany = t.mock.method(tabla, "deleteMany", async () => {
      throw new Error("No borrar");
    });
    assert.equal(
      await new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).deactivate(5),
      undefined,
    );
    assert.deepEqual(update.mock.calls[0].arguments, [
      {
        where: { id: 5, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      },
    ]);
    assert.equal(remove.mock.callCount(), 0);
    assert.equal(removeMany.mock.callCount(), 0);
  });

  it("propaga fallos de persistencia para el manejador central", async (t) => {
    const failure = new Error("Fallo simulado");
    t.mock.method(tabla, "update", async () => {
      throw failure;
    });
    await assert.rejects(
      new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).update(99, { nombre: "Leer" }),
      (e) => e === failure,
    );
    await assert.rejects(
      new RetosPgRepository(
        tabla as unknown as ConstructorParameters<typeof RetosPgRepository>[0],
      ).deactivate(99),
      (e) => e === failure,
    );
  });
});
