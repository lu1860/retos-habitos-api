# Lectura pública de categorías activas

`GET /api/categorias` no requiere JWT, cuerpo ni parámetros. Devuelve todas las
categorías con `status: ACTIVE`, ordenadas por `id` ascendente, sin paginación.

Respuesta HTTP 200:

```json
{ "data": [{ "id": 1, "nombre": "Nombre de categoría" }] }
```

El ejemplo muestra la forma del contrato, no datos garantizados de la base.
Cada elemento contiene únicamente `id` (entero) y `nombre` (texto). Sin categorías
activas devuelve HTTP 200 con `{ "data": [] }`. No expone descripción, estado,
fechas ni relaciones. Los fallos usan el manejador central de errores existente.

No hay operaciones administrativas: POST, PUT, PATCH y DELETE sobre esta ruta
o sus IDs no están registrados y responden 404 según la convención de la API.
No se modifica el esquema ni ningún registro. No hace falta un DTO porque la
consulta no recibe datos de entrada.

La parte C debe conservar este contrato público al añadir gestión administrativa.
Los puntos compartidos para coordinar son `ICategoriaRepository`,
`CategoriasPgRepository`, `dependencies.ts` y el registro de rutas; no se añadieron
operaciones de escritura ni se implementó CRUD administrativo.

Las pruebas automatizadas recorren HTTP local → controlador → caso de uso →
repositorio, sustituyendo la tabla Prisma. No prueban conectividad con Neon ni
consultan datos remotos.
