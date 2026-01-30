# Frontend - Covima JA

Aplicación web PWA para gestión de Programa JA, Asistencia y Gamificación.

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Framework UI |
| Vite | 5.x | Build tool |
| TypeScript | 5.x | Tipado |
| TailwindCSS | 3.x | Estilos |
| shadcn/ui | - | Componentes UI |
| TanStack Query | 5.x | Estado servidor |
| Zustand | 4.x | Estado global |
| React Router | 6.x | Routing |
| Socket.io Client | 4.x | WebSocket |

---

## Estructura del Proyecto

```
src/
├── assets/              # Imágenes y recursos estáticos
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── layout/          # MainLayout, Sidebar, Header
│   └── asistencia/      # Componentes de asistencia
├── hooks/               # Hooks personalizados
├── lib/                 # Utilidades (cn, formatters)
├── pages/
│   ├── Login.tsx        # Página de login
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── admin/           # Páginas de administración
│   ├── asistencia/      # Gestión de asistencias y QR
│   ├── gamificacion/    # Ranking, Mi Progreso
│   ├── inbox/           # Conversaciones WhatsApp
│   ├── profile/         # Perfil del usuario
│   ├── programas/       # Gestión de programas
│   └── usuarios/        # CRUD de usuarios
├── services/
│   └── api.ts           # Cliente Axios configurado
├── store/
│   └── authStore.ts     # Estado de autenticación
└── types/
    └── index.ts         # Tipos TypeScript
```

---

## Páginas Principales

### Dashboard (`/`)
- Estadísticas de asistencia del usuario
- Widget de progreso de gamificación
- Próximas participaciones en programas
- Accesos rápidos según rol

### Asistencia (`/asistencia`)
- **Lista de asistencias**: Filtros por estado, paginación
- **Códigos QR**: Crear, ver, eliminar QR
- **Registro en vivo**: WebSocket muestra registros en tiempo real
- **Confirmación**: Admin confirma/rechaza asistencias

### Gamificación
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/ranking` | RankingPage | Ranking trimestral con Top 3 y tabla |
| `/mi-progreso` | MiProgresoPage | Nivel, XP, puntos, racha, insignias |
| `/admin/gamificacion/puntajes` | ConfigPuntajesPage | [Admin] Configurar valores de puntos |

### Inbox (`/inbox`)
- Lista de conversaciones de WhatsApp
- Chat con mensajes en tiempo real
- Handoff: Tomar/cerrar conversación
- Transferir a otro admin

### Programas (`/programas`)
- Lista de programas por fecha
- Crear/editar programa
- Asignar participantes a partes
- Generar texto para WhatsApp

### Usuarios (`/usuarios`)
- CRUD de usuarios
- Asignar roles
- Reset de contraseña

---

## Componentes Clave

### Layout
```tsx
// components/layout/
├── MainLayout.tsx      // Layout principal con sidebar
├── Sidebar.tsx         // Navegación lateral
├── Header.tsx          // Header con usuario
└── ProtectedRoute.tsx  // Protección de rutas
```

### Gamificación
```tsx
// pages/gamificacion/components/
├── RankingTop3.tsx     // Podio con medallas
├── RankingTable.tsx    // Tabla de posiciones
├── NivelBadge.tsx      // Badge del nivel actual
├── ProgresoXP.tsx      // Barra de progreso XP
├── RachaDisplay.tsx    // Visualización de racha
└── InsigniasGrid.tsx   // Grid de insignias
```

### Inbox
```tsx
// pages/inbox/components/
├── ConversationList.tsx  // Lista de conversaciones
├── ChatWindow.tsx        // Ventana de chat
├── MessageList.tsx       // Lista de mensajes
├── MessageBubble.tsx     // Burbuja de mensaje
├── MessageInput.tsx      // Input de mensaje
└── ChatHeader.tsx        // Header con acciones
```

---

## Hooks Personalizados

| Hook | Uso |
|------|-----|
| `useAuth()` | Estado de autenticación (Zustand) |
| `useConversations()` | Query de conversaciones |
| `useMessages()` | Query infinito de mensajes |
| `useInboxSocket()` | WebSocket del inbox |
| `useSendMessage()` | Mutation enviar mensaje |

---

## Estado Global (Zustand)

```typescript
// store/authStore.ts
interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
}
```

---

## Servicios API

```typescript
// services/api.ts

// Auth
authApi.login(telefono, password)
authApi.me()
authApi.changePassword(oldPassword, newPassword)

// Usuarios
usuariosApi.getAll()
usuariosApi.create(data)
usuariosApi.update(id, data)
usuariosApi.delete(id)

// Asistencia
asistenciaApi.getAll(params)
asistenciaApi.getQRs()
asistenciaApi.createQR(data)
asistenciaApi.deleteQR(id)
asistenciaApi.registrar(data)
asistenciaApi.confirmar(ids, estado)

// Gamificación
gamificacionApi.getMiProgreso()
gamificacionApi.getRanking(params)
gamificacionApi.getNiveles()
gamificacionApi.getConfigPuntajes()

// Inbox
inboxApi.getConversaciones(params)
inboxApi.getMensajes(conversacionId, params)
inboxApi.enviarMensaje(conversacionId, contenido)
inboxApi.tomarConversacion(conversacionId)
inboxApi.cerrarHandoff(conversacionId)

// Programas
programasApi.getAll()
programasApi.getById(id)
programasApi.create(data)
programasApi.update(id, data)
```

---

## Rutas y Permisos

| Ruta | Roles | Descripción |
|------|-------|-------------|
| `/` | Todos | Dashboard |
| `/login` | Público | Login |
| `/asistencia` | admin, líder | Gestión de asistencias |
| `/asistencia/registrar` | Todos | Registrar mi asistencia |
| `/programas` | admin, líder | Lista de programas |
| `/programas/nuevo` | admin, líder | Crear programa |
| `/usuarios` | admin | Gestión de usuarios |
| `/inbox` | admin, líder | Inbox de WhatsApp |
| `/ranking` | Todos | Ranking de gamificación |
| `/mi-progreso` | Todos | Mi progreso |
| `/profile` | Todos | Mi perfil |
| `/admin/gamificacion/puntajes` | admin | Config de puntajes |

---

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev              # http://localhost:5173

# Build
pnpm build            # Genera dist/
pnpm preview          # Preview del build

# Linting
pnpm lint             # ESLint
pnpm lint:fix         # ESLint + fix
```

---

## Variables de Entorno

```env
# API URL
VITE_API_URL=http://localhost:3000/api
```

---

## PWA

La aplicación es instalable como PWA:
- Manifest configurado
- Service Worker con Workbox
- Iconos para iOS y Android
- Funciona offline (cache de assets)

---

## Responsive Design

- **Mobile** (< 768px): Bottom navigation, cards apiladas
- **Tablet** (768px - 1024px): Sidebar colapsable
- **Desktop** (> 1024px): Sidebar fijo, layout de grid

---

## Documentación Adicional

- [Sistema de Insignias](./docs/INSIGNIAS-SISTEMA.md)
- [Rankings Múltiples (propuesta)](./docs/RANKINGS-MULTIPLES.md)
