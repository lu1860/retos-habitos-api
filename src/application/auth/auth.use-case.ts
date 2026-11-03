import type { AuthResult, Credenciales, DatosRegistro } from "../../domain/models/Auth.ts";
import type { UsuarioPublico } from "../../domain/models/Usuario.ts";
import type { IUsuarioRepository } from "../../domain/repository/IUsuario.repository.ts";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.ts";
import type { ITokenService } from "../../domain/services/ITokenService.ts";
import { ConflictError, UnauthorizedError } from "../errors/app.error.ts";
import { toAuthUser, toPublicUser } from "../usuarios/usuario.mapper.ts";

/** Mismo mensaje si falla el email o la contraseña: no se revela cuál de los dos estaba mal. */
export const INVALID_CREDENTIALS = "Email o contraseña incorrectos";

// Hash de un texto cualquiera. Si el email no existe se compara contra él, para que la respuesta
// tarde lo mismo que con un email real y no se pueda adivinar qué cuentas existen.
const DUMMY_HASH = "$2b$10$A/nRz4L4xl/PjJ/5H6VeouUZp3c4UKIkYqJTcCcntmCiAo8aeIcka";

/**
 * Casos de uso de autenticación: registrarse, iniciar sesión y consultar el perfil.
 * Depende solo de interfaces del dominio; las implementaciones se inyectan en interface/dependencies.ts.
 */
export class AuthUseCase {
  private readonly usuarios: IUsuarioRepository;
  private readonly hasher: IPasswordHasher;
  private readonly tokens: ITokenService;

  constructor(usuarios: IUsuarioRepository, hasher: IPasswordHasher, tokens: ITokenService) {
    this.usuarios = usuarios;
    this.hasher = hasher;
    this.tokens = tokens;
  }

  /** Crea una cuenta con rol "user" y devuelve el usuario con su token. Email repetido → 409. */
  async register(datos: DatosRegistro): Promise<AuthResult> {
    const existing = await this.usuarios.findByEmail(datos.email);
    if (existing) {
      throw new ConflictError("Ya existe una cuenta con ese email");
    }
    const usuario = await this.usuarios.create({
      nombre: datos.nombre,
      email: datos.email,
      passwordHash: await this.hasher.hash(datos.password),
      // Regla de negocio: el registro público nunca crea administradores (el admin sale del seed)
      rol: "user",
    });
    return { user: toPublicUser(usuario), token: this.tokens.generate(toAuthUser(usuario)) };
  }

  /** Verifica las credenciales y devuelve el usuario con su token. Cualquier falla → 401. */
  async login(credenciales: Credenciales): Promise<AuthResult> {
    const usuario = await this.usuarios.findByEmail(credenciales.email);
    const passwordOk = await this.hasher.compare(
      credenciales.password,
      usuario?.passwordHash ?? DUMMY_HASH,
    );
    if (!usuario || !passwordOk || usuario.status !== "ACTIVE") {
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }
    return { user: toPublicUser(usuario), token: this.tokens.generate(toAuthUser(usuario)) };
  }

  /** Perfil del usuario del token. Si fue desactivado después de iniciar sesión → 401. */
  async getProfile(userId: number): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.findActiveById(userId);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida. Inicia sesión de nuevo");
    }
    return toPublicUser(usuario);
  }
}
