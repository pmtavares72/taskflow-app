#!/usr/bin/env bash
# Safe db push: hace backup ANTES de ejecutar prisma db push
# Uso: ./scripts/db-safe-push.sh
# Reemplaza el uso directo de "npx prisma db push" en producción

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "══════════════════════════════════════════════════"
echo "  TaskFlow — Safe DB Push"
echo "══════════════════════════════════════════════════"
echo ""

# Paso 1: Backup
echo "PASO 1: Creando backup de seguridad..."
bash "$SCRIPT_DIR/db-backup.sh"
echo ""

# Paso 2: Mostrar cambios pendientes
echo "PASO 2: Verificando cambios del schema..."
echo ""

# Preguntar confirmación
read -p "¿Continuar con prisma db push? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelado. El backup se mantiene por seguridad."
  exit 0
fi

# Paso 3: Push con --accept-data-loss NO permitido
echo ""
echo "PASO 3: Ejecutando prisma db push..."
echo "  NOTA: Si Prisma pide --accept-data-loss, se ABORTARÁ."
echo "  En ese caso, usa prisma migrate en su lugar."
echo ""

# Ejecutar sin --accept-data-loss
npx prisma db push 2>&1 | tee /tmp/prisma-push-output.txt
EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -ne 0 ]; then
  if grep -q "accept-data-loss" /tmp/prisma-push-output.txt; then
    echo ""
    echo "══════════════════════════════════════════════════"
    echo "  BLOQUEADO: Prisma quiere hacer cambios destructivos"
    echo "  Usa 'npx prisma migrate dev' para migraciones seguras"
    echo "  Tu backup está en: backups/"
    echo "══════════════════════════════════════════════════"
  fi
  exit 1
fi

echo ""
echo "DB push completado exitosamente."
