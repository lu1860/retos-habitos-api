import { getJwtExpiresIn, getPort, missingRequiredEnv } from "./infrastructure/config/env.ts";

// Se revisan las variables ANTES de cargar la aplicación, para fallar con un mensaje claro
// y no con un error de conexión difícil de entender.
const missing = missingRequiredEnv();
if (missing.length > 0) {
  console.error(`Faltan variables de entorno: ${missing.join(", ")}. Revisa tu archivo .env`);
  process.exit(1);
}
try {
  getJwtExpiresIn();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const { createApp } = await import("./app.ts");
const port = getPort();

createApp().listen(port, () => {
  console.info(`API escuchando en http://localhost:${port}`);
});
