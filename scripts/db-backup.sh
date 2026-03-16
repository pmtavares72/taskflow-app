#!/usr/bin/env bash
# Backup de la base de datos TaskFlow
# Uso: ./scripts/db-backup.sh
# Requiere: pg_dump disponible y DATABASE_URL definida (o .env.local)

set -euo pipefail

# Cargar .env.local si existe
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep DATABASE_URL | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL no definida. Configura .env.local o exporta la variable."
  exit 1
fi

# Directorio de backups
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p "$BACKUP_DIR"

# Nombre con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/taskflow_${TIMESTAMP}.sql"

echo "Creando backup de TaskFlow..."
echo "  → $BACKUP_FILE"

pg_dump "$DATABASE_URL" --no-owner --no-acl > "$BACKUP_FILE"

# Comprimir
gzip "$BACKUP_FILE"
echo "  → Comprimido: ${BACKUP_FILE}.gz"

# Limpiar backups viejos (mantener últimos 10)
cd "$BACKUP_DIR"
ls -t taskflow_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "  → Backups activos: $(ls taskflow_*.sql.gz 2>/dev/null | wc -l)"

echo "Backup completado."
