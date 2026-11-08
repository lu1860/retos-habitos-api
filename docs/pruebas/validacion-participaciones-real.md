# Validación real de participaciones — parte B

Ejecución: `TEST-B-PART-20261108T065042843Z`.
Inicio: `2026-11-08T06:50:42.845Z`. Fin: `2026-11-08T06:51:00.664Z`.
Resultado: **68 comprobaciones PASS, 0 FAIL, 0 BLOCKED** en el ejecutor real.
Las 68 incluyen verificaciones HTTP, identidad, configuración y persistencia; no son 68 solicitudes HTTP.

## Entorno y preparación

- Rama: `feat/retos-api`; HEAD: `38dca97ca3ab324a8a7a8020d84d0e43b5eb5e9e`.
- Backend iniciado desde este repositorio mediante `npm.cmd run dev`, en `http://localhost:3001`.
- `GET /api/health`: esperado 200 y base de datos `ok`; obtenido 200 y `ok`: PASS.
- `DATABASE_URL` y `DIRECT_URL`: guardas de hostname development PASS, endpoint `ep-frosty-union-bd3vytag`, con pooler y conexión directa respectivamente. No se incluyen cadenas de conexión.
- Las consultas de evidencia se ejecutaron en transacciones `BEGIN READ ONLY` terminadas con `ROLLBACK`.
- SELECT previo: usuarios 2 y 3 con rol `user`, estado `ACTIVE`; categoría 1 `ACTIVE`: PASS.
- SELECT previo del prefijo `TEST-B-PART-`: cero retos: PASS.
- Login HTTP legítimo de ID 2 con la credencial existente del seed: 200; identidad 2, rol `user`: PASS. No se ejecutó el seed.
- Login HTTP legítimo de ID 3: 200; identidad 3, rol `user`: PASS. Credencial recuperada con PowerShell directo, `ConvertTo-SecureString` y `PSCredential`; el objeto JSON recuperado se procesó en memoria.
- No se utilizó Node → PowerShell con Marshal, ni se cambiaron contraseñas, ni se crearon usuarios.
- Ambos logins y todas las verificaciones previas pasaron antes de crear el reto.
- Los resultados reales de POST/DELETE confirman que las rutas de participaciones estaban registradas en el backend ejecutado.

## Datos autorizados creados

Un único reto, ID **6**:

```json
{
  "nombre": "TEST-B-PART-20261108T065042843Z",
  "descripcion": "Validacion real de participaciones parte B",
  "duracionDias": 1,
  "categoriaId": 1
}
```

SELECT posterior a la creación confirmó `creador_id=2`, `categoria_id=1`, `imagen_url=NULL`, `es_oficial=false` y `status=ACTIVE`.
Se crearon exclusivamente dos participaciones: ID 1 para usuario 2, e ID 2 para usuario 3, ambas en reto 6.

## Resultados HTTP ejecutados

Salvo donde se indica otra ruta, se utilizó `/api/retos/6/participantes`.
Los códigos de parejas concurrentes se muestran ordenados, sin atribuir orden de llegada.

| Caso | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| POST `/api/retos`, creador ID 2, sin imagen | 201 | 201 | PASS |
| Dos POST simultáneos ID 2, primera unión | 201 y 409 | 201 y 409 | PASS |
| POST duplicado ID 2 | 409 | 409 | PASS |
| DELETE ID 3 con `usuarioId:2`, sin participación propia | 404 | 404 | PASS |
| POST ID 3 con `usuarioId:2`, `usuario_id:2` y `user.id:2` | 201, usuarioId 3 | 201, usuarioId 3 | PASS |
| DELETE ID 3 con `usuarioId:2` | 204, vacío | 204, vacío | PASS |
| DELETE ID 2 | 204, vacío | 204, vacío | PASS |
| DELETE repetido ID 2 | 404 | 404 | PASS |
| POST reactivación ID 2 | 200 | 200 | PASS |
| Dos DELETE simultáneos ID 2 | 204 y 404 | 204 y 404 | PASS |
| Dos POST simultáneos para reactivar ID 2 | 200 y 409 | 200 y 409 | PASS |
| DELETE final ID 2 | 204 | 204 | PASS |
| POST sin JWT | 401 | 401 | PASS |
| POST con JWT inválido | 401 | 401 | PASS |
| POST con JWT vencido | 401 | 401 | PASS |
| DELETE sin JWT | 401 | 401 | PASS |
| DELETE con JWT inválido | 401 | 401 | PASS |
| DELETE con JWT vencido | 401 | 401 | PASS |
| POST ID `abc` | 400 | 400 | PASS |
| POST ID `0` | 400 | 400 | PASS |
| POST ID `-1` | 400 | 400 | PASS |
| POST ID `1.5` | 400 | 400 | PASS |
| POST ID `2147483648` | 400 | 400 | PASS |
| POST ID `9007199254740992` | 400 | 400 | PASS |
| DELETE ID `abc` | 400 | 400 | PASS |
| DELETE ID `0` | 400 | 400 | PASS |
| DELETE ID `-1` | 400 | 400 | PASS |
| DELETE ID `1.5` | 400 | 400 | PASS |
| DELETE ID `2147483648` | 400 | 400 | PASS |
| DELETE ID `9007199254740992` | 400 | 400 | PASS |
| POST reto inexistente 2147483647, confirmado por SELECT | 404 | 404 | PASS |
| DELETE reto inexistente 2147483647 | 404 | 404 | PASS |
| DELETE `/api/retos/6`, usuario creador ID 2 | 204 | 204 | PASS |
| POST sobre reto 6 ya INACTIVE | 404 | 404 | PASS |
| DELETE participación sobre reto 6 ya INACTIVE | 404 | 404 | PASS |

El JWT vencido se firmó en memoria con HS256 y expiración pasada, a partir de la identidad autenticada de ID 2. No se guardaron JWT ni contraseñas en el ejecutor, diario o repositorio.

## Concurrencia real y persistencia

Se lanzaron dos solicitudes HTTP independientes por pareja usando `Promise.allSettled`, sin reintentos. Se completaron las tres parejas:

| Pareja | Duración conjunta | Resultados |
| --- | --- | --- |
| Primera inscripción | 1159 ms | 201 / 409 |
| Abandono | 1163 ms | 204 / 404 |
| Reactivación | 938 ms | 200 / 409 |

Las duraciones corresponden a solicitudes completas, no al tiempo medido de espera del bloqueo SQL. No se instrumentaron `pg_locks`, tiempos individuales de transacción ni una prueba de carga sostenida. No se observaron errores HTTP de bloqueo o timeout en estas parejas.

La implementación revisada utiliza transacciones cortas Prisma y `SELECT status FROM retos WHERE id = $1 FOR UPDATE` parametrizado; valida ACTIVE después del bloqueo. Las actualizaciones condicionan el estado previo y permanece la restricción única usuario-reto. Un mismo reto serializa estas operaciones; una carga mayor puede producir esperas o timeouts. Estos resultados no demuestran ausencia de todos los posibles intercalados concurrentes.

Consultas ejecutadas, con `6` como parámetro `$1`:

```sql
SELECT id, usuario_id, reto_id, fecha_union::text AS fecha_union, status
FROM participaciones
WHERE reto_id = $1
ORDER BY usuario_id;

SELECT usuario_id, reto_id, count(*)::int AS n
FROM participaciones
WHERE reto_id = $1
GROUP BY usuario_id, reto_id
HAVING count(*) > 1;
```

La consulta de duplicados devolvió **cero filas**. El total global de participaciones aumentó exactamente en dos filas.
Tras el DELETE ajeno de ID 3, la fila de ID 2 se comparó con su captura original y permaneció intacta y ACTIVE.
La respuesta de primera inscripción contuvo exclusivamente las claves camelCase `fechaUnion`, `id`, `retoId`, `status`, `usuarioId`.
La reactivación secuencial y la concurrente conservaron ID **1** y la fecha SQL exacta **2026-11-08 06:50:47.798+00**; también se comparó `fechaUnion` de la respuesta HTTP original y de reactivación.

Estado final observado por SELECT, incluso después de rechazar operaciones sobre el reto INACTIVE:

| Participación ID | Usuario ID | Reto ID | fecha_union (UTC) | Estado |
| --- | --- | --- | --- | --- |
| 1 | 2 | 6 | 2026-11-08 06:50:47.798+00 | INACTIVE |
| 2 | 3 | 6 | 2026-11-08 06:50:50.671+00 | INACTIVE |

SELECT del reto 6 después de su baja: `INACTIVE`. Se conservaron las tres filas como evidencia; no se ejecutaron borrados físicos.
Se compararon todas las columnas de los retos 1–5 mediante `SELECT *` antes y después: **sin cambios**.

## Validación local y alcance

| Comando | Resultado |
| --- | --- |
| `npm.cmd test` | PASS: 303 pruebas, 0 fallos |
| `npm.cmd run build` | PASS: generación del cliente local y compilación TypeScript; sin migraciones |
| `npm.cmd run lint` | PASS |
| `git diff --check` | PASS; avisos de conversión LF/CRLF |

No se modificaron código, dependencias, `.env`, módulos de otras integrantes, documentación CRUD ni colección Postman durante esta validación. Solo se añadió este documento al repositorio. No se ejecutaron seed, migraciones, operaciones de Supabase, commit ni push.

Incidencia de preparación: una lectura inicial completa del seed mostró sus credenciales de prueba en la salida de herramienta. Se reconoció y se evitó repetir sus valores; este documento y el diario no los contienen. No hubo resultados inesperados en el ejecutor real ni fue necesario repetir escrituras o realizar limpieza adicional.

El diario de las 68 comprobaciones y capturas SQL permanece fuera de Git en `%TEMP%\TEST-B-PART-20261108T065042843Z\evidence.json`. El ejecutor temporal no contiene credenciales; recibió la credencial recuperada por stdin y obtuvo los tokens por login en memoria.
La prueba de usuario INACTIVE permanece cubierta por mocks; no se desactivó ningún usuario durante esta ejecución real.
