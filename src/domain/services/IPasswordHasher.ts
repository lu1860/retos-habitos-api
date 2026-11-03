// Contrato para cifrar y comparar contraseñas. Implementación: infrastructure/services/bcrypt.service.ts
export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
