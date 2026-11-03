import "dotenv/config";

/**
 * Variables de entorno de la API. Los valores reales viven en el archivo .env (fuera de Git).
 *
 *   DATABASE_URL    obligatoria  cadena de conexión de PostgreSQL (Neon) que usa la API
 *   DIRECT_URL      opcional     conexión directa para las migraciones (solo la lee prisma.config.ts)
 *   JWT_SECRET      obligatoria  secreto para firmar los tokens. SIN valor por defecto
 *   JWT_EXPIRES_IN  opcional     duración del token: "1h", "30m", "5s"... (por defecto 1h)
 *   CORS_ORIGINS    opcional     orígenes del frontend separados por coma (por defecto http://localhost:3000)
 *   PORT            opcional     puerto de la API (por defecto 3001; Render pone el suyo)
 */
export const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"] as const;

/** Lee una variable obligatoria o detiene la aplicación con un mensaje claro. */
export const requireEnv = (name: (typeof REQUIRED_ENV)[number]): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa tu archivo .env`);
  }
  return value;
};

/** Variables obligatorias que no están definidas (para avisar todas juntas al arrancar). */
export const missingRequiredEnv = (): string[] =>
  REQUIRED_ENV.filter((name) => !process.env[name]?.trim());

export const getPort = (): number => {
  const port = Number(process.env["PORT"]);
  return Number.isInteger(port) && port > 0 ? port : 3001;
};

export const getCorsOrigins = (): string[] =>
  (process.env["CORS_ORIGINS"] ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const EXPIRES_IN_FORMAT = /^\d+[smhd]?$/;

/** Duración del token. Acepta un número de segundos o un número con s, m, h o d. */
export const getJwtExpiresIn = (): string => {
  const value = process.env["JWT_EXPIRES_IN"]?.trim() || "1h";
  if (!EXPIRES_IN_FORMAT.test(value) || /^0+[smhd]?$/.test(value)) {
    throw new Error(`JWT_EXPIRES_IN no es válido ("${value}"). Usa por ejemplo 1h, 30m o 5s`);
  }
  return value;
};
