#!/bin/bash
# Script de configuración inicial para Droplet de Digital Ocean
# Ejecutar como root después de crear el Droplet

set -e

echo "=== Actualizando sistema ==="
apt update && apt upgrade -y

echo "=== Instalando Docker ==="
curl -fsSL https://get.docker.com | sh

echo "=== Instalando Docker Compose ==="
apt install docker-compose-plugin -y

echo "=== Instalando utilidades ==="
apt install -y git curl wget htop

echo "=== Creando directorio del proyecto ==="
mkdir -p ~/covima-ja

echo "=== Configurando firewall ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "=== Verificando instalación ==="
docker --version
docker compose version

echo ""
echo "=========================================="
echo "  Droplet configurado correctamente!"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Agrega los secretos en GitHub Actions"
echo "2. Ejecuta el workflow 'Deploy to Digital Ocean'"
echo "3. Restaura el backup de la base de datos"
echo ""
