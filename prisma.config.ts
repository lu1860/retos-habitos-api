import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración de Prisma 7: dónde está el schema, dónde quedan las migraciones,
// cómo se corre el seed y a qué base de datos se conecta la CLI (migrate, seed, studio).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migrate, seed) usa DIRECT_URL si existe: en Neon, la conexión directa (sin "-pooler")
    // es la recomendada para migrar. Si no está, usa DATABASE_URL.
    // process.env y no env(): así `prisma generate` funciona aunque todavía no exista el .env
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
