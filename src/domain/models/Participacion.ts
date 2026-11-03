import type { Estado } from "./Usuario.ts";

// Participación de un usuario en un reto (tabla de enlace "participaciones").
// La implementa B (retos); C la usa para aceptar o rechazar un registro diario.
export interface Participacion {
  id: number;
  usuarioId: number;
  retoId: number;
  fechaUnion: Date;
  status: Estado;
}
