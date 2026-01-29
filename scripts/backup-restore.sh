#!/bin/bash
# Script para backup de producción y restaurar en local
# Uso: ./scripts/backup-restore.sh [backup|restore|sync]

set -e

AZURE_HOST="azureuser@172.173.121.42"
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/backup_prod_$(date +%Y%m%d_%H%M%S).sql"
LOCAL_CONTAINER="covima-postgres"  # Nombre del contenedor local

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

mkdir -p "$BACKUP_DIR"

backup() {
    echo -e "${YELLOW}📦 Creando backup de producción...${NC}"
    ssh $AZURE_HOST "docker exec covima-postgres pg_dump -U postgres covima_ja" > "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup guardado en: $BACKUP_FILE${NC}"
    echo -e "${GREEN}   Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)${NC}"
    echo -e "${GREEN}   Líneas: $(wc -l < "$BACKUP_FILE")${NC}"
}

restore() {
    # Buscar el backup más reciente
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_prod_*.sql 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No hay backups disponibles. Ejecuta primero: $0 backup${NC}"
        exit 1
    fi

    echo -e "${YELLOW}📥 Restaurando desde: $LATEST_BACKUP${NC}"

    # Verificar que el contenedor local existe
    if ! docker ps | grep -q "$LOCAL_CONTAINER"; then
        echo -e "${RED}❌ Contenedor $LOCAL_CONTAINER no está corriendo.${NC}"
        echo -e "${YELLOW}   Ejecuta: docker compose up -d postgres${NC}"
        exit 1
    fi

    # Terminar conexiones y recrear la base de datos
    echo -e "${YELLOW}   Terminando conexiones activas...${NC}"
    docker exec -i $LOCAL_CONTAINER psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'covima_ja' AND pid <> pg_backend_pid();" 2>/dev/null || true

    echo -e "${YELLOW}   Recreando base de datos...${NC}"
    docker exec -i $LOCAL_CONTAINER psql -U postgres -c "DROP DATABASE IF EXISTS covima_ja;" 2>/dev/null || true
    docker exec -i $LOCAL_CONTAINER psql -U postgres -c "CREATE DATABASE covima_ja;" 2>/dev/null || true

    # Restaurar
    echo -e "${YELLOW}   Importando datos...${NC}"
    cat "$LATEST_BACKUP" | docker exec -i $LOCAL_CONTAINER psql -U postgres -d covima_ja

    echo -e "${GREEN}✅ Restauración completada${NC}"
}

sync() {
    echo -e "${YELLOW}🔄 Sincronizando producción → local${NC}"
    backup
    restore
    echo -e "${GREEN}✅ Sincronización completada${NC}"
}

case "${1:-sync}" in
    backup)
        backup
        ;;
    restore)
        restore
        ;;
    sync)
        sync
        ;;
    *)
        echo "Uso: $0 [backup|restore|sync]"
        echo ""
        echo "  backup  - Solo crear backup de producción"
        echo "  restore - Restaurar último backup en local"
        echo "  sync    - Backup + Restore (default)"
        exit 1
        ;;
esac
