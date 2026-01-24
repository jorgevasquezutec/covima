# Despliegue Covima-JA en Azure (VM Única)

## Resumen
- **Presupuesto**: $100 USD (créditos Azure)
- **Costo estimado**: ~$37/mes
- **Arquitectura**: VM única con Docker Compose
- **Dominio**: Namecheap → Azure

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│                    Azure VM (B2s)                       │
│                  Ubuntu 22.04 LTS                       │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Frontend   │  │   Backend   │  │  PostgreSQL │     │
│  │   (Nginx)   │  │  (Node.js)  │  │  + pgvector │     │
│  │   :80/443   │  │    :3001    │  │    :5432    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │    Redis    │  │   Caddy     │ ← Reverse Proxy      │
│  │    :6379    │  │  (SSL auto) │   + SSL automático   │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
         ▲
         │ HTTPS
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Namecheap     │────▶│  covima.tudominio│
│   DNS Config    │     │  api.tudominio   │
└─────────────────┘     └──────────────────┘
```

---

## FASE 1: Crear VM en Azure

### 1.1 Crear Resource Group

```bash
# Instalar Azure CLI (si no lo tienes)
# macOS:
brew install azure-cli

# Iniciar sesión
az login

# Crear Resource Group
az group create \
  --name covima-rg \
  --location eastus
```

### 1.2 Crear la VM

```bash
az vm create \
  --resource-group covima-rg \
  --name covima-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --storage-sku StandardSSD_LRS \
  --os-disk-size-gb 32
```

### 1.3 Abrir puertos necesarios

```bash
# HTTP y HTTPS
az vm open-port --resource-group covima-rg --name covima-vm --port 80 --priority 1001
az vm open-port --resource-group covima-rg --name covima-vm --port 443 --priority 1002

# SSH (ya está abierto por defecto en 22)
```

### 1.4 Obtener IP pública

```bash
az vm show \
  --resource-group covima-rg \
  --name covima-vm \
  --show-details \
  --query publicIps \
  --output tsv
```

**Guarda esta IP**, la necesitarás para configurar el DNS.

---

## FASE 2: Configurar DNS en Namecheap

### 2.1 Ir a Namecheap → Domain List → Manage → Advanced DNS

### 2.2 Agregar registros A

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | @ | `<IP_DE_AZURE>` | Automatic |
| A Record | api | `<IP_DE_AZURE>` | Automatic |
| A Record | www | `<IP_DE_AZURE>` | Automatic |

### 2.3 Esperar propagación DNS (5-30 minutos)

Verificar con:
```bash
nslookup tudominio.com
nslookup api.tudominio.com
```

---

## FASE 3: Configurar la VM

### 3.1 Conectar por SSH

```bash
ssh azureuser@<IP_DE_AZURE>
```

### 3.2 Instalar Docker y Docker Compose

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker azureuser

# Instalar Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Cerrar sesión y volver a conectar para aplicar cambios de grupo
exit
```

### 3.3 Reconectar y verificar

```bash
ssh azureuser@<IP_DE_AZURE>
docker --version
docker compose version
```

### 3.4 Crear estructura de directorios

```bash
mkdir -p ~/covima-ja
cd ~/covima-ja
```

---

## FASE 4: Configurar GitHub Actions para CI/CD

### 4.1 Crear secretos en GitHub

Ir a: **Repository → Settings → Secrets and variables → Actions**

Agregar estos secretos:

| Nombre | Valor |
|--------|-------|
| `AZURE_VM_HOST` | IP pública de la VM |
| `AZURE_VM_USER` | `azureuser` |
| `AZURE_VM_SSH_KEY` | Contenido de `~/.ssh/id_rsa` (clave privada) |
| `POSTGRES_PASSWORD` | Tu password seguro para PostgreSQL |
| `JWT_SECRET` | Un string largo y aleatorio (mín 32 chars) |
| `WHATSAPP_TOKEN` | Tu token de Meta WhatsApp API |
| `WHATSAPP_PHONE_NUMBER_ID` | Tu Phone Number ID |
| `WHATSAPP_VERIFY_TOKEN` | Tu verify token |
| `OPENAI_API_KEY` | Tu API key de OpenAI (opcional) |

### 4.2 Obtener la clave SSH privada

En tu máquina local:
```bash
cat ~/.ssh/id_rsa
```

Copia TODO el contenido (incluyendo `-----BEGIN` y `-----END`).

### 4.3 Crear workflow de GitHub Actions

Crear archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure VM

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  DOMAIN: jvasquezd.me  # Cambiar por tu dominio

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.AZURE_VM_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.AZURE_VM_HOST }} >> ~/.ssh/known_hosts

      - name: Create .env file
        run: |
          cat > .env << 'EOF'
          # Database
          POSTGRES_USER=postgres
          POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}

          # JWT
          JWT_SECRET=${{ secrets.JWT_SECRET }}

          # URLs
          FRONTEND_URL=https://covima.${{ env.DOMAIN }}
          BACKEND_URL=https://covima-api.${{ env.DOMAIN }}

          # WhatsApp
          WHATSAPP_TOKEN=${{ secrets.WHATSAPP_TOKEN }}
          WHATSAPP_PHONE_NUMBER_ID=${{ secrets.WHATSAPP_PHONE_NUMBER_ID }}
          WHATSAPP_VERIFY_TOKEN=${{ secrets.WHATSAPP_VERIFY_TOKEN }}
          WHATSAPP_BOT_NUMBER=51900085075

          # OpenAI
          OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          EOF

      - name: Copy files to server
        run: |
          rsync -avz --delete \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '.env.local' \
            -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no" \
            ./ ${{ secrets.AZURE_VM_USER }}@${{ secrets.AZURE_VM_HOST }}:~/covima-ja/

      - name: Deploy with Docker Compose
        run: |
          ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no \
            ${{ secrets.AZURE_VM_USER }}@${{ secrets.AZURE_VM_HOST }} << 'ENDSSH'
          cd ~/covima-ja

          # Detener contenedores existentes
          docker compose -f docker-compose.prod.yml down || true

          # Construir y levantar
          docker compose -f docker-compose.prod.yml build --no-cache
          docker compose -f docker-compose.prod.yml up -d

          # Limpiar imágenes antiguas
          docker image prune -f

          # Mostrar estado
          docker compose -f docker-compose.prod.yml ps
          ENDSSH
```

---

## FASE 5: Configurar Caddy como Reverse Proxy (SSL automático)

### 5.1 Actualizar docker-compose.prod.yml

Agregar Caddy al archivo `docker-compose.prod.yml`:

```yaml
# Docker Compose para Producción - Azure VM
# Con Caddy para SSL automático

services:
  # === REVERSE PROXY + SSL ===
  caddy:
    image: caddy:2-alpine
    container_name: covima-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend
    networks:
      - covima-network

  # === BASE DE DATOS ===
  postgres:
    image: pgvector/pgvector:pg16
    container_name: covima-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
      POSTGRES_DB: covima_ja
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - covima-network

  # === CACHE ===
  redis:
    image: redis:7-alpine
    container_name: covima-redis
    restart: always
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - covima-network

  # === BACKEND ===
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: covima-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/covima_ja
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET:?JWT_SECRET is required}
      - NODE_ENV=production
      - PORT=3001
      - FRONTEND_URL=${FRONTEND_URL}
      - BACKEND_URL=${BACKEND_URL}
      - WHATSAPP_TOKEN=${WHATSAPP_TOKEN:?WHATSAPP_TOKEN is required}
      - WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID:?WHATSAPP_PHONE_NUMBER_ID is required}
      - WHATSAPP_VERIFY_TOKEN=${WHATSAPP_VERIFY_TOKEN:-covima_verify_token}
      - WHATSAPP_BOT_NUMBER=${WHATSAPP_BOT_NUMBER}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
    networks:
      - covima-network

  # === FRONTEND ===
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${BACKEND_URL}/api
    container_name: covima-frontend
    restart: always
    networks:
      - covima-network

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  covima-network:
    driver: bridge
```

### 5.2 Crear archivo Caddyfile

Crear archivo `Caddyfile` en la raíz del proyecto:

```caddyfile
# Caddyfile - Reverse Proxy con SSL automático
# Cambiar jvasquezd.me por tu dominio

covima.jvasquezd.me {
    reverse_proxy frontend:80
}

covima-api.jvasquezd.me {
    reverse_proxy backend:3001
}
```

---

## FASE 6: Configurar Webhook de Meta WhatsApp

### 6.1 Ir a Meta for Developers

1. Ir a https://developers.facebook.com/apps/
2. Seleccionar tu app
3. WhatsApp → Configuration → Webhook

### 6.2 Configurar Webhook URL

| Campo | Valor |
|-------|-------|
| Callback URL | `https://covima-api.jvasquezd.me/whatsapp/webhook` |
| Verify Token | El mismo que pusiste en `WHATSAPP_VERIFY_TOKEN` |

### 6.3 Suscribir a eventos

Seleccionar:
- `messages`
- `message_deliveries` (opcional)
- `message_reads` (opcional)

---

## FASE 7: Primer Deploy Manual (para probar)

### 7.1 Subir código a GitHub

```bash
git add .
git commit -m "feat: Configuración para deploy en Azure"
git push origin main
```

### 7.2 El workflow se ejecutará automáticamente

Ir a: **Repository → Actions** para ver el progreso.

### 7.3 Verificar que funciona

```bash
# Desde tu máquina local
curl https://covima.jvasquezd.me
curl https://covima-api.jvasquezd.me/api/health
```

---

## FASE 8: Comandos Útiles

### Ver logs en la VM

```bash
ssh azureuser@<IP>
cd ~/covima-ja

# Ver todos los logs
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Reiniciar servicios

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Ver uso de recursos

```bash
docker stats
```

### Backup de la base de datos

```bash
docker exec covima-postgres pg_dump -U postgres covima_ja > backup_$(date +%Y%m%d).sql
```

### Restaurar backup

```bash
cat backup.sql | docker exec -i covima-postgres psql -U postgres covima_ja
```

---

## Resumen de Costos

| Recurso | Especificación | Costo/mes |
|---------|---------------|-----------|
| VM B2s | 2 vCPU, 4GB RAM | ~$31 |
| Disco SSD | 32GB Standard | ~$2.50 |
| IP Pública | Estática | ~$3 |
| Bandwidth | 5GB incluido | $0 |
| **TOTAL** | | **~$37/mes** |

Con $100 de créditos tienes para **~2.7 meses** de operación.

---

## Checklist Final

- [ ] VM creada en Azure
- [ ] DNS configurado en Namecheap
- [ ] Docker instalado en VM
- [ ] Secretos configurados en GitHub
- [ ] Caddyfile creado
- [ ] docker-compose.prod.yml actualizado
- [ ] Workflow de GitHub Actions creado
- [ ] Primer deploy exitoso
- [ ] Webhook de Meta configurado
- [ ] SSL funcionando (https)
- [ ] Bot respondiendo mensajes

---

## Troubleshooting

### SSL no funciona
```bash
# Ver logs de Caddy
docker compose -f docker-compose.prod.yml logs caddy
```

### Base de datos no conecta
```bash
# Verificar que postgres está corriendo
docker compose -f docker-compose.prod.yml ps postgres

# Ver logs
docker compose -f docker-compose.prod.yml logs postgres
```

### El deploy falla en GitHub Actions
- Verificar que la clave SSH es correcta
- Verificar que la IP es correcta
- Verificar que los puertos 22, 80, 443 están abiertos

### Webhook de WhatsApp no verifica
- Verificar que `WHATSAPP_VERIFY_TOKEN` coincide
- Verificar que el endpoint `/whatsapp/webhook` responde
- Verificar logs del backend
