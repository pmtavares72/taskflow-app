-- CreateEnum
CREATE TYPE "EstadoSeguimiento" AS ENUM ('ACTIVO', 'EN_ESPERA', 'NECESITA_ATENCION', 'COMPLETADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoEntrada" AS ENUM ('EMAIL', 'NOTAS_REUNION', 'CONVERSACION', 'DOCUMENTO', 'NOTA_LIBRE');

-- CreateEnum
CREATE TYPE "TipoRecurrencia" AS ENUM ('UNA_VEZ', 'DIARIO', 'CADA_N_DIAS', 'SEMANAL', 'PERSONALIZADO');

-- AlterTable
ALTER TABLE "AgenteFeed" ADD COLUMN     "seguimientoId" TEXT;

-- CreateTable
CREATE TABLE "Seguimiento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoSeguimiento" NOT NULL DEFAULT 'ACTIVO',
    "contexto" "Contexto" NOT NULL DEFAULT 'TRABAJO',
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIUM',
    "ultimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaRevision" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeguimientoItem" (
    "id" TEXT NOT NULL,
    "seguimientoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeguimientoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaContexto" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEntrada" NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "resumen" TEXT,
    "metadatos" JSONB,
    "seguimientoId" TEXT,
    "itemId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntradaContexto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recordatorio" (
    "id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "regla" TEXT NOT NULL,
    "proximoDisparo" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tipoRecurrencia" "TipoRecurrencia" NOT NULL DEFAULT 'UNA_VEZ',
    "seguimientoId" TEXT,
    "itemId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeguimientoItem_seguimientoId_itemId_key" ON "SeguimientoItem"("seguimientoId", "itemId");

-- AddForeignKey
ALTER TABLE "AgenteFeed" ADD CONSTRAINT "AgenteFeed_seguimientoId_fkey" FOREIGN KEY ("seguimientoId") REFERENCES "Seguimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoItem" ADD CONSTRAINT "SeguimientoItem_seguimientoId_fkey" FOREIGN KEY ("seguimientoId") REFERENCES "Seguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeguimientoItem" ADD CONSTRAINT "SeguimientoItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaContexto" ADD CONSTRAINT "EntradaContexto_seguimientoId_fkey" FOREIGN KEY ("seguimientoId") REFERENCES "Seguimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaContexto" ADD CONSTRAINT "EntradaContexto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaContexto" ADD CONSTRAINT "EntradaContexto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_seguimientoId_fkey" FOREIGN KEY ("seguimientoId") REFERENCES "Seguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatorio" ADD CONSTRAINT "Recordatorio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
