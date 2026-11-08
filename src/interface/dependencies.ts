import { AuthUseCase } from "../application/auth/auth.use-case.ts";
import { RetosUseCase } from "../application/retos/retos.use-case.ts";
import { UsuariosUseCase } from "../application/usuarios/usuarios.use-case.ts";
import { UsuariosPgRepository } from "../infrastructure/repository/usuarios.pg.repository.ts";
import { RetosPgRepository } from "../infrastructure/repository/retos.pg.repository.ts";
import { BcryptService } from "../infrastructure/services/bcrypt.service.ts";
import { JwtService } from "../infrastructure/services/jwt.service.ts";

/**
 * Inyección de dependencias: el ÚNICO lugar donde se crean las implementaciones de infrastructure
 * y se entregan a los casos de uso. Los casos de uso solo conocen las interfaces del dominio.
 *
 * Para un módulo nuevo (retos, categorías, registros): crear aquí su repositorio y su caso de uso,
 * y exportar el caso de uso para su controlador.
 */
const usuariosRepository = new UsuariosPgRepository();
const passwordHasher = new BcryptService();

export const tokenService = new JwtService();
export const authUseCase = new AuthUseCase(usuariosRepository, passwordHasher, tokenService);
export const usuariosUseCase = new UsuariosUseCase(usuariosRepository);
export const retosUseCase = new RetosUseCase(new RetosPgRepository());
