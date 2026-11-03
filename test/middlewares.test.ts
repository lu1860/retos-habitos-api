import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { NextFunction, Request, RequestHandler, Response } from "express";

// Las variables se definen ANTES de cargar los módulos que las leen (por eso los import dinámicos).
// No hace falta una base de datos: estas pruebas no hacen consultas.
process.env["JWT_SECRET"] = "secreto-de-las-pruebas-automatizadas";
process.env["JWT_EXPIRES_IN"] = "1h";
process.env["DATABASE_URL"] ??= "postgresql://usuario:clave@localhost:5432/no-se-usa";

type AuthModule = typeof import("../src/interface/middlewares/auth.middleware.ts");
type ErrorModule = typeof import("../src/interface/middlewares/error.middleware.ts");
type ValidateModule = typeof import("../src/interface/middlewares/validate.middleware.ts");
type RegisterDtoModule = typeof import("../src/infrastructure/dtos/register.dto.ts");
type JwtModule = typeof import("../src/infrastructure/services/jwt.service.ts");
type ErrorsModule = typeof import("../src/application/errors/app.error.ts");

let auth: AuthModule;
let errors: ErrorModule;
let validation: ValidateModule;
let dtos: RegisterDtoModule;
let jwt: JwtModule;
let appErrors: ErrorsModule;

before(async () => {
  auth = await import("../src/interface/middlewares/auth.middleware.ts");
  errors = await import("../src/interface/middlewares/error.middleware.ts");
  validation = await import("../src/interface/middlewares/validate.middleware.ts");
  dtos = await import("../src/infrastructure/dtos/register.dto.ts");
  jwt = await import("../src/infrastructure/services/jwt.service.ts");
  appErrors = await import("../src/application/errors/app.error.ts");
});

const fakeRequest = (init: Partial<Request> = {}) =>
  ({ headers: {}, ...init }) as unknown as Request;

/** Respuesta falsa que guarda el código y el cuerpo que se enviaron. */
const fakeResponse = () => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
};

/** Ejecuta un middleware y devuelve si llamó a next(). Los errores se propagan (como en Express 5). */
const run = async (middleware: RequestHandler, req: Request): Promise<boolean> => {
  let called = false;
  const next: NextFunction = () => {
    called = true;
  };
  await middleware(req, fakeResponse() as unknown as Response, next);
  return called;
};

describe("authenticate", () => {
  it("responde 401 si no hay header Authorization", async () => {
    await assert.rejects(run(auth.authenticate, fakeRequest()), appErrors.UnauthorizedError);
  });

  it("responde 401 si el formato no es Bearer", async () => {
    const req = fakeRequest({ headers: { authorization: "Token abc" } });
    await assert.rejects(run(auth.authenticate, req), appErrors.UnauthorizedError);
  });

  it("responde 401 con un token inválido", async () => {
    const req = fakeRequest({ headers: { authorization: "Bearer no.es.token" } });
    await assert.rejects(run(auth.authenticate, req), appErrors.UnauthorizedError);
  });

  it("deja el usuario en req.user con un token válido", async () => {
    const { accessToken } = new jwt.JwtService().generate({
      id: 7,
      nombre: "Ana",
      email: "ana@retos.app",
      rol: "user",
    });
    const req = fakeRequest({ headers: { authorization: `Bearer ${accessToken}` } });
    assert.equal(await run(auth.authenticate, req), true);
    assert.deepEqual(req.user, { id: 7, nombre: "Ana", email: "ana@retos.app", rol: "user" });
  });
});

describe("authorize", () => {
  it("responde 403 si el rol no está permitido", async () => {
    const req = fakeRequest({ user: { id: 2, nombre: "U", email: "u@retos.app", rol: "user" } });
    await assert.rejects(run(auth.authorize("admin"), req), appErrors.ForbiddenError);
  });

  it("deja pasar al rol permitido", async () => {
    const req = fakeRequest({ user: { id: 1, nombre: "A", email: "a@retos.app", rol: "admin" } });
    assert.equal(await run(auth.authorize("admin"), req), true);
  });

  it("responde 401 si se usa sin authenticate antes", async () => {
    await assert.rejects(run(auth.authorize("admin"), fakeRequest()), appErrors.UnauthorizedError);
  });
});

describe("validateBody", () => {
  it("responde 400 con un mensaje por campo inválido", async () => {
    const req = fakeRequest({ body: { nombre: "A", email: "malo", password: "corta" } });
    await assert.rejects(run(validation.validateBody(dtos.RegisterDto), req), (error: unknown) => {
      assert.ok(error instanceof appErrors.BadRequestError);
      assert.deepEqual(Object.keys(error.details ?? {}).sort(), ["email", "nombre", "password"]);
      return true;
    });
  });

  it("limpia el body: recorta, pasa el email a minúsculas e ignora campos extra", async () => {
    const req = fakeRequest({
      body: { nombre: " Ana ", email: "ANA@Retos.app", password: "Clave2026x", rol: "admin" },
    });
    assert.equal(await run(validation.validateBody(dtos.RegisterDto), req), true);
    assert.deepEqual(req.body, { nombre: "Ana", email: "ana@retos.app", password: "Clave2026x" });
  });
});

describe("errorHandler", () => {
  const handle = (error: unknown) => {
    const res = fakeResponse();
    errors.errorHandler(error, fakeRequest(), res as unknown as Response, () => undefined);
    return res;
  };

  it("traduce cada error de aplicación a su código HTTP", () => {
    assert.equal(handle(new appErrors.BadRequestError("x")).statusCode, 400);
    assert.equal(handle(new appErrors.UnauthorizedError("x")).statusCode, 401);
    assert.equal(handle(new appErrors.ForbiddenError("x")).statusCode, 403);
    assert.equal(handle(new appErrors.NotFoundError("x")).statusCode, 404);
    assert.equal(handle(new appErrors.ConflictError("x")).statusCode, 409);
  });

  it("nunca devuelve el stack trace de un error inesperado", (t) => {
    t.mock.method(console, "error", () => undefined);
    const res = handle(new Error("detalle interno que no debe salir"));
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: "Error interno del servidor" });
  });
});
