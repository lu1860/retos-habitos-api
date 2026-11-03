import { prisma } from "../src/infrastructure/repository/prisma.client.ts";
import { BcryptService } from "../src/infrastructure/services/bcrypt.service.ts";

/**
 * Datos de prueba. Se corre con `npx prisma db seed` (o `npm run seed`).
 * Se puede correr varias veces: si un dato ya existe, no lo duplica ni lo cambia.
 *
 * Credenciales de prueba (van en el README de los dos repos):
 *   admin@retos.app    / Admin2026*    rol admin
 *   usuario@retos.app  / Usuario2026*  rol user
 */
const hasher = new BcryptService();

const USUARIOS = [
  {
    nombre: "Administradora Retos",
    email: "admin@retos.app",
    password: "Admin2026*",
    rol: "admin",
  },
  {
    nombre: "Usuaria de Prueba",
    email: "usuario@retos.app",
    password: "Usuario2026*",
    rol: "user",
  },
] as const;

const CATEGORIAS = [
  { nombre: "Hidratación", descripcion: "Retos para tomar más agua durante el día" },
  { nombre: "Actividad física", descripcion: "Caminar, estirarse y moverse un poco cada día" },
  { nombre: "Lectura", descripcion: "Leer unos minutos todos los días" },
];

// Retos oficiales (creados por la admin) con una imagen de ejemplo, para que todas vean tarjetas
// con imagen sin tener acceso al bucket. Los retos reales guardan la URL de Supabase Storage.
const RETOS_OFICIALES = [
  {
    nombre: "8 vasos de agua al día",
    descripcion: "Toma al menos 8 vasos de agua cada día durante tres semanas.",
    duracionDias: 21,
    categoria: "Hidratación",
    imagenUrl: "https://picsum.photos/seed/retos-agua/800/450",
  },
  {
    nombre: "Caminar 20 minutos",
    descripcion: "Sal a caminar 20 minutos diarios, a tu ritmo.",
    duracionDias: 30,
    categoria: "Actividad física",
    imagenUrl: "https://picsum.photos/seed/retos-caminar/800/450",
  },
  {
    nombre: "Leer 15 minutos",
    descripcion: "Lee 15 minutos al día el libro que quieras.",
    duracionDias: 14,
    categoria: "Lectura",
    imagenUrl: "https://picsum.photos/seed/retos-leer/800/450",
  },
];

async function seedUsuarios() {
  for (const usuario of USUARIOS) {
    await prisma.usuarios.upsert({
      where: { email: usuario.email },
      update: {},
      create: {
        nombre: usuario.nombre,
        email: usuario.email,
        password: await hasher.hash(usuario.password),
        rol: usuario.rol,
      },
    });
  }
}

async function seedCategorias() {
  for (const categoria of CATEGORIAS) {
    await prisma.categorias.upsert({
      where: { nombre: categoria.nombre },
      update: {},
      create: categoria,
    });
  }
}

async function seedRetos() {
  const admin = await prisma.usuarios.findUniqueOrThrow({ where: { email: "admin@retos.app" } });
  for (const reto of RETOS_OFICIALES) {
    const categoria = await prisma.categorias.findUniqueOrThrow({
      where: { nombre: reto.categoria },
    });
    // nombre no es único en la tabla, por eso se busca antes de crear
    const existente = await prisma.retos.findFirst({
      where: { nombre: reto.nombre, creador_id: admin.id },
    });
    if (existente) continue;
    await prisma.retos.create({
      data: {
        nombre: reto.nombre,
        descripcion: reto.descripcion,
        duracion_dias: reto.duracionDias,
        imagen_url: reto.imagenUrl,
        es_oficial: true,
        categoria_id: categoria.id,
        creador_id: admin.id,
      },
    });
  }
}

async function main() {
  await seedUsuarios();
  await seedCategorias();
  await seedRetos();
  const [usuarios, categorias, retos] = await Promise.all([
    prisma.usuarios.count(),
    prisma.categorias.count(),
    prisma.retos.count(),
  ]);
  console.info(`Seed listo: ${usuarios} usuarios, ${categorias} categorías, ${retos} retos`);
}

main()
  .catch((error: unknown) => {
    console.error("El seed falló:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
