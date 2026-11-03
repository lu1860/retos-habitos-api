import bcrypt from "bcrypt";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.ts";

const SALT_ROUNDS = 10;

/** Cifra y compara contraseñas con bcrypt (versiones asíncronas: no bloquean el servidor). */
export class BcryptService implements IPasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
