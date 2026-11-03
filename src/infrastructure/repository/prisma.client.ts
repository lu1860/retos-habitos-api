import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { requireEnv } from "../config/env.ts";

// Una sola instancia de Prisma para toda la API. Prisma 7 se conecta a PostgreSQL con el adaptador pg.
const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL") });

export const prisma = new PrismaClient({ adapter });
