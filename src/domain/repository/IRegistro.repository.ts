import type {
  Registro,
  NuevoRegistro,
  ActualizarRegistro,
} from "../models/Registro.ts";

export interface IRegistroRepository {
  findByUsuarioRetoFecha(
    usuarioId: number,
    retoId: number,
    fecha: Date,
  ): Promise<Registro | null>;

  create(data: NuevoRegistro): Promise<Registro>;

  reactivate(id: number, nota: string | null): Promise<Registro>;

  findByIdAndUsuario(id: number, usuarioId: number): Promise<Registro | null>;

  findAllByUsuarioYReto(
    usuarioId: number,
    retoId: number,
  ): Promise<Registro[]>;

  update(
    id: number,
    usuarioId: number,
    data: ActualizarRegistro,
  ): Promise<Registro>;

  deactivate(id: number, usuarioId: number): Promise<void>;

  countActiveByUsuarioYReto(
    usuarioId: number,
    retoId: number,
  ): Promise<number>;
}