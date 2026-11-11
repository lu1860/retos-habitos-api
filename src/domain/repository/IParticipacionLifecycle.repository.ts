import type { Participacion } from "../models/Participacion.ts";
import type { Reto } from "../models/Reto.ts";

export type JoinResult =
  | { kind: "created" | "reactivated"; participacion: Participacion }
  | { kind: "reto-not-found" | "unauthorized" | "already-active" };

export type LeaveResult =
  | "left"
  | "reto-not-found"
  | "unauthorized"
  | "not-active";

export interface ParticipacionConReto {
  participacion: Participacion;
  reto: Reto;
}

/** Cada operación valida y cambia el estado dentro de una sola transacción. */
export interface IParticipacionLifecycleRepository {
  join(usuarioId: number, retoId: number): Promise<JoinResult>;
  leave(usuarioId: number, retoId: number): Promise<LeaveResult>;
  findActiveByUsuario(usuarioId: number): Promise<ParticipacionConReto[]>;
}
