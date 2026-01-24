# Plan: Configurar Git y Crear Rama sin Chatwoot

## Objetivo
1. Crear `.gitignore` apropiado para el proyecto
2. Inicializar repositorio git
3. Crear rama `main` (con Chatwoot)
4. Crear rama `sin-chatwoot` (bot directo a WhatsApp API)

---

## FASE 1: Crear .gitignore

### Archivo: `.gitignore` (raíz del proyecto)

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/

# Environment files
.env
.env.local
.env.production
.env*.local
*.env

# IDE
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage/

# Prisma
backend/prisma/*.db
backend/prisma/*.db-journal

# Temp files
tmp/
temp/
*.tmp

# OS files
Thumbs.db
.DS_Store

# Docker volumes (local)
postgres_data/
redis_data/
chatwoot_storage/

# Certificates (local dev)
certbot/
nginx/conf.d/

# Uploaded files
uploads/
```

---

## FASE 2: Inicializar Git

```bash
cd /Users/jorge/Documents/proyectos/covima-ja
git init
git add .
git commit -m "Initial commit: Covima-JA con Chatwoot"
```

---

## FASE 3: Crear rama sin-chatwoot

```bash
git checkout -b sin-chatwoot
```

### Cambios necesarios en rama `sin-chatwoot`:

#### 3.1 Crear `backend/src/whatsapp/whatsapp.service.ts`
Servicio para enviar mensajes directo a WhatsApp API (sin Chatwoot)

#### 3.2 Crear `backend/src/whatsapp/whatsapp.controller.ts`
Webhook para recibir mensajes directo de Meta

#### 3.3 Crear `backend/src/whatsapp/whatsapp.module.ts`
Módulo de WhatsApp

#### 3.4 Modificar `backend/src/chatwoot-bot/intent-router.service.ts`
Cambiar de `ChatwootBotService` a `WhatsAppService` para enviar mensajes

#### 3.5 Eliminar dependencia de Chatwoot
- Remover `ChatwootBotService`
- Actualizar imports en `app.module.ts`

#### 3.6 Simplificar `docker-compose.prod.yml`
Quitar:
- chatwoot
- chatwoot-sidekiq
- postgres-chatwoot

---

## FASE 4: Archivos a crear/modificar

| Archivo | Acción | Rama |
|---------|--------|------|
| `.gitignore` | Crear | main |
| `backend/src/whatsapp/whatsapp.service.ts` | Crear | sin-chatwoot |
| `backend/src/whatsapp/whatsapp.controller.ts` | Crear | sin-chatwoot |
| `backend/src/whatsapp/whatsapp.module.ts` | Crear | sin-chatwoot |
| `backend/src/chatwoot-bot/intent-router.service.ts` | Modificar | sin-chatwoot |
| `backend/src/app.module.ts` | Modificar | sin-chatwoot |
| `docker-compose.prod.yml` | Simplificar | sin-chatwoot |

---

## FASE 5: Verificación

1. **Rama main (con Chatwoot)**:
   - `docker compose up` funciona con Chatwoot
   - Bot responde via Chatwoot

2. **Rama sin-chatwoot**:
   - `docker compose -f docker-compose.prod.yml up` funciona SIN Chatwoot
   - Bot responde directo via WhatsApp API
   - Menor consumo de RAM (~2GB menos)

---

## Resumen de Comandos

```bash
# 1. Crear .gitignore
# 2. Inicializar git
git init
git add .
git commit -m "Initial commit: Covima-JA con Chatwoot"

# 3. Crear rama sin chatwoot
git checkout -b sin-chatwoot

# 4. Hacer cambios para quitar chatwoot
# ... (editar archivos)

# 5. Commit en rama sin-chatwoot
git add .
git commit -m "feat: Bot directo a WhatsApp API sin Chatwoot"

# 6. Volver a main para comparar
git checkout main
```
