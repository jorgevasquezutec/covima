# Progreso del Deploy - Covima JA

Este documento es para que otra sesión de Claude continúe donde se quedó.

## Estado Actual: 90% Completado

### Completado

- [x] Código subido a GitHub: `git@github.com:jorgevasquezutec/covima.git`
- [x] VM Azure creada (Standard_D2s_v3, 2 vCPU, 8GB RAM)
  - Resource Group: `covima-central`
  - Nombre VM: `covima-vm`
  - Región: `centralus`
  - IP: `172.173.121.42` (puede cambiar al reiniciar)
- [x] Docker y Docker Compose instalados en VM
- [x] Puertos abiertos: 22, 80, 443
- [x] Contenedores corriendo:
  - PostgreSQL (pgvector)
  - Redis
  - Backend (NestJS)
  - Frontend (React/Vite/Nginx)
  - Caddy (reverse proxy + SSL)
- [x] Migraciones de Prisma aplicadas
- [x] Seed ejecutado (usuarios, roles, partes, tipos de asistencia)
- [x] GitHub Actions workflow configurado (.github/workflows/deploy.yml)
- [x] Caddyfile configurado para SSL automático
- [x] DNS configurado en Namecheap:
  - `covima` → `172.173.121.42`
  - `covima-api` → `172.173.121.42`

### Pendiente

- [ ] Esperar propagación DNS (puede tardar hasta 48h, usualmente 30min)
- [ ] Verificar que Caddy obtenga certificados SSL
- [ ] Configurar webhook de WhatsApp en Meta (cuando SSL funcione)
- [ ] Probar login en producción

### Problemas Encontrados y Resueltos

1. **Azure for Students tiene regiones restringidas**: Solo permite `northcentralus`, `brazilsouth`, `centralus`, `mexicocentral`, `eastus2`

2. **VM B2s no disponible**: Se usó `Standard_D2s_v3` en `centralus`

3. **Schema Prisma desincronizado**: Había columnas en el schema que no existían en la DB. Se agregaron manualmente:
   ```sql
   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);
   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion VARCHAR(200);
   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS biografia TEXT;
   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero VARCHAR(20);
   ```

4. **Seed no corría en producción**: El Dockerfile usaba `ts-node` que no está en producción. Se cambió a ejecutar el seed compilado (`dist/prisma/seed.js`).

### Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `docker-compose.prod.yml` | Configuración de producción con Caddy |
| `Caddyfile` | Configuración de reverse proxy y SSL |
| `.github/workflows/deploy.yml` | Pipeline CI/CD |
| `DEPLOY-AZURE.md` | Guía completa de deploy |
| `CHEATSHEET.md` | Comandos rápidos |
| `.env.example` | Variables de entorno necesarias |

### Secretos en GitHub

Los siguientes secretos están configurados en GitHub Actions:
- `AZURE_VM_HOST`: IP de la VM
- `AZURE_VM_USER`: azureuser
- `AZURE_VM_SSH_KEY`: Clave SSH privada
- `POSTGRES_PASSWORD`: Password de PostgreSQL
- `JWT_SECRET`: Secret para JWT
- `WHATSAPP_TOKEN`: Token de Meta WhatsApp API
- `WHATSAPP_PHONE_NUMBER_ID`: ID del número de WhatsApp
- `WHATSAPP_VERIFY_TOKEN`: Token de verificación webhook
- `WHATSAPP_BOT_NUMBER`: Número del bot (sin +)
- `OPENAI_API_KEY`: API key de OpenAI

### Para Continuar

1. **Encender la VM**:
   ```bash
   az vm start --resource-group covima-central --name covima-vm
   ```

2. **Obtener nueva IP** (puede cambiar):
   ```bash
   az vm show --resource-group covima-central --name covima-vm --show-details --query publicIps -o tsv
   ```

3. **Si la IP cambió**, actualizar:
   - DNS en Namecheap (registros A de `covima` y `covima-api`)
   - Secret `AZURE_VM_HOST` en GitHub

4. **Verificar DNS**:
   ```bash
   dig +short covima.jvasquezd.me @8.8.8.8
   ```

5. **Si DNS propaga**, reiniciar Caddy para obtener certificados:
   ```bash
   ssh azureuser@<IP> "docker restart covima-caddy"
   ```

6. **Verificar la app**:
   - https://covima.jvasquezd.me
   - https://covima-api.jvasquezd.me/api/docs

7. **Configurar webhook de WhatsApp** en Meta Developers:
   - URL: `https://covima-api.jvasquezd.me/whatsapp/webhook`
   - Verify Token: El configurado en `WHATSAPP_VERIFY_TOKEN`

### Credenciales de Prueba

| Usuario | Teléfono | Password |
|---------|----------|----------|
| Admin (Jorge Vasquez) | 51-940393758 | password |
| Todos los participantes | 51-XXXXXXXXX | password |

### Costos Estimados

- VM D2s_v3: ~$70/mes (más caro que B2s pero disponible)
- Con $100 de crédito: ~1.4 meses

### Notas para Claude

- El proyecto usa pnpm, no npm ni yarn
- El backend es NestJS con Prisma
- El frontend es React con Vite y TailwindCSS
- La autenticación es por teléfono (código de país + número) + password
- El bot de WhatsApp usa la API Cloud de Meta (no Chatwoot)
