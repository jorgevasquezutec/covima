# Covima JA - Sistema de Gestión para Jóvenes Adventistas

Sistema web para gestionar programas JA, asistencia con gamificación, y comunicación por WhatsApp.

## Funcionalidades Principales

| Módulo | Descripción |
|--------|-------------|
| **Programas JA** | Crear programas semanales, asignar participantes, generar texto para WhatsApp |
| **Asistencia** | Registro vía QR (web/bot), confirmación por admin, estadísticas |
| **Gamificación** | Puntos, niveles bíblicos, rachas, insignias, ranking trimestral |
| **Inbox** | Conversaciones de WhatsApp, handoff bot↔admin |
| **Bot WhatsApp** | Registro de asistencia, consultas de programa, IA para clasificar intents |

---

## Quick Start

### Requisitos
- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Levantar servicios (PostgreSQL, Redis, Adminer)
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
pnpm install
pnpm db:migrate    # Crea tablas y ejecuta seed
pnpm start:dev     # http://localhost:3000
```

### 3. Frontend
```bash
cd frontend
pnpm install
pnpm dev           # http://localhost:5173
```

### URLs de desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:3000/api/docs |
| Adminer (DB GUI) | http://localhost:8080 |
| Prisma Studio | `pnpm db:studio` en backend |

### Credenciales por defecto
- **Todos los usuarios**: password `password`
- **Admin**: Jorge Vasquez

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         USUARIOS                             │
│            Web App (PWA)    │    WhatsApp Bot               │
└──────────────┬──────────────┴────────────┬──────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│      FRONTEND            │    │    META CLOUD API        │
│   React + Vite + PWA     │    │    Webhook WhatsApp      │
│   TailwindCSS + shadcn   │    └───────────┬──────────────┘
└──────────────┬───────────┘                │
               │ HTTP + WebSocket           │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                      NestJS + Prisma                         │
│  ┌─────────┐ ┌───────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │  Auth   │ │ Programas │ │ Asistencia  │ │    Inbox    │  │
│  └─────────┘ └───────────┘ └─────────────┘ └─────────────┘  │
│  ┌─────────┐ ┌───────────┐ ┌─────────────┐                  │
│  │Usuarios │ │Gamificación│ │WhatsApp Bot│                  │
│  └─────────┘ └───────────┘ └─────────────┘                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │PostgreSQL│      │  Redis   │      │  OpenAI  │
   │  + Data  │      │  Cache   │      │  GPT-4o  │
   └──────────┘      └──────────┘      └──────────┘
```

---

## Módulos

### Programas JA
- Crear programa semanal con fecha
- Asignar participantes a cada parte (dinámico, 1 o más)
- Agregar links (YouTube, Kahoot) con extracción automática de títulos
- Generar texto formateado para WhatsApp
- Notificar a participantes

### Asistencia
- **Códigos QR**: Formato `JAXXXXXXXX` (8 caracteres alfanuméricos)
- **Registro**: Vía web (escaneando QR) o bot de WhatsApp
- **Validación**: Un usuario solo puede registrar una vez por código QR
- **Confirmación**: Admin confirma/rechaza asistencias
- **Tiempo real**: WebSocket muestra registros en vivo

### Gamificación
Sistema de puntos y niveles para incentivar la asistencia y participación.

| Característica | Descripción |
|---------------|-------------|
| **Puntos** | Se ganan por asistencia (temprana/normal/tardía) y participación |
| **XP** | Experiencia que acumula para subir de nivel |
| **Niveles** | 10 niveles bíblicos: Discípulo → Serafín |
| **Racha** | Semanas consecutivas de asistencia |
| **Insignias** | Logros permanentes (Madrugador, Constante, Orador, etc.) |
| **Ranking** | Ranking trimestral con Top 3 y posiciones |

**Niveles Bíblicos:**
1. Discípulo (0 XP)
2. Seguidor (100 XP)
3. Creyente (250 XP)
4. Fiel (500 XP)
5. Siervo (1000 XP)
6. Maestro (2000 XP)
7. Profeta (3500 XP)
8. Apóstol (5500 XP)
9. Arcángel (8000 XP)
10. Serafín (12000 XP)

### Inbox (Conversaciones WhatsApp)
- Ver todas las conversaciones del bot
- **Handoff**: Tomar conversación del bot → responder como humano → devolver al bot
- Mensajes en tiempo real con WebSocket
- Transferir conversación a otro admin

### Bot de WhatsApp
- Clasificación de intents con OpenAI GPT-4o
- **Asistencia**: "Registrar asistencia", "Quiero marcar asistencia JA7K9M2PQR"
- **Programas**: "Ver programa", "Quién participa esta semana"
- **Usuarios**: "Registrar a Juan 987654321"
- **Comandos admin**: `/cerrar`, `/pendientes`, `>> mensaje`

---

## Documentación Detallada

| Documento | Descripción |
|-----------|-------------|
| [Backend README](./backend/README.md) | API, módulos, endpoints, base de datos |
| [Frontend README](./frontend/README.md) | Páginas, componentes, hooks, rutas |
| [Deploy Azure](./DEPLOY-AZURE.md) | Guía de deployment en Azure VM |
| [Cheatsheet](./CHEATSHEET.md) | Comandos rápidos para deployment |
| [Gamificación](./docs/GAMIFICACION.md) | Diseño detallado del sistema |
| [Inbox/Handoff](./docs/INBOX-HANDOFF.md) | Diseño del sistema de inbox |
| [Insignias](./frontend/docs/INSIGNIAS-SISTEMA.md) | Sistema de badges |

---

## Stack Tecnológico

### Backend
- **NestJS** - Framework Node.js
- **Prisma** - ORM
- **PostgreSQL** - Base de datos
- **Redis** - Cache y pub/sub
- **Socket.io** - WebSocket
- **OpenAI** - Clasificación de intents

### Frontend
- **React 18** - UI
- **Vite** - Build tool
- **TypeScript** - Tipado
- **TailwindCSS** - Estilos
- **shadcn/ui** - Componentes
- **TanStack Query** - Estado servidor
- **Zustand** - Estado global

### Infraestructura
- **Docker Compose** - Desarrollo local
- **Azure VM** - Producción
- **Caddy** - Reverse proxy + SSL
- **GitHub Actions** - CI/CD

---

## Scripts Útiles

### Backend
```bash
pnpm start:dev     # Desarrollo
pnpm db:migrate    # Migraciones + seed
pnpm db:studio     # GUI de Prisma
pnpm test          # Tests
```

### Frontend
```bash
pnpm dev           # Desarrollo
pnpm build         # Build producción
pnpm lint          # Linting
```

---

## Producción

| URL | Descripción |
|-----|-------------|
| https://covima.jvasquez.me | Frontend |
| https://covima-api.jvasquez.me | Backend API |
| https://covima-api.jvasquez.me/api/docs | Swagger |

---

## Licencia

Proyecto privado - Todos los derechos reservados.
