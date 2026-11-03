-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "estado" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rol" "rol_usuario" NOT NULL DEFAULT 'user',
    "status" "estado" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(500),
    "status" "estado" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(1000) NOT NULL,
    "imagen_url" VARCHAR(500),
    "duracion_dias" INTEGER NOT NULL,
    "es_oficial" BOOLEAN NOT NULL DEFAULT false,
    "categoria_id" INTEGER NOT NULL,
    "creador_id" INTEGER NOT NULL,
    "status" "estado" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "reto_id" INTEGER NOT NULL,
    "fecha_union" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "estado" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "participaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "reto_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "nota" VARCHAR(500),
    "status" "estado" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE INDEX "retos_status_idx" ON "retos"("status");

-- CreateIndex
CREATE INDEX "retos_categoria_id_idx" ON "retos"("categoria_id");

-- CreateIndex
CREATE INDEX "retos_creador_id_idx" ON "retos"("creador_id");

-- CreateIndex
CREATE INDEX "participaciones_reto_id_idx" ON "participaciones"("reto_id");

-- CreateIndex
CREATE UNIQUE INDEX "participaciones_usuario_id_reto_id_key" ON "participaciones"("usuario_id", "reto_id");

-- CreateIndex
CREATE INDEX "registros_reto_id_idx" ON "registros"("reto_id");

-- CreateIndex
CREATE UNIQUE INDEX "registros_usuario_id_reto_id_fecha_key" ON "registros"("usuario_id", "reto_id", "fecha");

-- AddForeignKey
ALTER TABLE "retos" ADD CONSTRAINT "retos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retos" ADD CONSTRAINT "retos_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participaciones" ADD CONSTRAINT "participaciones_reto_id_fkey" FOREIGN KEY ("reto_id") REFERENCES "retos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros" ADD CONSTRAINT "registros_reto_id_fkey" FOREIGN KEY ("reto_id") REFERENCES "retos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
