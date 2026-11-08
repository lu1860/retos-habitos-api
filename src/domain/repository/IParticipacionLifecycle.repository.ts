import type { Participacion } from "../models/Participacion.ts";

export type JoinResult =
  | { kind: "created" | "reactivated"; participacion: Participacion }
  | { kind: "reto-not-found" | "unauthorized" | "already-active" };
export type LeaveResult = "left" | "reto-not-found" | "unauthorized" | "not-active";

/** Cada operación valida y cambia el estado dentro de una sola transacción. */
export interface IParticipacionLifecycleRepository {
  join(usuarioId: number, retoId: number): Promise<JoinResult>;
  leave(usuarioId: number, retoId: number): Promise<LeaveResult>;
}
