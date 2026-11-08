import type { IImageService, ImageFile, StoredImage } from "../../domain/services/IImageService.ts";
import type { PaginatedResult } from "../../domain/models/Pagination.ts";
import type {
  CrearRetoInput,
  EditarRetoInput,
  Reto,
  RetoFiltros,
} from "../../domain/models/Reto.ts";
import type { AuthUser } from "../../domain/models/Usuario.ts";
import type { ICategoriaRepository } from "../../domain/repository/ICategoria.repository.ts";
import type { IRetoRepository } from "../../domain/repository/IReto.repository.ts";
import type { IUsuarioRepository } from "../../domain/repository/IUsuario.repository.ts";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/app.error.ts";
import { toPaginatedResult } from "../validation/pagination.ts";

export class RetosUseCase {
  constructor(
    private readonly retos: IRetoRepository,
    private readonly categorias: ICategoriaRepository,
    private readonly usuarios: IUsuarioRepository,
    private readonly images?: IImageService,
  ) {}

  async create(input: CrearRetoInput, user: AuthUser, image?: ImageFile): Promise<Reto> {
    user = await this.requireActiveUser(user.id);
    if (!(await this.categorias.findActiveById(input.categoriaId))) {
      throw new NotFoundError("Categoría no encontrada o inactiva");
    }
    return this.persistImage(image, (imagenUrl) =>
      this.retos.create({
        imagenUrl,
        nombre: input.nombre,
        descripcion: input.descripcion,
        duracionDias: input.duracionDias,
        categoriaId: input.categoriaId,
        creadorId: user.id,
        esOficial: user.rol === "admin",
      }),
    );
  }

  async update(
    id: number,
    input: EditarRetoInput,
    user: AuthUser,
    image?: ImageFile,
  ): Promise<Reto> {
    user = await this.requireActiveUser(user.id);
    const reto = await this.findById(id);
    if (reto.creadorId !== user.id && user.rol !== "admin") {
      throw new ForbiddenError("No tienes permiso para editar este reto");
    }
    if (
      input.categoriaId !== undefined &&
      !(await this.categorias.findActiveById(input.categoriaId))
    ) {
      throw new NotFoundError("Categoría no encontrada o inactiva");
    }
    return this.persistImage(image, (imagenUrl) =>
      this.retos.update(id, {
        imagenUrl,
        nombre: input.nombre,
        descripcion: input.descripcion,
        duracionDias: input.duracionDias,
        categoriaId: input.categoriaId,
      }),
    );
  }

  /** Solo un rechazo confirmado permite borrar la subida nueva. */
  private async persistImage(
    image: ImageFile | undefined,
    persist: (url?: string) => Promise<Reto>,
  ): Promise<Reto> {
    let stored: StoredImage | undefined;
    if (image) {
      if (!this.images) throw new Error("Servicio de imágenes no disponible");
      stored = await this.images.upload(image);
    }
    try {
      return await persist(stored?.publicUrl);
    } catch (error) {
      const rejected = this.retos.isConfirmedWriteRejection?.(error) === true;
      if (stored && rejected) {
        try {
          await this.images!.remove(stored.path);
        } catch {
          console.error("[retos] No se pudo limpiar una subida nueva; requiere reconciliación");
        }
      }
      throw error;
    }
  }

  async deactivate(id: number, user: AuthUser): Promise<void> {
    user = await this.requireActiveUser(user.id);
    const reto = await this.findById(id);
    if (reto.creadorId !== user.id && user.rol !== "admin") {
      throw new ForbiddenError("No tienes permiso para eliminar este reto");
    }
    await this.retos.deactivate(id);
  }

  private async requireActiveUser(id: number): Promise<AuthUser> {
    const user = await this.usuarios.findActiveById(id);
    if (!user) {
      throw new UnauthorizedError("La sesión ya no es válida. Inicia sesión de nuevo");
    }
    return user;
  }

  async list(filtros: RetoFiltros): Promise<PaginatedResult<Reto>> {
    const { rows, total } = await this.retos.findAll(filtros);
    return toPaginatedResult(rows, total, filtros.page, filtros.limit);
  }

  async findById(id: number): Promise<Reto> {
    const reto = await this.retos.findActiveById(id);
    if (!reto) throw new NotFoundError("Reto no encontrado");
    return reto;
  }
}
