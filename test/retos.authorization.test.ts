import assert from "node:assert/strict";
import { it } from "node:test";
import { RetosUseCase } from "../src/application/retos/retos.use-case.ts";
import { ForbiddenError, UnauthorizedError } from "../src/application/errors/app.error.ts";
import type { AuthUser, Usuario } from "../src/domain/models/Usuario.ts";
import type { Reto } from "../src/domain/models/Reto.ts";
import type { IRetoRepository } from "../src/domain/repository/IReto.repository.ts";
import type { IUsuarioRepository } from "../src/domain/repository/IUsuario.repository.ts";

const input = { nombre: "Agua", descripcion: "Beber agua", duracionDias: 30, categoriaId: 2 };
const token = (rol: "user" | "admin" = "user"): AuthUser => ({
  id: 7,
  nombre: "Ana",
  email: "ana@example.test",
  rol,
});

function setup(rol: "user" | "admin" = "user", owner = 7) {
  let current: Usuario | null = {
    ...token(rol),
    status: "ACTIVE",
    passwordHash: "no-se-usa",
    createdAt: new Date(),
  };
  const calls = { users: 0, reads: 0, writes: 0, uploads: 0, categories: 0 };
  const row: Reto = {
    ...input,
    id: 5,
    creadorId: owner,
    esOficial: false,
    imagenUrl: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const retos: IRetoRepository = {
    async create(data) {
      calls.writes++;
      return { ...row, ...data, imagenUrl: null };
    },
    async update() {
      calls.writes++;
      return row;
    },
    async deactivate() {
      calls.writes++;
    },
    async findActiveById() {
      calls.reads++;
      return row;
    },
    async findAll() {
      throw new Error("No se usa");
    },
  };
  const usuarios = {
    async findActiveById(id: number) {
      calls.users++;
      assert.equal(id, 7);
      return current?.status === "ACTIVE" ? current : null;
    },
  } as IUsuarioRepository;
  const useCase = new RetosUseCase(
    retos,
    {
      async findActiveById() {
        calls.categories++;
        return { id: 2 };
      },
      async findAllActive() {
        throw new Error("No se usa");
      },
    },
    usuarios,
    {
      async upload() {
        calls.uploads++;
        throw new Error("No debe subir imágenes");
      },
      async remove() {
        throw new Error("No debe eliminar imágenes");
      },
    },
  );
  return {
    useCase,
    calls,
    setUser: (user: Usuario | null) => {
      current = user;
    },
    deactivate: () => {
      current!.status = "INACTIVE";
    },
  };
}

const operations = ["create", "update", "deactivate"] as const;
function run(useCase: RetosUseCase, operation: (typeof operations)[number], user: AuthUser) {
  if (operation === "create") return useCase.create(input, user);
  if (operation === "update") return useCase.update(5, { nombre: "Nuevo" }, user);
  return useCase.deactivate(5, user);
}

for (const operation of operations) {
  for (const rol of ["user", "admin"] as const) {
    it(`${operation}: rechaza ${rol} desactivado sin efectos secundarios`, async () => {
      const f = setup(rol);
      f.deactivate();
      await assert.rejects(run(f.useCase, operation, token(rol)), UnauthorizedError);
      assert.deepEqual(f.calls, { users: 1, reads: 0, writes: 0, uploads: 0, categories: 0 });
    });
  }
  it(`${operation}: rechaza usuario inexistente`, async () => {
    const f = setup();
    f.setUser(null);
    await assert.rejects(run(f.useCase, operation, token()), UnauthorizedError);
    assert.equal(f.calls.writes, 0);
  });
  it(`${operation}: permite al creador activo aunque su rol admin haya sido revocado`, async () => {
    const f = setup();
    await run(f.useCase, operation, token("admin"));
    assert.equal(f.calls.writes, 1);
    assert.equal(f.calls.users, 1);
  });
}

it("creación activa usa el rol vigente para esOficial, aunque el JWT conserve admin", async () => {
  const f = setup();
  assert.equal((await f.useCase.create(input, token("admin"))).esOficial, false);
});
it("creación reconoce el rol admin vigente aunque el JWT indique user", async () => {
  const f = setup("admin");
  assert.equal((await f.useCase.create(input, token())).esOficial, true);
});
for (const operation of ["update", "deactivate"] as const) {
  for (const jwtRole of ["user", "admin"] as const) {
    it(`${operation}: usuario sin permisos, JWT ${jwtRole}, recibe 403`, async () => {
      const f = setup("user", 9);
      await assert.rejects(run(f.useCase, operation, token(jwtRole)), ForbiddenError);
      assert.equal(f.calls.writes, 0);
      assert.equal(f.calls.uploads, 0);
    });
  }
  it(`${operation}: admin activo vigente puede operar sobre otro creador`, async () => {
    const f = setup("admin", 9);
    await run(f.useCase, operation, token());
    assert.equal(f.calls.writes, 1);
  });
}
