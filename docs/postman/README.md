# Postman — parte B: CRUD de retos

Contrato revisado en `feat/retos-api`, commit `9d1a002`. Esta entrega solo añade documentación y artefactos Postman: no ejecuta solicitudes, migraciones ni seed. La colección contiene **64 solicitudes**, incluidas dos plantillas de escritura omitidas intencionalmente por seguridad.

## Importar y configurar

1. En Postman de escritorio actualizado, usa **Import** para importar `retos-crud.postman_collection.json` y `retos-dev.postman_environment.json`.
2. Selecciona el entorno **Retos — desarrollo sin secretos**. Se requiere soporte de `pm.execution.skipRequest()`; no ejecutes con clientes antiguos que no lo admitan.
3. Conserva `baseUrl=http://localhost:3001` (sin `/api` y sin barra final). Usa exclusivamente un entorno de pruebas autorizado. No apuntes esta colección a producción.
4. Rellena los valores locales del entorno según la tabla. No publiques ni sincronices credenciales, tokens o exportaciones con valores reales. El tipo `secret` oculta valores en la interfaz, pero no garantiza que una exportación los elimine.

| Variables                                                       | Preparación y propósito                                                                                                                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`                                                       | Origen del backend; las peticiones ya incluyen `/api`.                                                                                                                                          |
| `token`, `adminToken`, `otroUsuarioToken`                       | JWT del creador `user`, administrador `admin` y otro `user` distinto. Los tres login los guardan automáticamente si el rol coincide.                                                            |
| `email`, `password`                                             | Credenciales locales del creador de prueba.                                                                                                                                                     |
| `adminEmail`, `adminPassword`                                   | Credenciales locales de un administrador de pruebas ya existente.                                                                                                                               |
| `otroUsuarioEmail`, `otroUsuarioPassword`                       | Credenciales locales de otro usuario de pruebas, distinto del creador y sin rol admin.                                                                                                          |
| `usuarioId`, `adminUsuarioId`, `otroUsuarioId`                  | Identidades guardadas desde login; no sustituirlas manualmente.                                                                                                                                 |
| `categoriaId`                                                   | Entero positivo de una categoría **existente y ACTIVE**, dentro del rango Int de PostgreSQL.                                                                                                    |
| `textoBusqueda`                                                 | Texto de hasta 100 caracteres; por defecto `Postman`. Para otras búsquedas, codifica caracteres reservados de URL.                                                                              |
| `retoId`, `retoAdminId`, `retoImagenId`                         | IDs de los tres fixtures propios: JSON de usuario, JSON de admin y multipart de usuario. Se capturan desde `data.id`. No introducir IDs compartidos.                                            |
| `retoIdPropio`, `retoAdminIdPropio`, `retoImagenIdPropio`       | Marcadores automáticos que deben coincidir con los respectivos IDs para habilitar modificaciones. No editarlos ni copiarlos de otras ejecuciones.                                               |
| `retoIdInactivo`, `retoAdminIdInactivo`, `retoImagenIdInactivo` | Marcadores automáticos tras DELETE 204; habilitan las comprobaciones de inactividad.                                                                                                            |
| `retoInexistenteId`                                             | ID positivo, dentro de Int, que el responsable haya confirmado como inexistente. Solo se usa efectivamente en GET. No se presupone que un número grande esté libre.                             |
| `categoriaInexistenteId`                                        | ID positivo dentro de Int, confirmado como inexistente o inactivo. Si corresponde a una categoría activa, el POST de este caso podría crear un reto: confirmar antes de ejecutar.               |
| `passwordIncorrecta`                                            | Valor local deliberadamente distinto de la contraseña válida, no vacío; permite probar login 401.                                                                                               |
| `jwtInvalido`                                                   | Cadena de prueba `no-es-un-jwt`, sin secreto real.                                                                                                                                              |
| `habilitarEscrituras`                                           | Por defecto `NO`. Solo tras preparar y revisar el entorno, establecer localmente `SI_SOLO_DATOS_PRUEBA` para habilitar POST/PATCH/DELETE, incluidos login y errores. Volver a `NO` al terminar. |

No existen valores reales de contraseñas, tokens, claves ni conexiones en estos JSON. No importes el `.env` del backend a Postman. El repositorio de trabajo ya contiene un `.env` local previo a esta entrega; no se ha leído, modificado ni añadido a Git.

## Preparar backend, cuentas y categorías

Con las dependencias ya disponibles y Node.js >=22, ejecutar desde la raíz:

```powershell
npm run dev
```

El arranque requiere `DATABASE_URL` y `JWT_SECRET` configurados de forma privada en el backend; `PORT=3001` es el valor por defecto. `JWT_EXPIRES_IN` tiene valor por defecto `1h`. No se necesita instalar dependencias, generar clientes, ejecutar migraciones ni seed para esta revisión. Si el entorno local carece de los requisitos, completar esa preparación por separado antes de ejecutar la colección.

Para imágenes, el backend requiere además `SUPABASE_URL` HTTPS, `SUPABASE_SECRET_KEY` y `SUPABASE_STORAGE_BUCKET=retos`, con bucket y permisos apropiados ya preparados por el responsable. Estas claves pertenecen al servidor, nunca al entorno Postman. La inicialización del cliente Storage es diferida.

Utiliza dos cuentas de pruebas activas con rol `user` y una cuenta de pruebas activa con rol `admin`. Solicita al responsable cuentas existentes. Si se autoriza crear cuentas de pruebas más adelante, la ruta real es `POST /api/auth/register`, con JSON `{ "nombre": "...", "email": "...", "password": "..." }`: nombre de 2 a 100 caracteres, email válido hasta 150 y contraseña de 8 a 72 caracteres con mayúscula, minúscula y número. No se incluye registro en el recorrido para evitar crear cuentas repetidas. El registro público siempre asigna `user`; enviar un rol no crea un administrador. No modificar seed ni intentar elevar roles; si no hay admin de pruebas disponible, dejar sus casos pendientes.

La ruta real de login es `POST /api/auth/login`, con `email` y `password`. Devuelve `{ data: { user, token } }`. Ejecutar los tres login de la carpeta Autenticación y después Perfil del creador (`GET /api/auth/me`). El login borra su token anterior antes de intentar obtener uno nuevo. No imprime tokens en scripts. Confirma que los dos usuarios tienen IDs diferentes. Los JWT expiran: ante 401 inesperado, repetir login.

**No hay endpoint de categorías montado en el router.** Obtener `categoriaId` de una categoría activa confirmada por el responsable mediante una consulta de solo lectura autorizada a los datos existentes. Un reto listado permite conocer un `categoriaId`, pero no demuestra que esa categoría siga activa. No inventar `/api/categorias`. Solicitar también confirmación de una categoría inexistente/inactiva y de un ID de reto inexistente si se desean ejecutar esos casos. No modificar datos para fabricarlos.

## Archivos para imágenes

En cada petición multipart, abrir **Body → form-data**, localizar `imagen` de tipo **File** y seleccionar el archivo local. Las rutas se entregan vacías; no hay archivos adjuntos ni rutas personales. No añadir manualmente `Content-Type`: Postman debe generar el boundary. `duracionDias` y `categoriaId` son campos Text con enteros decimales positivos sin espacios, signos, exponentes o decimales.

Preparar archivos locales sin contenido sensible:

| Caso                 | Archivo a seleccionar                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST/PATCH válidos   | JPG/JPEG, PNG o WebP real con extensión correspondiente y tamaño de 1 a **2 097 152 bytes**, inclusive. Seleccionar otra imagen válida para el reemplazo. |
| Contenido inválido   | Archivo de texto no vacío renombrado a `.png`, menor de 2 MiB. El MIME declarado no basta: el servicio inspecciona los bytes.                             |
| Extensión incorrecta | PNG real renombrado a `.jpg`, menor de 2 MiB.                                                                                                             |
| Más de 2 MiB         | Archivo local de **2 097 153 bytes o más**; el parser debe rechazarlo con 400 antes de acceder a Storage.                                                 |

Los casos con archivo se omiten si no hay selección. Verificar en la consola de Postman cualquier omisión; una omisión **no es una prueba aprobada**. En Runner, comprobar que el agente de escritorio puede leer los archivos seleccionados. No subirlos a espacios compartidos para esta revisión.

## Orden de ejecución por fases

**No ejecutar toda la colección en su orden visual**, porque la carpeta Eliminación lógica aparece antes de Imágenes y Validaciones y permisos, según la organización solicitada. Ejecutar carpetas o selecciones en estas fases:

1. Preparar cuentas, categorías, archivos y variables. Revisar `baseUrl`; habilitar escrituras solo en el entorno de pruebas autorizado.
2. **Autenticación**: tres login y perfil. Los dos casos inválidos son independientes; configurar `passwordIncorrecta` antes de probar credenciales incorrectas.
3. **Creación de retos**: crear ambos fixtures JSON. Guardan IDs únicamente con HTTP 201, nombre único generado para la petición e identidad del creador esperada. Cada petición de creación limpia su ID anterior: no repetirla sin limpiar el fixture anterior, o se perderá su referencia local.
4. **Consultas de retos**: listar, filtrar, paginar y consultar el detalle del fixture. Las listas pueden estar vacías y siguen siendo válidas. No capturar IDs de listados para editar o borrar.
5. **Edición de retos**: creador y admin sobre el fixture del creador. El admin puede editar un reto ajeno sin cambiar su creador ni convertirlo en oficial.
6. **Imágenes**: crear el fixture multipart, PATCH solo imagen y PATCH con texto e imagen; luego los rechazos de contenido, extensión, tamaño y número multipart. Seleccionar el archivo correcto **en cada petición**, incluidos los casos inválidos.
7. **Validaciones y permisos**: ejecutar con los fixtures todavía activos. Otro usuario debe recibir 403 tanto en PATCH como DELETE. No se usan retos de otras integrantes. Las dos plantillas PATCH/DELETE de ID inexistente se omiten siempre: un ID arbitrario no es seguro para escrituras si llega a existir. La cobertura ejecutable de 404 para esas operaciones usa el fixture inactivo en la fase siguiente.
8. **Eliminación lógica**, en orden interno: DELETE de cada fixture (204), GET del mismo (404), DELETE repetido y PATCH del primer inactivo (404), y listado sin inactivos. Los IDs se conservan para comprobar 404; no sustituirlos por otros. Si se omitió el admin o las imágenes, sus solicitudes dependientes se omitirán por falta de ID capturado.
9. Volver `habilitarEscrituras` a `NO`. Guardar resultados sin credenciales. Al repetir el recorrido, retirar los IDs y marcadores de ejecuciones anteriores una vez verificada su limpieza. Si una creación respondió de forma incierta o falló la captura, pedir una revisión autorizada de solo lectura por el nombre único de la petición antes de repetirla.

Los marcadores evitan errores accidentales de selección: no constituyen una barrera de seguridad frente a cambios manuales del entorno. No rellenarlos para saltarse los controles. Ante fallo inesperado, detener la fase y revisar antes de continuar. Una petición que debía fallar pero devuelve 2xx puede haber escrito datos; no continuar ciegamente con Runner.

DELETE cambia `status` a `INACTIVE`, no elimina físicamente filas. Al reemplazar una imagen o desactivar un reto, **las imágenes anteriores no se borran de Storage**. Este recorrido puede dejar objetos de pruebas; no incluye eliminación de objetos ni reconciliación automática. Cualquier limpieza de Storage debe acordarse por separado y comprobar referencias antes de borrar.

## Contrato y resultados

| Operación               | Respuesta verificada                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/retos`        | 200 `{ data: Reto[], pagination: { total, currentPage, limit, totalPages } }`. Solo ACTIVE, orden por ID ascendente. `page=1`, `limit=10` por defecto; máximo 50. |
| `GET /api/retos/:id`    | 200 `{ data: Reto }`; 404 si no existe o está inactivo. Es pública.                                                                                               |
| `POST /api/retos`       | 201 `{ data: Reto }`, requiere JWT. JSON o multipart.                                                                                                             |
| `PATCH /api/retos/:id`  | 200 `{ data: Reto }`, requiere creador o admin. JSON parcial o multipart, incluso solo imagen.                                                                    |
| `DELETE /api/retos/:id` | 204 sin cuerpo; requiere creador o admin. Repetir sobre inactivo devuelve 404.                                                                                    |

`Reto` contiene `id`, `nombre`, `descripcion`, `imagenUrl` (string o null), `duracionDias`, `esOficial`, `categoriaId`, `creadorId`, `status`, `createdAt` y `updatedAt`. No incluye objetos anidados de creador/categoría. Los scripts verifican tipos, fechas, actividad, paginación y, donde procede, filtros, cambios, oficialidad e identidad. Una URL de imagen devuelta no prueba por sí sola que el objeto sea descargable: no se realiza un GET adicional a Supabase.

Los únicos campos editables son `nombre` (no vacío, máximo 120), `descripcion` (no vacía, máximo 1000), `duracionDias` y `categoriaId` (enteros de 1 a 2 147 483 647). POST requiere los cuatro; PATCH exige al menos uno salvo que incluya un archivo. **POST ignora campos extra; PATCH los rechaza**. No enviar `imagenUrl`, `creadorId`, `esOficial` ni `status` como si fueran editables. `esOficial` se calcula según el rol del creador, nunca a partir del body.

Errores reales del middleware: `{ error: "mensaje", details?: { campo: "mensaje" } }`. Los scripts no exigen textos literales ni `details` para todos los errores. 400 corresponde a DTO, IDs/query o archivos inválidos; 401 a JWT ausente/inválido/vencido o credenciales incorrectas; 403 a otro creador no admin; 404 a reto inexistente/inactivo o categoría inexistente/inactiva. Un 503 indica indisponibilidad de base de datos y un 500 puede indicar configuración/Storage u otro fallo interno; ninguno equivale al 400 esperado. La existencia y autorización del reto y la categoría se comprueban antes de validar/subir el contenido de la imagen en el servicio; el límite multipart se aplica antes.

## Cobertura y revisión sin conexión

| Carpeta                 | Solicitudes |
| ----------------------- | ----------: |
| Autenticación           |           6 |
| Consultas de retos      |           5 |
| Creación de retos       |           2 |
| Edición de retos        |           2 |
| Eliminación lógica      |           9 |
| Imágenes                |          10 |
| Validaciones y permisos |          30 |
| **Total**               |      **64** |

Incluye las cinco operaciones CRUD, JSON/multipart, filtros por categoría y texto combinados, paginación, valores inválidos, JWT, roles y propiedad, baja lógica, DTO, categoría inválida y formatos/tamaños de imagen. De las 64, dos escrituras sobre ID inexistente son plantillas permanentemente omitidas; las otras 62 requieren sus respectivos datos y archivos para ejecutarse. No se afirma que se hayan ejecutado ni aprobado.

- **Sin conexión y sin backend:** importar, revisar URLs/cuerpos/scripts, comprobar JSON, organización y ausencia de secretos. Esto no valida respuestas HTTP ni conectividad real.
- **Backend local sin acceso a Neon/Storage:** 400 de query/ID en GET, 401 por ausencia de JWT y ciertos errores de DTO/parser pueden responder sin consultar servicios remotos, siempre que el backend arranque con su configuración requerida. Los casos protegidos de DTO requieren un JWT válido. No confundir esto con ejecutar sin backend.
- **Neon real del entorno configurado:** login/perfil, consultas válidas, creación/edición/baja y validación de existencia/propiedad/categoría. Aunque la URL sea localhost, los datos pueden estar en Neon.
- **Neon y Supabase reales:** subida y reemplazo válidos de imágenes. El contenido inválido y la extensión incorrecta requieren pasar primero las comprobaciones en Neon, pero no deberían subir objetos. El exceso de tamaño se rechaza en el parser y no requiere acceso a Storage. Sin configuración válida del servicio de imágenes, los casos que llegan a él pueden devolver 500 antes de validar el archivo.

La última validación automatizada reportada del backend fue de 264 pruebas aprobadas; no sustituye las pruebas reales de esta colección. Para esta entrega se realiza revisión estática local, sin arrancar el backend ni efectuar peticiones a localhost, Neon o Supabase.
