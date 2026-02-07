# Deploy en Digital Ocean

Guia para desplegar Covima JA en un Droplet de Digital Ocean con Docker, GHCR y Caddy.

## Arquitectura

```
                    Internet
                       │
                 ┌─────┴─────┐
                 │   Caddy    │  :80 / :443
                 │ SSL auto   │  Reverse proxy
                 └──┬─────┬──┘
                    │     │
         ┌──────────┘     └──────────┐
         ▼                           ▼
   ┌───────────┐              ┌───────────┐
   │ Frontend  │ :80          │ Backend   │ :3001
   │  (nginx)  │              │ (NestJS)  │
   └───────────┘              └─────┬─────┘
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                   ┌──────────┐ ┌───────┐ ┌────────┐
                   │PostgreSQL│ │ Redis │ │ OpenAI │
                   │  pg16    │ │  7    │ │ GPT-4o │
                   └──────────┘ └───────┘ └────────┘
```

Todos los servicios corren como contenedores Docker gestionados por `docker-compose.prod.yml`.

## Requisitos

- **Droplet**: Ubuntu 22.04+, mínimo 1 GB RAM / 1 vCPU (recomendado 2 GB)
- **Docker** y **Docker Compose** instalados en el servidor
- **Dominio** con acceso a DNS (para configurar subdominios)
- **Cuenta GitHub** con acceso al repositorio (para GHCR)
- **GitHub Secrets** configurados en el repositorio

## Configuracion inicial del servidor

### 1. Conectarse al droplet

```bash
ssh root@<IP_DEL_DROPLET>
```

### 2. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Verificar:

```bash
docker --version
docker compose version
```

### 3. Clonar el repositorio

```bash
cd ~
git clone https://github.com/jorgevasquezutec/covima.git covima-ja
cd covima-ja
```

### 4. Crear archivo .env

```bash
cp .env.example .env
nano .env  # Completar con valores reales
```

## Variables de entorno

Crear un archivo `.env` en la raiz del proyecto con estas variables:

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Password de PostgreSQL | (password seguro) |
| `JWT_SECRET` | Secret para tokens JWT (min 32 chars) | (string largo y aleatorio) |
| `FRONTEND_URL` | URL publica del frontend | `https://covima.jvasquez.me` |
| `BACKEND_URL` | URL publica del backend | `https://covima-api.jvasquez.me` |
| `WHATSAPP_TOKEN` | Token de Meta WhatsApp Cloud API | (desde developers.facebook.com) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de WhatsApp | (desde developers.facebook.com) |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificacion del webhook | `covima_verify_token` |
| `WHATSAPP_BOT_NUMBER` | Numero del bot (con codigo de pais) | `51900085075` |
| `OPENAI_API_KEY` | API key de OpenAI (opcional) | `sk-proj-...` |

## CI/CD con GitHub Actions

El workflow `.github/workflows/deploy-do.yml` se ejecuta automaticamente en cada push a `main`.

### Flujo del pipeline

```
Push a main
    │
    ▼
┌────────────────────┐
│  1. Build & Push   │
│  - Build backend   │
│  - Build frontend  │
│  - Push a GHCR     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  2. Deploy         │
│  - SSH al droplet  │
│  - git pull        │
│  - docker pull     │
│  - docker up -d    │
│  - prune imagenes  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  3. Health check   │
│  - Verificar API   │
│  - Verificar Front │
└────────────────────┘
```

### GitHub Secrets requeridos

Configurar en **Settings > Secrets and variables > Actions**:

| Secret | Descripcion |
|--------|-------------|
| `DO_HOST` | IP del droplet de Digital Ocean |
| `DO_SSH_KEY` | Clave SSH privada para acceder al droplet |
| `GHCR_PAT` | Personal Access Token con scope `read:packages` |
| `POSTGRES_PASSWORD` | Password de la base de datos |
| `JWT_SECRET` | Secret para firmar tokens JWT |
| `WHATSAPP_TOKEN` | Token de Meta WhatsApp API |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID de WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificacion del webhook |
| `WHATSAPP_BOT_NUMBER` | Numero del bot WhatsApp |
| `OPENAI_API_KEY` | API key de OpenAI |

> `GITHUB_TOKEN` se provee automaticamente por GitHub Actions (no es necesario crearlo).

### Imagenes Docker

Las imagenes se publican en GitHub Container Registry (GHCR):

- `ghcr.io/jorgevasquezutec/covima/backend:latest`
- `ghcr.io/jorgevasquezutec/covima/frontend:latest`

Cada build tambien tagea con el SHA del commit para trazabilidad.

## Deploy manual (sin CI/CD)

Si necesitas desplegar manualmente sin pasar por GitHub Actions:

```bash
# En el droplet
cd ~/covima-ja

# Actualizar codigo (para docker-compose y configs)
git fetch origin && git reset --hard origin/main

# Login a GHCR
echo "TU_GHCR_PAT" | docker login ghcr.io -u TU_USUARIO --password-stdin

# Descargar imagenes nuevas
docker compose -f docker-compose.prod.yml pull backend frontend

# Reiniciar servicios
docker compose -f docker-compose.prod.yml up -d

# Limpiar imagenes antiguas
docker image prune -f

# Verificar estado
docker compose -f docker-compose.prod.yml ps
```

## Dominios y SSL

### DNS

Configurar registros A en tu proveedor de DNS apuntando a la IP del droplet:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `covima` | `<IP_DEL_DROPLET>` |
| A | `covima-api` | `<IP_DEL_DROPLET>` |

### Caddyfile

Caddy obtiene certificados SSL automaticamente via Let's Encrypt. La configuracion esta en `Caddyfile` en la raiz del proyecto:

```
covima.jvasquez.me {
    reverse_proxy frontend:80
}

covima-api.jvasquez.me {
    reverse_proxy backend:3001
}
```

No se necesita configuracion adicional de SSL; Caddy maneja la renovacion automaticamente.

## Backup y Restore

El script `scripts/backup-restore-do.sh` permite hacer backups de produccion y restaurarlos localmente.

### Uso

```bash
# Backup de produccion (descarga .sql del droplet)
./scripts/backup-restore-do.sh backup

# Restaurar ultimo backup en la base de datos local
./scripts/backup-restore-do.sh restore

# Backup + Restore en un solo paso
./scripts/backup-restore-do.sh sync
```

Los backups se guardan en `./backups/backup_do_YYYYMMDD_HHMMSS.sql`.

> **Requisitos**: SSH configurado al droplet y contenedor `covima-postgres` local corriendo.

## Comandos utiles

```bash
# Ver estado de los servicios
docker compose -f docker-compose.prod.yml ps

# Ver logs de un servicio
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f caddy

# Reiniciar un servicio especifico
docker compose -f docker-compose.prod.yml restart backend

# Reiniciar todos los servicios
docker compose -f docker-compose.prod.yml up -d

# Ver uso de recursos
docker stats

# Acceder a la base de datos
docker exec -it covima-postgres psql -U postgres -d covima_ja

# Ejecutar migraciones manualmente
docker exec -it covima-backend npx prisma migrate deploy
```
