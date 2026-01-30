# Backend - Covima JA

API REST y Bot de WhatsApp para el sistema de gestión de Programa JA y Asistencia.

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| NestJS | 10.x | Framework principal |
| Prisma | 5.x | ORM |
| PostgreSQL | 15+ | Base de datos |
| Redis | 7.x | Cache y pub/sub (WebSocket) |
| Socket.io | 4.x | Tiempo real (Inbox, Asistencia) |
| OpenAI | GPT-4o | Clasificación de intents del bot |

---

## Estructura de Módulos

```
src/
├── auth/                 # Autenticación JWT
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   └── strategies/       # JWT Strategy
├── usuarios/             # CRUD de usuarios y roles
├── programas/            # Gestión de programas JA
├── asistencia/           # QR, registro, confirmación
│   └── gateway/          # WebSocket para registro en vivo
├── tipos-asistencia/     # Catálogo de tipos (JA, ES, etc.)
├── gamificacion/         # Puntos, niveles, insignias, rankings
├── inbox/                # Conversaciones y handoff
│   └── gateway/          # WebSocket para chat en tiempo real
├── whatsapp-bot/         # Bot de WhatsApp
│   └── handlers/         # Handlers por módulo
├── prisma/               # Cliente Prisma
├── redis/                # Servicio Redis
└── common/               # Utilidades compartidas
```

---

## Módulos Principales

### Auth (`/api/auth`)
- `POST /login` - Login con teléfono + contraseña
- `GET /me` - Usuario actual
- `POST /change-password` - Cambiar contraseña

### Usuarios (`/api/usuarios`)
- CRUD completo de usuarios
- Gestión de roles (admin, líder, participante)
- Reset de contraseña por admin

### Programas (`/api/programas`)
- CRUD de programas semanales
- Asignación de participantes a partes
- Generación de texto para WhatsApp
- Parsing de programa con IA

### Asistencia (`/api/asistencia`)
- Generación de códigos QR (formato: `JAXXXXXXXX`)
- Registro de asistencia vía web o bot
- Confirmación/rechazo por admin
- **Validación**: Un usuario solo puede registrar una vez por código QR
- WebSocket para registro en tiempo real

### Gamificación (`/api/gamificacion`)
- **Puntos**: Por asistencia (temprana/normal/tardía) y participación
- **XP y Niveles**: 10 niveles bíblicos (Discípulo → Serafín)
- **Racha**: Semanas consecutivas de asistencia
- **Insignias**: Logros permanentes desbloqueables
- **Rankings**: Trimestrales con filtros

### Inbox (`/api/inbox`)
- Conversaciones de WhatsApp
- Handoff: Bot → Admin → Bot
- Respuestas desde la plataforma
- WebSocket para mensajes en tiempo real

### WhatsApp Bot (`/whatsapp/webhook`)
- Webhook de Meta Cloud API
- Clasificación de intents con OpenAI
- Handlers: asistencia, usuarios, programas, notificaciones
- Comandos admin: `/cerrar`, `/pendientes`, `>>`

---

## API Endpoints

### Gamificación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/gamificacion/mi-progreso` | Perfil del usuario actual |
| GET | `/gamificacion/ranking` | Ranking con filtros |
| GET | `/gamificacion/niveles` | Lista de niveles |
| GET | `/gamificacion/mis-insignias` | Insignias del usuario |
| GET | `/gamificacion/config-puntajes` | [Admin] Configuración de puntos |
| PUT | `/gamificacion/config-puntajes/:id` | [Admin] Editar puntos |

### Asistencia

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/asistencia` | Listar asistencias |
| GET | `/asistencia/qr` | Listar códigos QR |
| POST | `/asistencia/qr` | Crear código QR |
| DELETE | `/asistencia/qr/:id` | Eliminar QR (cascade) |
| POST | `/asistencia/registrar` | Registrar asistencia |
| POST | `/asistencia/confirmar` | Confirmar asistencias |

### Inbox

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/inbox/conversaciones` | Listar conversaciones |
| GET | `/inbox/conversaciones/:id/mensajes` | Mensajes de una conversación |
| POST | `/inbox/conversaciones/:id/mensajes` | Enviar mensaje |
| POST | `/inbox/conversaciones/:id/tomar` | Tomar conversación (handoff) |
| POST | `/inbox/conversaciones/:id/cerrar` | Devolver al bot |

---

## Base de Datos

### Tablas Principales

```
usuarios              # Usuarios del sistema
usuarios_roles        # Relación usuario-rol
roles                 # admin, lider, participante

programas             # Programas semanales
programa_asignaciones # Participantes asignados
partes                # Catálogo de partes del programa

qr_asistencia         # Códigos QR generados
asistencias           # Registros de asistencia
tipos_asistencia      # JA, Escuela Sabática, etc.

conversaciones        # Conversaciones WhatsApp
mensajes              # Mensajes de conversaciones

usuarios_gamificacion # Perfil de gamificación
historial_puntos      # Registro de puntos asignados
config_puntaje        # Valores de puntos configurables
niveles_biblicos      # Definición de niveles
insignias             # Definición de badges
usuarios_insignias    # Badges desbloqueados
```

### Formato de Códigos QR

```
JAXXXXXXXX
│ └────────── 8 caracteres alfanuméricos (sin ambiguos: 0,1,I,L,O)
└──────────── Prefijo fijo "JA"

Ejemplo: JA7K9M2PQR
```

---

## Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/covima_ja

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=tu_secret_muy_largo_y_seguro

# WhatsApp Meta Cloud API
WHATSAPP_TOKEN=EAAxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=tu_verify_token
WHATSAPP_BOT_NUMBER=51999888777

# OpenAI
OPENAI_API_KEY=sk-xxxxxxx

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm start:dev

# Base de datos
pnpm db:generate   # Genera cliente Prisma
pnpm db:migrate    # Aplica migraciones + seed
pnpm db:push       # Push rápido (desarrollo)
pnpm db:seed       # Ejecuta seed
pnpm db:studio     # GUI de Prisma

# Tests
pnpm test          # Tests unitarios
pnpm test:e2e      # Tests E2E

# Build
pnpm build
pnpm start:prod
```

---

## WebSockets

### Namespace: `/asistencia`
- `join-room`: Unirse a sala de QR para ver registros en vivo
- `nueva-asistencia`: Evento cuando alguien registra asistencia

### Namespace: `/inbox`
- `inbox:mensaje:nuevo`: Nuevo mensaje en conversación
- `inbox:conversacion:actualizada`: Cambio de estado
- `inbox:typing`: Indicador de escritura

---

## Documentación Adicional

- [Gamificación detallada](../docs/GAMIFICACION.md)
- [Sistema de Inbox](../docs/INBOX-HANDOFF.md)
- [Insignias](../frontend/docs/INSIGNIAS-SISTEMA.md)
