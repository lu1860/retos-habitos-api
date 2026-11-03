import type { Participacion } from "../models/Participacion.ts";

/**
 * Contrato de las participaciones (quién se unió a qué reto).
 *
 * Lo deja definido A para que B y C trabajen en paralelo:
 *  - B lo IMPLEMENTA en infrastructure/repository/participaciones.pg.repository.ts
 *    y lo usa en "unirse" y "salir" de un reto.
 *  - C lo USA en el caso de uso de registros: solo quien participa puede registrar el día.
 */
export interface IParticipacionRepository {
  /** Fila del usuario en ese reto, activa o no (hay una sola por la restricción @@unique). */
  findByUsuarioYReto(usuarioId: number, retoId: number): Promise<Participacion | null>;
  /** true si el usuario participa (ACTIVE) en el reto. */
  isActiveParticipant(usuarioId: number, retoId: number): Promise<boolean>;
  /** Crea la participación (unirse por primera vez). */
  create(usuarioId: number, retoId: number): Promise<Participacion>;
  /** Vuelve a ACTIVE una participación que estaba INACTIVE (unirse de nuevo). */
  reactivate(id: number): Promise<Participacion>;
  /** Pasa a INACTIVE (salir del reto). */
  deactivate(id: number): Promise<void>;
}
