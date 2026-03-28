.PHONY: up down dev dev-back dev-front install install-back install-front db-migrate db-studio logs clean

# ──────────────────────────────────────────────
# Levantar todo
# ──────────────────────────────────────────────

up: ## Levantar Docker + Backend + Frontend
	@echo "🐳 Levantando servicios Docker..."
	docker compose up -d
	@echo "⏳ Esperando a que PostgreSQL esté listo..."
	@until docker exec covima-postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo "✅ PostgreSQL listo"
	@echo "🚀 Levantando Backend y Frontend..."
	@make -j2 dev-back dev-front

dev: up ## Alias de 'up'

dev-back: ## Levantar solo el backend
	cd backend && pnpm start:dev

dev-front: ## Levantar solo el frontend
	cd frontend && pnpm dev

# ──────────────────────────────────────────────
# Apagar todo
# ──────────────────────────────────────────────

down: ## Apagar todo (Docker + matar procesos de dev)
	@echo "🛑 Deteniendo procesos de desarrollo..."
	-@pkill -f "nest start" 2>/dev/null || true
	-@pkill -f "vite" 2>/dev/null || true
	@PORT=$$(grep -m1 '^PORT=' backend/.env 2>/dev/null | cut -d= -f2); \
	 PORT=$${PORT:-3000}; \
	 PIDS=$$(lsof -ti :$$PORT 2>/dev/null); \
	 if [ -n "$$PIDS" ]; then echo "🔪 Matando procesos en puerto $$PORT..."; kill $$PIDS 2>/dev/null || true; fi
	@echo "🐳 Apagando servicios Docker..."
	docker compose down
	@echo "✅ Todo apagado"

stop: down ## Alias de 'down'

# ──────────────────────────────────────────────
# Instalar dependencias
# ──────────────────────────────────────────────

install: install-back install-front ## Instalar todas las dependencias

install-back: ## Instalar dependencias del backend
	cd backend && pnpm install

install-front: ## Instalar dependencias del frontend
	cd frontend && pnpm install

# ──────────────────────────────────────────────
# Base de datos
# ──────────────────────────────────────────────

db-migrate: ## Correr migraciones + seed
	cd backend && pnpm db:migrate

db-studio: ## Abrir Prisma Studio
	cd backend && pnpm db:studio

# ──────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────

logs: ## Ver logs de Docker
	docker compose logs -f

clean: down ## Apagar todo y eliminar volúmenes de Docker
	docker compose down -v
	@echo "🗑️  Volúmenes eliminados"

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
