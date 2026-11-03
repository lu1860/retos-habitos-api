import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { AuthUseCase, INVALID_CREDENTIALS } from "../src/application/auth/auth.use-case.ts";
import { ConflictError, UnauthorizedError } from "../src/application/errors/app.error.ts";
import type { AuthToken } from "../src/domain/models/Auth.ts";
import type { Page } from "../src/domain/models/Pagination.ts";
import type { AuthUser, NuevoUsuario, Usuario } from "../src/domain/models/Usuario.ts";
import type { IUsuarioRepository } from "../src/domain/repository/IUsuario.repository.ts";
import type { IPasswordHasher } from "../src/domain/services/IPasswordHasher.ts";
import type { ITokenService } from "../src/domain/services/ITokenService.ts";

// Dobles de prueba: implementan las interfaces del dominio sin base de datos ni bcrypt.
// Así se prueban las reglas del caso de uso de forma aislada.
class FakeUsuarios implements IUsuarioRepository {
  rows: Usuario[] = [];

  async create(data: NuevoUsuario): Promise<Usuario> {
    const usuario: Usuario = {
      id: this.rows.length + 1,
      ...data,
      status: "ACTIVE",
      createdAt: new Date(),
    };
    this.rows.push(usuario);
    return usuario;
  }
  async findByEmail(email: string) {
    return this.rows.find((u) => u.email === email) ?? null;
  }
  async findActiveById(id: number) {
    return this.rows.find((u) => u.id === id && u.status === "ACTIVE") ?? null;
  }
  async findAll(): Promise<Page<Usuario>> {
    return { rows: this.rows, total: this.rows.length };
  }
}

const fakeHasher: IPasswordHasher = {
  hash: async (plain) => `hash:${plain}`,
  compare: async (plain, hash) => hash === `hash:${plain}`,
};

const fakeTokens: ITokenService = {
  generate: (user: AuthUser): AuthToken => ({
    accessToken: `token-${user.id}-${user.rol}`,
    tokenType: "Bearer",
    expiresIn: 3600,
  }),
  verify: () => {
    throw new UnauthorizedError("no se usa en estas pruebas");
  },
};

describe("AuthUseCase", () => {
  let usuarios: FakeUsuarios;
  let useCase: AuthUseCase;

  beforeEach(() => {
    usuarios = new FakeUsuarios();
    useCase = new AuthUseCase(usuarios, fakeHasher, fakeTokens);
  });

  it("registra con rol user, guarda el hash y devuelve token sin la contraseña", async () => {
    const result = await useCase.register({
      nombre: "Ana",
      email: "ana@retos.app",
      password: "Clave2026x",
    });

    assert.equal(result.user.rol, "user");
    assert.equal(result.token.accessToken, "token-1-user");
    assert.ok(!("passwordHash" in result.user));
    assert.ok(!JSON.stringify(result).includes("Clave2026x"));
    assert.equal(usuarios.rows[0]?.passwordHash, "hash:Clave2026x");
  });

  it("rechaza un email repetido con ConflictError (409)", async () => {
    await useCase.register({ nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });
    await assert.rejects(
      useCase.register({ nombre: "Otra", email: "ana@retos.app", password: "Clave2026x" }),
      ConflictError,
    );
  });

  it("inicia sesión con credenciales correctas", async () => {
    await useCase.register({ nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });
    const result = await useCase.login({ email: "ana@retos.app", password: "Clave2026x" });
    assert.equal(result.user.email, "ana@retos.app");
    assert.ok(result.token.accessToken);
  });

  it("da el mismo error si falla la contraseña o si el email no existe", async () => {
    await useCase.register({ nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });

    const wrongPassword = useCase.login({ email: "ana@retos.app", password: "Otra2026x" });
    const unknownEmail = useCase.login({ email: "nadie@retos.app", password: "Clave2026x" });

    await assert.rejects(wrongPassword, {
      name: "UnauthorizedError",
      message: INVALID_CREDENTIALS,
    });
    await assert.rejects(unknownEmail, { name: "UnauthorizedError", message: INVALID_CREDENTIALS });
  });

  it("no deja iniciar sesión a un usuario desactivado", async () => {
    await useCase.register({ nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });
    usuarios.rows[0]!.status = "INACTIVE";
    await assert.rejects(
      useCase.login({ email: "ana@retos.app", password: "Clave2026x" }),
      UnauthorizedError,
    );
  });

  it("getProfile responde 401 si el usuario ya no está activo", async () => {
    await useCase.register({ nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });
    assert.equal((await useCase.getProfile(1)).nombre, "Ana");
    usuarios.rows[0]!.status = "INACTIVE";
    await assert.rejects(useCase.getProfile(1), UnauthorizedError);
  });
});
