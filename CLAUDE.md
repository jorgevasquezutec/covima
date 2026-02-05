# CLAUDE.md - Covima JA

## Proyecto

Sistema web para gestionar programas JA (Jóvenes Adventistas): asistencia con gamificación, programas semanales, bot de WhatsApp e inbox de conversaciones.

## Stack

- **Backend**: NestJS 11 + Prisma 6 + PostgreSQL + Redis + Socket.io + OpenAI
- **Frontend**: React 19 + Vite 7 + TypeScript + TailwindCSS 4 + shadcn/ui + TanStack Query + Zustand
- **Infra**: Docker Compose (dev), Azure VM + Caddy (prod), GitHub Actions CI/CD

## Comandos

```bash
# Levantar servicios (PostgreSQL, Redis, Adminer)
docker compose up -d

# Backend (desde /backend)
pnpm install
pnpm start:dev        # http://localhost:3000
pnpm db:migrate       # Migraciones + seed
pnpm db:studio        # Prisma Studio GUI
pnpm test             # Jest tests
pnpm lint             # ESLint

# Frontend (desde /frontend)
pnpm install
pnpm dev              # http://localhost:5173
pnpm build            # Build producción
pnpm lint             # ESLint
```

## Estructura

```
backend/
  src/
    app.module.ts                  # Módulo raíz
    auth/                          # Autenticación JWT (teléfono + password)
    usuarios/                      # Gestión de usuarios
    programas/                     # Programas semanales JA
    asistencia/                    # Registro de asistencia (QR, WebSocket)
    gamificacion/                  # Puntos, XP, niveles, insignias, ranking
    inbox/                         # Conversaciones WhatsApp (handoff bot↔admin)
    whatsapp-bot/                  # Bot WhatsApp con Meta Cloud API + OpenAI
    calendario/                    # Calendario de actividades
    estudios-biblicos/             # Estudios bíblicos
    tipos-asistencia/              # Tipos de asistencia
    prisma/                        # Módulo Prisma
    redis/                         # Módulo Redis
  prisma/
    schema.prisma                  # Schema de la BD
    migrations/                    # Migraciones
    seed.ts                        # Seed principal

frontend/
  src/
    App.tsx                        # Router principal
    main.tsx                       # Entry point
    components/
      ui/                          # shadcn/ui components
      layout/                      # MainLayout, Sidebar
      asistencia/                  # Componentes de asistencia
      calendario/                  # Componentes de calendario
    pages/
      Login.tsx
      Dashboard.tsx
      programas/                   # CRUD programas
      asistencia/                  # Registro y gestión asistencia
      gamificacion/                # Ranking, progreso, niveles
      inbox/                       # Chat WhatsApp
      usuarios/                    # Gestión usuarios
      calendario/                  # Calendario admin
      estudios-biblicos/           # Estudios bíblicos
      admin/                       # Páginas de administración
      profile/                     # Perfil de usuario
```

## Convenciones

- **Package manager**: pnpm (nunca npm ni yarn)
- **Idioma del código**: Español para nombres de entidades/módulos, inglés para código técnico
- **Auth**: JWT con teléfono (código país + número) + password
- **Estado servidor (frontend)**: TanStack Query para fetching/cache
- **Estado global (frontend)**: Zustand
- **Formularios (frontend)**: react-hook-form + zod
- **Componentes UI**: shadcn/ui (Radix primitives + TailwindCSS)
- **ORM**: Prisma con migraciones
- **Tiempo real**: Socket.io (asistencia, inbox)
- **Validación (backend)**: class-validator + class-transformer

## URLs de desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Adminer | http://localhost:8080 |

## Credenciales dev

- Todos los usuarios: password `password`
- Admin: Jorge Vasquez
