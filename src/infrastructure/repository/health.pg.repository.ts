import { prisma } from "./prisma.client.ts";

/** true si la base de datos responde. Lo usa GET /api/health. */
export const isDatabaseReachable = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
};
