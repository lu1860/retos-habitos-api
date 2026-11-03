// Formato de todas las respuestas de lista, tal como lo pide el documento del curso.

export interface Pagination {
  total: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

/** Lo que devuelve un repositorio al listar: una página de filas y el total sin paginar. */
export interface Page<T> {
  rows: T[];
  total: number;
}
