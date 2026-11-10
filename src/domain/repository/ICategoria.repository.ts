import type {
  Categoria,
  CategoriaActiva,
  NuevaCategoria,
  ActualizarCategoria,
} from "../models/Categoria.ts";

export interface ICategoriaRepository {
  findActiveById(id: number): Promise<{ id: number } | null>;

  findAllActive(): Promise<CategoriaActiva[]>;

  findById(id: number): Promise<Categoria | null>;

  create(data: NuevaCategoria): Promise<Categoria>;

  update(id: number, data: ActualizarCategoria): Promise<Categoria>;

  deactivate(id: number): Promise<void>;

  hasActiveRetos(id: number): Promise<boolean>;
}