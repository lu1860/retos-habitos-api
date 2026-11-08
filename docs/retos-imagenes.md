# Imágenes de retos

POST /api/retos y PATCH /api/retos/:id aceptan JSON como antes o multipart/form-data.
Se requiere Authorization: Bearer <JWT>. El archivo opcional se llama imagen.
Solo se permite un archivo JPG/JPEG, PNG o WebP de hasta 2 MiB (2 097 152 bytes).
El servicio comprueba el formato real con file-type y exige una extensión correspondiente.
Esto identifica el formato; no sustituye una decodificación completa ni un análisis antivirus.

En POST se envían nombre, descripcion, duracionDias y categoriaId.
En PATCH pueden enviarse solo imagen o combinarla con campos editables.
Los números multipart deben ser texto decimal positivo sin espacios, signos, exponentes ni decimales, dentro del rango Int de PostgreSQL.
JSON mantiene sus tipos y validaciones actuales.
No enviar imagenUrl, imagen_url, creadorId, esOficial ni status: POST los ignora y PATCH los rechaza, como antes.
La respuesta mantiene { data: reto }, con imagenUrl pública; PostgreSQL recibe imagen_url.

Ejemplo de navegador (para PATCH, cambiar la URL/método y omitir campos que no se editan):

```javascript
const body = new FormData();
body.set("nombre", "Caminar");
body.set("descripcion", "Caminar cada día");
body.set("duracionDias", "30");
body.set("categoriaId", "2");
if (archivo) body.set("imagen", archivo);
const response = await fetch("/api/retos", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body,
});
```

El navegador debe establecer Content-Type y el boundary; no definir ese header manualmente.
Los errores de archivo, límites y multipart malformado responden 400.
La autenticación sucede antes del parser. El parser solo guarda temporalmente en memoria.
La existencia, actividad, autorización y categoría se comprueban antes de subir a Supabase.
Los límites por petición acotan memoria; no se introduce un límite global de concurrencia.

## Consistencia y limpieza

Cada subida usa una ruta UUID nueva con upsert desactivado.
No se borran imágenes anteriores al reemplazarlas ni al desactivar un reto.
Se compensa únicamente la subida nueva cuando Prisma confirma un rechazo:
validación o códigos P2000, P2002, P2003 y P2025.
Se conserva el error original si falla la limpieza.
Si una subida se confirma pero no se obtiene su URL, se intenta eliminar su ruta nueva.

Ante errores de transporte, resultados desconocidos o caída del proceso se conserva el objeto:
podría estar referenciado por una escritura confirmada en PostgreSQL.
No existe una transacción distribuida entre Storage y PostgreSQL.
Puede requerirse reconciliación manual de objetos huérfanos, incluidos fallos de limpieza;
no hay cola duradera ni tarea automática de reconciliación.
No eliminar objetos sin comprobar referencias y antigüedad con una política explícita.
La suite usa almacenamiento y persistencia sustituidos; no prueba conectividad real de Supabase o Neon.
