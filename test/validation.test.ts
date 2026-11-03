import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestError } from "../src/application/errors/app.error.ts";
import { parseId } from "../src/application/validation/id.ts";
import {
  parsePagination,
  toPaginatedResult,
  toSkip,
} from "../src/application/validation/pagination.ts";
import { optionalEnum, optionalText } from "../src/application/validation/query.ts";

describe("parsePagination", () => {
  it("usa page=1 y limit=10 si no vienen", () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 10 });
  });

  it("acepta enteros positivos", () => {
    assert.deepEqual(parsePagination({ page: "3", limit: "20" }), { page: 3, limit: 20 });
  });

  for (const value of ["0", "-1", "abc", "1.5", "1e2", " "]) {
    it(`rechaza page="${value}" con 400`, () => {
      assert.throws(() => parsePagination({ page: value }), BadRequestError);
    });
  }

  it("rechaza limit mayor a 50", () => {
    assert.throws(() => parsePagination({ limit: "51" }), BadRequestError);
  });
});

describe("toPaginatedResult y toSkip", () => {
  it("arma { data, pagination } con el total de páginas redondeado hacia arriba", () => {
    assert.deepEqual(toPaginatedResult(["a"], 42, 2, 10), {
      data: ["a"],
      pagination: { total: 42, currentPage: 2, limit: 10, totalPages: 5 },
    });
    assert.equal(toPaginatedResult([], 0, 1, 10).pagination.totalPages, 0);
  });

  it("calcula cuántas filas saltar", () => {
    assert.equal(toSkip(1, 10), 0);
    assert.equal(toSkip(3, 10), 20);
  });
});

describe("parseId", () => {
  it("convierte un id válido", () => {
    assert.equal(parseId("15"), 15);
  });

  for (const value of ["0", "-2", "abc", "1.5", "", undefined]) {
    it(`rechaza ${JSON.stringify(value)} con 400`, () => {
      assert.throws(() => parseId(value), BadRequestError);
    });
  }
});

describe("filtros de texto y de lista", () => {
  it("optionalText recorta y trata el vacío como ausente", () => {
    assert.equal(optionalText("  agua ", "q"), "agua");
    assert.equal(optionalText("   ", "q"), undefined);
    assert.equal(optionalText(undefined, "q"), undefined);
  });

  it("optionalText rechaza un parámetro repetido", () => {
    assert.throws(() => optionalText(["a", "b"], "q"), BadRequestError);
  });

  it("optionalEnum solo acepta los valores permitidos", () => {
    assert.equal(optionalEnum("admin", "rol", ["admin", "user"] as const), "admin");
    assert.throws(() => optionalEnum("root", "rol", ["admin", "user"] as const), BadRequestError);
  });
});
