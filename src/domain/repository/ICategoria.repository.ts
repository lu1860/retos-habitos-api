export interface ICategoriaRepository {
  findActiveById(id: number): Promise<{ id: number } | null>;
}
