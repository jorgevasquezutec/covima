# Cheatsheet - Comandos Covima

## Azure VM

```bash
# Encender VM
az vm start --resource-group covima-central --name covima-vm

# Apagar VM (no cobra compute)
az vm deallocate --resource-group covima-central --name covima-vm

# Ver estado
az vm show --resource-group covima-central --name covima-vm --show-details --query "powerState" -o tsv

# Obtener IP pública
az vm show --resource-group covima-central --name covima-vm --show-details --query publicIps -o tsv
```

## SSH a la VM

```bash
# Conectar
ssh azureuser@172.173.121.42

# O después de reiniciar (IP puede cambiar)
ssh azureuser@$(az vm show --resource-group covima-central --name covima-vm --show-details --query publicIps -o tsv)
```

## Docker en la VM

```bash
# Ver estado de contenedores
docker compose -f docker-compose.prod.yml ps

# Ver logs de todos los servicios
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart backend

# Reiniciar todo
docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d

# Rebuild y restart
docker compose -f docker-compose.prod.yml up -d --build

# Ver uso de recursos
docker stats
```

## Base de Datos

```bash
# Conectar a PostgreSQL
docker exec -it covima-postgres psql -U postgres -d covima_ja

# Backup
docker exec covima-postgres pg_dump -U postgres covima_ja > backup_$(date +%Y%m%d).sql

# Restaurar
cat backup.sql | docker exec -i covima-postgres psql -U postgres covima_ja

# Ver tablas
docker exec covima-postgres psql -U postgres -d covima_ja -c "\dt"

# Ver usuarios
docker exec covima-postgres psql -U postgres -d covima_ja -c "SELECT id, nombre, telefono FROM usuarios LIMIT 10;"
```

## Deploy Manual

```bash
# Desde tu máquina local
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backend/.env' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ azureuser@172.173.121.42:~/covima-ja/

# Luego en la VM
cd ~/covima-ja
docker compose -f docker-compose.prod.yml up -d --build
```

## DNS

```bash
# Verificar propagación
dig +short covima.jvasquez.me
dig +short covima-api.jvasquez.me

# Verificar con Google DNS
dig +short covima.jvasquez.me @8.8.8.8
```

## Caddy (SSL)

```bash
# Reiniciar Caddy para obtener certificados
docker restart covima-caddy

# Ver logs de Caddy
docker logs covima-caddy

# Verificar certificados
curl -vI https://covima.jvasquez.me 2>&1 | grep -i "certificate"
```

## Credenciales

| Servicio | Usuario | Password |
|----------|---------|----------|
| Admin | 51-940393758 | password |
| PostgreSQL | postgres | (ver .env POSTGRES_PASSWORD) |

## URLs

- Frontend: https://covima.jvasquez.me
- API: https://covima-api.jvasquez.me
- API Docs: https://covima-api.jvasquez.me/api/docs
