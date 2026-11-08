# Validación real del CRUD de retos — parte B

## Resultado final

**P01–P12 completados: 12 pasos PASS.** En la reanudación hay **66 comprobaciones PASS, 0 FAIL y 0 BLOCKED**: 36 casos HTTP y 30 comprobaciones de persistencia, contrato o conservación. Son casos de evidencia, no un conteo de todas las solicitudes auxiliares. Los dos login se registran aparte de los 64 casos del diario del ejecutor. Los 19 casos reales de preparación y los fallos/bloqueos anteriores se conservan como historial, sin sumarlos a este balance.

Se crearon exactamente **dos retos, IDs 4 y 5**, ambos conservados en Neon con **status INACTIVE**, y se subieron exactamente **tres imágenes** al bucket autorizado. Los tres retos oficiales IDs 1, 2 y 3 permanecen idénticos a la instantánea anterior a las escrituras, incluidas sus fechas.

- Rama: `feat/retos-api`; HEAD: `38dca97`.
- Prefijo: `TEST-B-CRUD-20261108T055743558Z`.
- Ejecución del diario: **2026-11-08T06:22:44.946Z** a **2026-11-08T06:23:04.431Z**, UTC.
- Autorización: máximo dos retos propios y tres imágenes válidas, usuarios 2 y 3, categoría Hidratación ID 1. Sin permisos sobre datos ajenos.
- Backend: `http://localhost:3001`.
- HTTP real: PowerShell directo para login y Node.js fetch para CRUD; **no se ejecutó la colección completa mediante Postman Runner/Newman**.
- Verificación de base: SELECT en una transacción `BEGIN READ ONLY`, terminada con `ROLLBACK`. Las escrituras de datos se realizaron exclusivamente mediante la API.
- No se ejecutaron seed ni migraciones, ni se instalaron dependencias. No se modificaron código de API, módulos de otras integrantes ni configuración local.

## Verificaciones previas y autenticación

| Comprobación | Evidencia | Estado |
| --- | --- | --- |
| Git antes de escribir | feat/retos-api, 38dca97; solo colección Postman modificada y reporte nuevo | PASS |
| DATABASE_URL | Host exacto ep-frosty-union-bd3vytag-pooler.c-8.us-east-2.aws.neon.tech, base neondb | PASS |
| DIRECT_URL | Host exacto ep-frosty-union-bd3vytag.c-8.us-east-2.aws.neon.tech, base neondb | PASS |
| Producción excluida | Ninguna conexión apunta a ep-lively-hat-bd15fngo | PASS |
| Supabase | Project ID lagzpmjfclioiyzzqvqw, proyecto de desarrollo autorizado | PASS |
| Bucket | GET autenticado 200: retos, público, máximo 2 097 152 bytes, image/jpeg, image/png, image/webp | PASS |
| Backend | GET /api/retos HTTP 200 | PASS |
| Ausencia de duplicados | SELECT por el prefijo antes de crear: cero filas | PASS |
| Usuarios | SELECT: IDs 2 y 3, rol user, ACTIVE | PASS |
| Categoría | SELECT: ID 1, Hidratación, ACTIVE | PASS |
| Credencial ID 3 | Recuperada mediante PowerShell directo, ConvertTo-SecureString y PSCredential en el contexto Windows propietario | PASS |
| Login ID 2 | HTTP 200 con credencial legítima del seed local, sin ejecutar seed ni cambiar contraseña | PASS |
| Login ID 3 | HTTP 200 con la credencial recuperada; no se creó otra cuenta | PASS |
| Identidades | GET /api/auth/me de ambos: HTTP 200, IDs y roles esperados | PASS |

Los secretos y JWT se mantuvieron en memoria; los tokens se entregaron al ejecutor por su entrada estándar, sin argumentos con secretos ni archivos en texto plano. No se utilizó la ruta Node → PowerShell con Marshal. No se restablecieron contraseñas ni se fabricaron tokens.

Tiempos límite: conexión y consultas Neon 7 s, lectura de configuración de bucket 8 s, HTTP de ejecución 15 s, objetos y descargas públicas 10 s, login 10 s. Las operaciones fueron secuenciales, con comprobación antes de la siguiente escritura. Se mantuvo un diario de intentos para evitar repetir POST ante una respuesta incierta.

## Resultados P01–P12

| Paso | Operación y datos | HTTP esperado | HTTP obtenido y comprobación | Estado |
| --- | --- | --- | --- | --- |
| P01 | POST JSON /api/retos: nombre con sufijo -JSON, descripción Prueba controlada parte B JSON, duracionDias 7, categoriaId 1 | 201 | 201, ID 4, creador 2, esOficial false, ACTIVE, imagenUrl null; respuesta completa coincide con Neon | PASS |
| P02 | POST multipart /api/retos: sufijo -IMAGEN, descripción Prueba controlada parte B imagen, duración 7, categoría 1, imagen valida.png | 201 y 200 | 201, ID 5; imagen_url coincide con URL pública del PNG; objeto y descarga 200, MIME y bytes correctos | PASS |
| P03 | PATCH /api/retos/4: nombre -JSON-EDITADO, descripción Prueba controlada parte B editada, duración 14 y categoría 1 | 200 | 200; todos los campos y respuesta coinciden con Neon; creador y oficialidad conservados | PASS |
| P04 | PATCH multipart /api/retos/5: solo imagen valida.jpg | 200 y 200 | 200; nueva imagen_url JPEG, objeto y descarga 200; PNG conservado | PASS |
| P05 | PATCH multipart /api/retos/5: descripción Prueba controlada parte B WebP e imagen valida.webp | 200 y 200 | 200; nueva imagen_url WebP y descripción persistidas; objeto y descarga 200; PNG/JPEG conservados | PASS |
| P06 | PATCH nombre -NO-AUTORIZADO y DELETE /api/retos/4 por ID 3 | 403 / 403 | 403 / 403; SELECT antes/después de cada solicitud: fila completa sin cambios, incluido updated_at | PASS |
| P07 | PATCH /api/retos/4: duracionDias 0; luego status INACTIVE | 400 / 400 | 400 / 400; rechazo de DTO/campo protegido, fila sin cambios | PASS |
| P08 | PATCH /api/retos/4: duracionDias 14, sin JWT y con JWT deliberadamente inválido | 401 / 401 | 401 / 401; fila sin cambios | PASS |
| P09 | PATCH multipart /api/retos/5: texto disfrazado de PNG y archivo de 2 097 153 bytes | 400 / 400 | 400 / 400; fila e imagen_url sin cambios; los tres objetos propios conservan su contenido | PASS |
| P10 | GET detalles 4/5, categoría 1, texto del prefijo, filtros combinados y páginas 1/2 con limit=1 | 200 en todos | Todos 200; IDs, actividad, total, currentPage, limit y totalPages contrastados con SELECT | PASS |
| P11 | DELETE /api/retos/4 y /api/retos/5 con ID 2; búsqueda y listado | 204 / 204; GET 200 | Ambos 204 sin cuerpo; SELECT conserva filas INACTIVE; búsqueda por prefijo vacía y listado excluye 4/5 | PASS |
| P12 | GET y DELETE repetido de 4/5; PATCH duración 14 de ID 4 inactivo | 404 en todos | Todos 404; solicitudes rechazadas no cambian las filas | PASS |

Los detalles obtenidos durante P10 se contrastaron con todas las columnas de las filas de Neon, incluida imagen_url, mediante el mapeo snake_case/camelCase. Los errores HTTP comprobaron un campo error textual. La comprobación de imagen comparó bytes descargados con el archivo local y el Content-Type con el MIME esperado.

## Evidencia por caso de la reanudación

Las filas SELECT/CHECK no tienen HTTP: esperado y obtenido indican que se comprobó la igualdad o la condición descrita. Los casos de objeto incluyen GET autenticado de metadatos y GET público sin JWT. Los controles de conservación descargaron únicamente los tres paths propios conocidos; **no se inventarió el bucket global ni se inspeccionaron objetos ajenos**.

| Caso | Operación / endpoint | Esperado | Obtenido | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| AUTH2-LOGIN | POST `/api/auth/login (ID 2)` | 200 | 200 | PASS | Credencial local legítima; ID 2 user ACTIVE, AuthToken válido |
| AUTH3-LOGIN | POST `/api/auth/login (ID 3)` | 200 | 200 | PASS | DPAPI directo + PSCredential; ID 3 user ACTIVE, AuthToken válido |
| AUTH2-PERFIL | GET `/api/auth/me` | 200 | 200 | PASS |  |
| AUTH3-PERFIL | GET `/api/auth/me` | 200 | 200 | PASS |  |
| P01-HTTP | POST `/api/retos` | 201 | 201 | PASS |  |
| P01-NEON | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 4 |
| P02-HTTP | POST `/api/retos` | 201 | 201 | PASS |  |
| P02-NEON | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 5 |
| P02-OBJETO | GET `https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/df5d5156-4fa1-47f1-87fd-c7e1fbc31ec4.png` | 200 | 200 | PASS | GET autenticado de metadatos 200; descarga publica sin JWT; MIME y contenido iguales al archivo local |
| P03-HTTP | PATCH `/api/retos/4` | 200 | 200 | PASS |  |
| P03-NEON | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 4 |
| P04-HTTP | PATCH `/api/retos/5` | 200 | 200 | PASS |  |
| P04-NEON | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 5 |
| P04-OBJETO | GET `https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/d25725aa-6461-45a0-84d3-ea55b5faf023.jpg` | 200 | 200 | PASS | GET autenticado de metadatos 200; descarga publica sin JWT; MIME y contenido iguales al archivo local |
| P05-HTTP | PATCH `/api/retos/5` | 200 | 200 | PASS |  |
| P05-NEON | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 5 |
| P05-OBJETO | GET `https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/01403546-7577-4dbc-a387-ef99ea30b18b.webp` | 200 | 200 | PASS | GET autenticado de metadatos 200; descarga publica sin JWT; MIME y contenido iguales al archivo local |
| P06-PATCH | PATCH `/api/retos/4` | 403 | 403 | PASS |  |
| P06-PATCH-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P06-DELETE | DELETE `/api/retos/4` | 403 | 403 | PASS |  |
| P06-DELETE-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P07-DURACION | PATCH `/api/retos/4` | 400 | 400 | PASS |  |
| P07-DURACION-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P07-STATUS | PATCH `/api/retos/4` | 400 | 400 | PASS |  |
| P07-STATUS-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P08-SIN-JWT | PATCH `/api/retos/4` | 401 | 401 | PASS |  |
| P08-SIN-JWT-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P08-JWT-INVALIDO | PATCH `/api/retos/4` | 401 | 401 | PASS |  |
| P08-JWT-INVALIDO-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P09-CONTENIDO | PATCH `/api/retos/5` | 400 | 400 | PASS |  |
| P09-CONTENIDO-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P09-TAMANO | PATCH `/api/retos/5` | 400 | 400 | PASS |  |
| P09-TAMANO-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P09-OBJETOS | CHECK (GET objetos) `Neon development / evidencia propia` | coincide | coincide | PASS | Los tres paths propios conservan bytes; imagen_url sin cambios |
| P10-DETALLE-4 | GET `/api/retos/4` | 200 | 200 | PASS |  |
| P10-NEON-4 | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 4 |
| P10-DETALLE-5 | GET `/api/retos/5` | 200 | 200 | PASS |  |
| P10-NEON-5 | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | API coincide con todas las columnas de la fila 5 |
| P10-TEXTO | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z` | 200 | 200 | PASS |  |
| P10-TEXTO-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P10-COMBINADOS | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z&categoriaId=1` | 200 | 200 | PASS |  |
| P10-COMBINADOS-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P10-CATEGORIA | GET `/api/retos?categoriaId=1` | 200 | 200 | PASS |  |
| P10-CATEGORIA-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P10-PAGINA-1 | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z&page=1&limit=1` | 200 | 200 | PASS |  |
| P10-PAGINA-1-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P10-PAGINA-2 | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z&page=2&limit=1` | 200 | 200 | PASS |  |
| P10-PAGINA-2-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P11-DELETE-4 | DELETE `/api/retos/4` | 204 | 204 | PASS | Sin cuerpo |
| P11-NEON-4 | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila 4 conservada INACTIVE |
| P11-DELETE-5 | DELETE `/api/retos/5` | 204 | 204 | PASS | Sin cuerpo |
| P11-NEON-5 | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila 5 conservada INACTIVE |
| P11-EXCLUSION | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z` | 200 | 200 | PASS |  |
| P11-EXCLUSION-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs, status y paginacion coinciden con SELECT |
| P11-LISTADO | GET `/api/retos` | 200 | 200 | PASS |  |
| P11-LISTADO-CONTRATO | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | IDs propios excluidos del listado |
| P12-GET-4 | GET `/api/retos/4` | 404 | 404 | PASS |  |
| P12-DELETE-4 | DELETE `/api/retos/4` | 404 | 404 | PASS |  |
| P12-DELETE-4-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P12-GET-5 | GET `/api/retos/5` | 404 | 404 | PASS |  |
| P12-DELETE-5 | DELETE `/api/retos/5` | 404 | 404 | PASS |  |
| P12-DELETE-5-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| P12-PATCH | PATCH `/api/retos/4` | 404 | 404 | PASS |  |
| P12-PATCH-SIN-CAMBIOS | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Fila completa, incluido updated_at, sin cambios |
| FINAL-OFICIALES | SELECT/CHECK `Neon development / evidencia propia` | coincide | coincide | PASS | Filas 1,2,3 identicas antes/despues |
| FINAL-IMAGENES | CHECK (GET objetos) `Neon development / evidencia propia` | coincide | coincide | PASS | Los tres objetos siguen descargables tras DELETE logico |

## Filas finales y conservación

| ID | Nombre final | Creador | Categoría | Días | es_oficial | Estado | imagen_url |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| 4 | TEST-B-CRUD-20261108T055743558Z-JSON-EDITADO | 2 | 1 | 14 | false | INACTIVE | null |
| 5 | TEST-B-CRUD-20261108T055743558Z-IMAGEN | 2 | 1 | 7 | false | INACTIVE | [WebP público](https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/01403546-7577-4dbc-a387-ef99ea30b18b.webp) |

| ID | created_at UTC | updated_at UTC tras eliminación lógica |
| ---: | --- | --- |
| 4 | 2026-11-08T06:22:48.027Z | 2026-11-08T06:23:01.614Z |
| 5 | 2026-11-08T06:22:48.852Z | 2026-11-08T06:23:01.963Z |

- DELETE no eliminó físicamente las filas. Se conservarán como evidencia.
- El usuario normal de prueba **ID 3**, creado en la preparación, continúa como recurso de prueba; no fue desactivado ni modificado.
- No se modificaron otros usuarios, categorías, participaciones ni los retos oficiales. La instantánea de todas las columnas de los retos oficiales 1–3 fue idéntica antes y después de la ejecución.
- Los IDs 4 y 5 fueron capturados desde las creaciones propias verificadas. Ningún ID del listado preexistente se usó para PATCH o DELETE.

## Objetos que permanecen en Supabase

Proyecto `retos-habitos-dev`, Project ID `lagzpmjfclioiyzzqvqw`, bucket público `retos`.

| Paso | Objeto en bucket retos | MIME | Bytes | Estado / referencia |
| --- | --- | --- | ---: | --- |
| P02 | [df5d5156-4fa1-47f1-87fd-c7e1fbc31ec4.png](https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/df5d5156-4fa1-47f1-87fd-c7e1fbc31ec4.png) | image/png | 68 | HTTP 200; imagen reemplazada, conservada como evidencia |
| P04 | [d25725aa-6461-45a0-84d3-ea55b5faf023.jpg](https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/d25725aa-6461-45a0-84d3-ea55b5faf023.jpg) | image/jpeg | 286 | HTTP 200; imagen reemplazada, conservada como evidencia |
| P05 | [01403546-7577-4dbc-a387-ef99ea30b18b.webp](https://lagzpmjfclioiyzzqvqw.supabase.co/storage/v1/object/public/retos/01403546-7577-4dbc-a387-ef99ea30b18b.webp) | image/webp | 42 | HTTP 200; imagen_url final del reto 5 |

Se verificó GET público 200, Content-Type y contenido idéntico al archivo local en cada subida, antes/después de los rechazos de imagen y después de DELETE lógico. imagen_url del reto 5 conserva la URL pública del WebP. No se eliminaron PNG/JPEG reemplazados ni objetos anteriores o ajenos.

## Archivos locales de prueba y trazabilidad

Directorio temporal fuera del repositorio: `%TEMP%\\TEST-B-CRUD-20261108T055743558Z`.

| Archivo | Bytes | Uso real |
| --- | ---: | --- |
| valida.png | 68 | P02, creación multipart |
| valida.jpg | 286 | P04, reemplazo de imagen |
| valida.webp | 42 | P05, reemplazo y edición de texto |
| invalida.png | 37 | P09, texto renombrado a PNG, rechazado 400 |
| mayor-2MiB.png | 2 097 153 | P09, supera el máximo por un byte, rechazado 400 |

Los archivos válidos proceden de los fixtures locales de test/retos.images.routes.test.ts; se verificaron por bytes antes de la ejecución y mediante aceptación/descarga reales. No se incorporaron al repositorio.

Diarios conservados fuera de Git: evidence.json para la preparación, crud-execution.json para la detención anterior y **crud-execution-resume-20261108T062235293Z.json** para la ejecución completada. La credencial de ID 3 permanece cifrada en usuario-403.dpapi; no se documenta su contenido. No se eliminaron diarios ni evidencia histórica.

## Historial de preparación y bloqueos resueltos

### Casos reales anteriores a la reanudación

Los siguientes resultados corresponden a la preparación, cuando solo existían los tres retos oficiales activos. Se preservan como historial y no se mezclan con el conteo de 66 casos de la reanudación.

| Caso | Endpoint / operación | Esperado | Obtenido | Estado |
| --- | --- | --- | --- | --- |
| G01 | GET `/api/retos` | 200, contrato y IDs de Neon | 200; IDs 1, 2, 3; total 3, página 1, límite 10, totalPages 1 | PASS |
| G02 | GET `/api/retos/1` | 200, detalle activo | 200, ID y nombre coinciden con Neon; contrato válido | PASS |
| G03 | GET `/api/retos?categoriaId=1` | 200, solo categoría 1 | 200; ID 1, total 1 | PASS |
| G04 | GET `/api/retos?q=agua` | 200, coincidencia en nombre o descripción | 200; ID 1, total 1 | PASS |
| G05 | GET `/api/retos?categoriaId=1&q=agua` | 200, ambos filtros | 200; ID 1, total 1 | PASS |
| G06 | GET `/api/retos?page=1&limit=1` | 200, primera fila, totalPages 3 | 200; ID 1 y paginación correcta | PASS |
| G07 | GET `/api/retos?page=2&limit=1` | 200, segunda fila, totalPages 3 | 200; ID 2 y paginación correcta | PASS |
| G08 | GET `/api/retos?q=TEST-B-CRUD-20261108T055743558Z` | 200, vacío | 200; data vacío, total 0 y totalPages 0 | PASS |
| G09 | GET `/api/retos?page=0` | 400 | 400 y error textual | PASS |
| G10 | GET `/api/retos?limit=51` | 400 | 400 y error textual | PASS |
| G11 | GET `/api/retos?categoriaId=abc` | 400 | 400 y error textual | PASS |
| G12 | GET `/api/retos?q=a&q=b` | 400 | 400 y error textual | PASS |
| G13 | GET `/api/retos/abc` | 400 | 400 y error textual | PASS |
| G14 | GET `/api/retos/4` | 404, ID previamente confirmado ausente | 404 y error textual | PASS |
| A01 | POST `/api/auth/login`, credenciales locales del seed para ID 2 | 200, ID 2, rol user, token AuthToken | 200, identidad y objeto token válidos | PASS |
| A02 | GET `/api/auth/me`, token de A01 | 200, ID 2, rol user | 200, identidad correcta | PASS |
| A03 | POST `/api/auth/register`, única cuenta nueva | 201, ID distinto de 2, rol user | 201; ID 3, user, ACTIVE | PASS |
| A04 | POST `/api/auth/login`, cuenta nueva | 200, ID 3, rol user | 200, identidad correcta | PASS |
| D01 | SELECT usuarios por ID 3 y correo de la cuenta recién registrada | Una fila, user, ACTIVE | ID 3, user, ACTIVE en Neon development | PASS |

- Preparación: **19 PASS**. En ella se registró una sola cuenta adicional: ID 3, rol user, ACTIVE, correo de prueba test-b-403-20261108t055743558z@example.test. Su persistencia se comprobó por SELECT sin consultar contraseñas ni hashes.
- Antes de iniciar el backend, G01–G14 tuvieron **14 intentos BLOCKED por ECONNREFUSED**, con los mismos endpoints y códigos esperados de la tabla. Después de iniciar con npm.cmd run dev se repitieron y pasaron. No se omiten esos intentos del historial.
- El primer intento de P01–P12 se detuvo el **2026-11-08T06:10:04.375Z** por **DPAPI_NO_DISPONIBLE**. Se confirmó ETIMEDOUT, SIGTERM y ausencia de salida con límites de 10/15/20 s en la ruta anidada. Hubo **1 FAIL de preparación** y los **12 pasos BLOCKED**, sin llamadas de escritura de retos, filas nuevas ni imágenes.
- El diagnóstico posterior confirmó contexto Windows propietario, archivo DPAPI válido y lectura normal de PowerShell. La recuperación directa con PSCredential y el login ID 3 funcionaron, sin desactivar protecciones ni cambiar contraseñas.
- Tras la instrucción de reanudar, la ejecución documentada arriba resolvió esos bloqueos. El fallo local anterior no se atribuye a la API ni se oculta.

### Corrección de Postman

Archivo: docs/postman/retos-crud.postman_collection.json.

C01 detectó un **FAIL histórico de contrato en la colección**: esperaba data.token como string. El contrato real, confirmado en Auth.ts, jwt.service.ts y login real, devuelve un objeto AuthToken con accessToken, tokenType Bearer y expiresIn numérico.

La corrección autorizada ya realizada guarda **data.token.accessToken** en token, adminToken y otroUsuarioToken. Los tres scripts validan objeto, cadena no vacía, rol esperado, estado ACTIVE, tipo Bearer y expiración positiva; el prerrequisito sigue borrando token e ID anteriores antes del login. No se modificó el contrato de la API ni la guía Postman.

La validación local anterior pasó: JSON parseable, **105 scripts con sintaxis válida** y **27 escenarios sintéticos** (9 por login: válido, token string antiguo, accessToken ausente/vacío, tokenType incorrecto, expiración cero, rol incorrecto, usuario inactivo y HTTP 401). No equivale a Runner ni a 27 pruebas reales. C01 queda corregido; no se volvió a editar la colección durante esta reanudación y no se hizo login remoto de admin.

## Validación final de esta reanudación

| Comando / revisión | Resultado |
| --- | --- |
| npm.cmd test | **264 PASS, 0 FAIL**, 12 suites, sin omitidas. El intento dentro del sandbox no pudo cargar tsx por uv_os_get_passwd/ENOMEM; la repetición aprobada fuera del sandbox pasó. |
| npm.cmd run build | **PASS**, código 0: prisma generate y TypeScript; cliente generado local ignorado por Git. No se ejecutaron migraciones ni seed. |
| npm.cmd run lint | **PASS**, código 0. |
| git diff --check y reporte nuevo | **PASS**, sin errores de espacios; el reporte no seguido también se comprobó con git diff --no-index --check. |
| Revisión de secretos y estado Git | **PASS**: sin valores secretos de configuración, contraseñas locales, cadenas PostgreSQL ni JWT en los dos archivos. .env sigue ignorado y no está seguido por Git. Rama feat/retos-api, HEAD 38dca97; únicamente los dos archivos esperados pendientes. |

Archivos pendientes para el futuro noveno commit: **docs/pruebas/validacion-crud-real.md** (nuevo) y **docs/postman/retos-crud.postman_collection.json** (corrección de la fase previa). No se añadieron .env, credenciales ni JWT.

No hay pruebas pendientes dentro de P01–P12. Los casos adicionales de la colección completa, incluidos permisos de admin, no forman parte de esta ejecución y no se declaran aprobados. No hubo commit, push, cambio de rama, merge ni PR. **La API de participaciones no se comenzó; el trabajo se detiene para revisión.**
