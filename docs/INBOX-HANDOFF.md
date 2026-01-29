# Sistema de Inbox y Handoff

Sistema interno de mensajería para gestionar conversaciones de WhatsApp con capacidad de intervención humana (handoff).

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [API Endpoints](#api-endpoints)
4. [Paginación Estilo WhatsApp](#paginación-estilo-whatsapp)
5. [WebSocket - Tiempo Real](#websocket---tiempo-real)
6. [Flujo de Handoff](#flujo-de-handoff)
7. [Responder desde WhatsApp](#responder-desde-whatsapp-del-admin)
8. [Optimizaciones](#optimizaciones)
9. [Frontend - Componentes](#frontend---componentes)

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ InboxList     │  │ ChatWindow    │  │ MessageInput  │       │
│  │ (virtual list)│  │ (virtual list)│  │               │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             │                                   │
│                      WebSocket + REST                           │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                         BACKEND                                 │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────┐       │
│  │                 InboxGateway (WebSocket)             │       │
│  │  - inbox:mensajes:nuevo                              │       │
│  │  - inbox:conversacion:actualizada                    │       │
│  │  - inbox:typing                                      │       │
│  └──────────────────────────┬──────────────────────────┘       │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────┐       │
│  │                 InboxService                         │       │
│  │  - getConversaciones(cursor, limit)                  │       │
│  │  - getMensajes(conversacionId, cursor, limit)        │       │
│  │  - enviarMensaje(conversacionId, contenido)          │       │
│  │  - tomarConversacion(conversacionId, adminId)        │       │
│  │  - cerrarHandoff(conversacionId)                     │       │
│  └──────────────────────────┬──────────────────────────┘       │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────┐       │
│  │                 WhatsAppBotService                   │       │
│  │  - Detecta mensajes de admins                        │       │
│  │  - Reenvía en modo handoff                           │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Schema Prisma

```prisma
// Extender el modelo Conversacion existente
model Conversacion {
  id              String             @id @default(cuid())
  telefono        String             @unique
  usuarioId       String?
  usuario         Usuario?           @relation(fields: [usuarioId], references: [id])
  estado          String             @default("inicio")
  moduloActivo    String?
  contexto        Json               @default("{}")

  // === NUEVOS CAMPOS PARA INBOX/HANDOFF ===
  modo            ModoConversacion   @default(BOT)
  derivadaA       Usuario?           @relation("ConversacionesDerivadas", fields: [derivadaAId], references: [id])
  derivadaAId     String?
  derivadaAt      DateTime?

  // Metadata para el inbox
  ultimoMensaje   String?            // Preview del último mensaje
  mensajesNoLeidos Int               @default(0)

  mensajes        Mensaje[]

  creadoAt        DateTime           @default(now())
  actualizadoAt   DateTime           @updatedAt

  @@index([modo, actualizadoAt(sort: Desc)])
  @@index([derivadaAId, modo])
}

model Mensaje {
  id              String           @id @default(cuid())
  conversacion    Conversacion     @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  conversacionId  String

  contenido       String           @db.Text
  tipo            TipoMensaje      @default(TEXTO)
  direccion       DireccionMensaje

  // Quién envió (null = bot automático)
  enviadoPor      Usuario?         @relation(fields: [enviadoPorId], references: [id])
  enviadoPorId    String?

  // Metadata de WhatsApp
  whatsappMsgId   String?          @unique
  estado          EstadoMensaje    @default(ENVIADO)

  creadoAt        DateTime         @default(now())
  leidoAt         DateTime?

  // Índice compuesto para paginación eficiente
  @@index([conversacionId, creadoAt(sort: Desc)])
  @@index([whatsappMsgId])
}

enum ModoConversacion {
  BOT       // Bot responde automáticamente
  HANDOFF   // Admin atendiendo
  PAUSADO   // En espera de asignación
}

enum TipoMensaje {
  TEXTO
  IMAGEN
  AUDIO
  DOCUMENTO
  UBICACION
  CONTACTO
  STICKER
}

enum DireccionMensaje {
  ENTRANTE  // Usuario → Sistema
  SALIENTE  // Sistema → Usuario
}

enum EstadoMensaje {
  PENDIENTE
  ENVIADO
  ENTREGADO
  LEIDO
  FALLIDO
}
```

### Índices Críticos

```sql
-- Para listar conversaciones ordenadas por actividad
CREATE INDEX idx_conversacion_modo_updated ON "Conversacion"(modo, "actualizadoAt" DESC);

-- Para paginación de mensajes (cursor-based)
CREATE INDEX idx_mensaje_conv_created ON "Mensaje"("conversacionId", "creadoAt" DESC);

-- Para buscar mensaje por ID de WhatsApp (deduplicación)
CREATE UNIQUE INDEX idx_mensaje_wa_id ON "Mensaje"("whatsappMsgId") WHERE "whatsappMsgId" IS NOT NULL;

-- Para handoff: encontrar conversaciones de un admin
CREATE INDEX idx_conversacion_derivada ON "Conversacion"("derivadaAId", modo) WHERE "derivadaAId" IS NOT NULL;
```

---

## API Endpoints

### Conversaciones

```typescript
// GET /api/inbox/conversaciones
// Listar conversaciones con paginación por cursor
{
  query: {
    cursor?: string,      // ID de la última conversación
    limit?: number,       // Default: 20, Max: 50
    modo?: 'BOT' | 'HANDOFF' | 'PAUSADO' | 'TODOS'
  },
  response: {
    data: Conversacion[],
    nextCursor: string | null,
    hasMore: boolean
  }
}

// GET /api/inbox/conversaciones/:id
// Obtener detalle de una conversación
{
  response: {
    id: string,
    telefono: string,
    usuario: { id, nombre, apellido, foto } | null,
    modo: 'BOT' | 'HANDOFF' | 'PAUSADO',
    derivadaA: { id, nombre } | null,
    ultimoMensaje: string,
    mensajesNoLeidos: number,
    actualizadoAt: Date
  }
}
```

### Mensajes

```typescript
// GET /api/inbox/conversaciones/:id/mensajes
// Obtener mensajes con paginación por cursor (estilo WhatsApp)
{
  query: {
    cursor?: string,      // ID del mensaje más antiguo visible
    limit?: number,       // Default: 50, Max: 100
    direccion?: 'antes' | 'despues'  // Default: 'antes' (scroll up)
  },
  response: {
    data: Mensaje[],
    nextCursor: string | null,
    hasMore: boolean,
    totalCount: number    // Solo en primera carga
  }
}

// POST /api/inbox/conversaciones/:id/mensajes
// Enviar mensaje como admin
{
  body: {
    contenido: string,
    tipo?: 'TEXTO' | 'IMAGEN' | 'DOCUMENTO'
  },
  response: {
    mensaje: Mensaje,
    enviado: boolean
  }
}
```

### Handoff

```typescript
// POST /api/inbox/conversaciones/:id/tomar
// Admin toma la conversación
{
  response: {
    success: boolean,
    conversacion: Conversacion
  }
}

// POST /api/inbox/conversaciones/:id/cerrar
// Devolver al bot
{
  body: {
    mensajeDespedida?: string  // Opcional: "Gracias, el bot te seguirá atendiendo"
  },
  response: {
    success: boolean
  }
}

// POST /api/inbox/conversaciones/:id/transferir
// Transferir a otro admin
{
  body: {
    adminId: string
  },
  response: {
    success: boolean
  }
}
```

### Acciones

```typescript
// POST /api/inbox/conversaciones/:id/leer
// Marcar mensajes como leídos
{
  body: {
    hastaMessageId?: string  // Marcar todos hasta este mensaje
  }
}

// POST /api/inbox/conversaciones/:id/typing
// Indicador de escritura
{
  body: {
    isTyping: boolean
  }
}
```

---

## Paginación Estilo WhatsApp

### Estrategia: Cursor-based Pagination

```typescript
// ❌ MALO: Offset pagination (lento con muchos datos)
SELECT * FROM mensajes
WHERE conversacion_id = ?
ORDER BY creado_at DESC
OFFSET 1000 LIMIT 50;  // Escanea 1050 filas

// ✅ BUENO: Cursor pagination (siempre rápido)
SELECT * FROM mensajes
WHERE conversacion_id = ?
  AND creado_at < ?   -- cursor (timestamp del último mensaje visible)
ORDER BY creado_at DESC
LIMIT 50;  // Escanea solo 50 filas
```

### Implementación Backend

```typescript
// inbox.service.ts
async getMensajes(
  conversacionId: string,
  cursor?: string,
  limit = 50,
  direccion: 'antes' | 'despues' = 'antes'
): Promise<PaginatedResponse<Mensaje>> {

  let cursorDate: Date | undefined;

  if (cursor) {
    const cursorMsg = await this.prisma.mensaje.findUnique({
      where: { id: cursor },
      select: { creadoAt: true }
    });
    cursorDate = cursorMsg?.creadoAt;
  }

  const mensajes = await this.prisma.mensaje.findMany({
    where: {
      conversacionId,
      ...(cursorDate && {
        creadoAt: direccion === 'antes'
          ? { lt: cursorDate }  // Mensajes más antiguos
          : { gt: cursorDate }  // Mensajes más nuevos
      })
    },
    orderBy: { creadoAt: 'desc' },
    take: limit + 1,  // +1 para saber si hay más
    include: {
      enviadoPor: {
        select: { id: true, nombre: true, apellido: true }
      }
    }
  });

  const hasMore = mensajes.length > limit;
  const data = hasMore ? mensajes.slice(0, -1) : mensajes;

  return {
    data: data.reverse(),  // Orden cronológico para el frontend
    nextCursor: hasMore ? data[0].id : null,
    hasMore
  };
}
```

### Implementación Frontend

```typescript
// hooks/useMessages.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useMessages(conversacionId: string) {
  return useInfiniteQuery({
    queryKey: ['mensajes', conversacionId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);

      const res = await api.get(
        `/inbox/conversaciones/${conversacionId}/mensajes?${params}`
      );
      return res.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1000 * 60,  // 1 minuto
    refetchOnWindowFocus: false,
  });
}

// Uso en componente
function ChatWindow({ conversacionId }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useMessages(conversacionId);

  const mensajes = data?.pages.flatMap(p => p.data) ?? [];

  return (
    <VirtualizedList
      items={mensajes}
      onReachTop={() => hasNextPage && fetchNextPage()}
      loading={isFetchingNextPage}
    />
  );
}
```

---

## WebSocket - Tiempo Real

### Eventos

```typescript
// Gateway events
enum InboxEvents {
  // Server → Client
  MENSAJE_NUEVO = 'inbox:mensaje:nuevo',
  CONVERSACION_ACTUALIZADA = 'inbox:conversacion:actualizada',
  TYPING = 'inbox:typing',
  ESTADO_MENSAJE = 'inbox:mensaje:estado',

  // Client → Server
  JOIN_CONVERSACION = 'inbox:join',
  LEAVE_CONVERSACION = 'inbox:leave',
  MARCAR_LEIDO = 'inbox:leer',
  ENVIAR_TYPING = 'inbox:typing:enviar'
}
```

### Gateway Implementation

```typescript
// inbox.gateway.ts
@WebSocketGateway({ namespace: '/inbox' })
export class InboxGateway {
  @WebSocketServer()
  server: Server;

  // Admin se une a una conversación específica
  @SubscribeMessage('inbox:join')
  handleJoin(client: Socket, conversacionId: string) {
    client.join(`conv:${conversacionId}`);
  }

  // Notificar nuevo mensaje
  emitMensajeNuevo(conversacionId: string, mensaje: Mensaje) {
    // A la sala de la conversación (admins viendo ese chat)
    this.server.to(`conv:${conversacionId}`).emit('inbox:mensaje:nuevo', mensaje);

    // A todos los admins (para actualizar lista)
    this.server.emit('inbox:conversacion:actualizada', {
      id: conversacionId,
      ultimoMensaje: mensaje.contenido,
      actualizadoAt: mensaje.creadoAt
    });
  }

  // Typing indicator
  emitTyping(conversacionId: string, isTyping: boolean, from: string) {
    this.server.to(`conv:${conversacionId}`).emit('inbox:typing', {
      conversacionId,
      isTyping,
      from
    });
  }
}
```

### Cliente React

```typescript
// hooks/useInboxSocket.ts
export function useInboxSocket(conversacionId?: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket>();

  useEffect(() => {
    const socket = io('/inbox', {
      auth: { token: getAuthToken() }
    });
    socketRef.current = socket;

    // Unirse a conversación específica
    if (conversacionId) {
      socket.emit('inbox:join', conversacionId);
    }

    // Nuevo mensaje
    socket.on('inbox:mensaje:nuevo', (mensaje: Mensaje) => {
      queryClient.setQueryData(
        ['mensajes', mensaje.conversacionId],
        (old: any) => {
          if (!old) return old;
          // Agregar mensaje al final de la última página
          const newPages = [...old.pages];
          const lastPage = { ...newPages[newPages.length - 1] };
          lastPage.data = [...lastPage.data, mensaje];
          newPages[newPages.length - 1] = lastPage;
          return { ...old, pages: newPages };
        }
      );
    });

    // Actualización de conversación (para la lista)
    socket.on('inbox:conversacion:actualizada', (update) => {
      queryClient.invalidateQueries({
        queryKey: ['conversaciones'],
        refetchType: 'active'
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [conversacionId]);

  return socketRef.current;
}
```

---

## Flujo de Handoff

### Diagrama de Estados

```
                    ┌─────────────────────┐
                    │                     │
        ┌───────────│        BOT          │◄──────────┐
        │           │  (Bot automático)   │           │
        │           └──────────┬──────────┘           │
        │                      │                      │
        │         Admin toma   │                      │
        │         conversación │                      │
        │                      ▼                      │
        │           ┌─────────────────────┐           │
        │           │                     │           │
        │           │      HANDOFF        │───────────┤
        │           │  (Admin atendiendo) │           │
        │           └──────────┬──────────┘           │
        │                      │                      │
        │                      │ Admin cierra         │
        │                      │ o transfiere         │
        │                      ▼                      │
        │           ┌─────────────────────┐           │
        └───────────│                     │           │
     Timeout 24h    │      PAUSADO        │───────────┘
                    │  (Sin asignar)      │  Admin toma
                    └─────────────────────┘
```

### Lógica en el Bot

```typescript
// intent-router.service.ts
async processMessage(
  conversacionId: string,
  mensaje: string,
  telefono: string,
  nombreWhatsapp: string,
  messageId: string
) {
  // Guardar mensaje entrante SIEMPRE
  const mensajeGuardado = await this.inboxService.guardarMensaje({
    conversacionId,
    contenido: mensaje,
    direccion: 'ENTRANTE',
    whatsappMsgId: messageId
  });

  // Obtener conversación
  const conversacion = await this.prisma.conversacion.findUnique({
    where: { id: conversacionId },
    include: { derivadaA: true }
  });

  // Si está en HANDOFF, no procesar con bot
  if (conversacion.modo === 'HANDOFF') {
    // Notificar al admin via WebSocket
    this.inboxGateway.emitMensajeNuevo(conversacionId, mensajeGuardado);

    // Opcional: reenviar al WhatsApp del admin
    if (conversacion.derivadaA?.telefono) {
      await this.reenviarAAdmin(conversacion, mensaje, nombreWhatsapp);
    }

    return; // No procesar con bot
  }

  // Flujo normal del bot...
  await this.routeToHandler(...);
}
```

---

## Responder desde WhatsApp del Admin

### Detección de Mensaje de Admin

```typescript
// whatsapp-bot.controller.ts
@Post('webhook')
async handleWebhook(@Body() payload: WhatsAppWebhookPayload) {
  // ... extraer datos del mensaje ...

  const telefono = message.from;
  const contenido = message.text?.body || '';

  // Verificar si es un admin/líder
  const admin = await this.prisma.usuario.findFirst({
    where: {
      telefono: { endsWith: telefono.slice(-9) },
      rol: { in: ['ADMIN', 'LIDER'] }
    }
  });

  if (admin) {
    // Procesar como comando de admin
    await this.procesarMensajeAdmin(admin, contenido, messageId);
    return { status: 'ok' };
  }

  // Procesar como usuario normal
  await this.intentRouter.processMessage(...);
}
```

### Comandos de Admin via WhatsApp

```typescript
async procesarMensajeAdmin(admin: Usuario, mensaje: string, messageId: string) {
  // Buscar si tiene conversación activa en handoff
  const conversacionActiva = await this.prisma.conversacion.findFirst({
    where: { derivadaAId: admin.id, modo: 'HANDOFF' }
  });

  // Comando: cerrar handoff
  if (mensaje.toLowerCase() === '/cerrar') {
    if (conversacionActiva) {
      await this.inboxService.cerrarHandoff(conversacionActiva.id);
      await this.whatsappService.sendWhatsAppMessage(
        admin.telefono,
        '✅ Conversación cerrada. El bot retomará la atención.'
      );
    }
    return;
  }

  // Comando: ver conversaciones pendientes
  if (mensaje.toLowerCase() === '/pendientes') {
    const pendientes = await this.prisma.conversacion.count({
      where: { modo: 'PAUSADO' }
    });
    await this.whatsappService.sendWhatsAppMessage(
      admin.telefono,
      `📋 Hay ${pendientes} conversaciones pendientes de atención.`
    );
    return;
  }

  // Responder a conversación activa
  if (conversacionActiva && mensaje.startsWith('>>')) {
    const contenido = mensaje.slice(2).trim();

    // Enviar al usuario
    await this.whatsappService.sendWhatsAppMessage(
      conversacionActiva.telefono,
      contenido
    );

    // Guardar en BD
    await this.inboxService.guardarMensaje({
      conversacionId: conversacionActiva.id,
      contenido,
      direccion: 'SALIENTE',
      enviadoPorId: admin.id
    });

    return;
  }

  // Si no hay conversación activa y escribe >>, informar
  if (mensaje.startsWith('>>')) {
    await this.whatsappService.sendWhatsAppMessage(
      admin.telefono,
      '⚠️ No tienes ninguna conversación activa. Toma una desde la plataforma.'
    );
    return;
  }

  // Mensaje normal del admin (como usuario)
  // Procesar normalmente...
}
```

### Formato de Reenvío al Admin

```typescript
async reenviarAAdmin(conversacion: Conversacion, mensaje: string, nombre: string) {
  const textoReenvio = `
📨 *Mensaje de ${nombre}*
📱 ${conversacion.telefono}

${mensaje}

_Responde con >> seguido de tu mensaje_
_Ejemplo: >>Hola, ¿en qué puedo ayudarte?_
`.trim();

  await this.whatsappService.sendWhatsAppMessage(
    conversacion.derivadaA.telefono,
    textoReenvio
  );
}
```

---

## Optimizaciones

### 1. Caché de Conversaciones Activas

```typescript
// Usar Redis para conversaciones en handoff
@Injectable()
export class HandoffCacheService {
  constructor(private redis: RedisService) {}

  async setHandoff(adminId: string, conversacionId: string) {
    await this.redis.set(
      `handoff:admin:${adminId}`,
      conversacionId,
      'EX',
      86400  // 24 horas
    );
  }

  async getHandoff(adminId: string): Promise<string | null> {
    return this.redis.get(`handoff:admin:${adminId}`);
  }

  async clearHandoff(adminId: string) {
    await this.redis.del(`handoff:admin:${adminId}`);
  }
}
```

### 2. Virtualización en Frontend

```typescript
// Usar @tanstack/react-virtual para listas grandes
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,  // Altura estimada de mensaje
    overscan: 5,  // Renderizar 5 extra arriba/abajo
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <MessageBubble
            key={virtualItem.key}
            message={messages[virtualItem.index]}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3. Limpieza Automática de Mensajes Antiguos

```typescript
// Cron job para archivar mensajes viejos
@Cron('0 3 * * *')  // Todos los días a las 3am
async archivarMensajesAntiguos() {
  const fechaLimite = subMonths(new Date(), 6);  // 6 meses

  // Mover a tabla de archivo
  await this.prisma.$executeRaw`
    INSERT INTO mensaje_archivo
    SELECT * FROM "Mensaje"
    WHERE "creadoAt" < ${fechaLimite}
  `;

  // Eliminar de tabla principal
  await this.prisma.mensaje.deleteMany({
    where: { creadoAt: { lt: fechaLimite } }
  });
}
```

### 4. Compresión de Contenido

```typescript
// Para mensajes muy largos, comprimir en BD
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Al guardar (si > 1KB)
if (contenido.length > 1024) {
  const compressed = await gzipAsync(Buffer.from(contenido));
  // Guardar como base64 con prefijo
  contenidoFinal = `gzip:${compressed.toString('base64')}`;
}

// Al leer
if (mensaje.contenido.startsWith('gzip:')) {
  const compressed = Buffer.from(mensaje.contenido.slice(5), 'base64');
  mensaje.contenido = (await gunzipAsync(compressed)).toString();
}
```

---

## Frontend - Componentes

### Estructura de Páginas

```
src/pages/inbox/
├── InboxPage.tsx           # Layout principal (lista + chat)
├── components/
│   ├── ConversationList.tsx    # Lista de conversaciones
│   ├── ConversationItem.tsx    # Item individual
│   ├── ChatWindow.tsx          # Ventana de chat
│   ├── MessageList.tsx         # Lista virtualizada de mensajes
│   ├── MessageBubble.tsx       # Burbuja de mensaje
│   ├── MessageInput.tsx        # Input para escribir
│   ├── ChatHeader.tsx          # Header con info y acciones
│   └── HandoffControls.tsx     # Botones tomar/cerrar
├── hooks/
│   ├── useConversations.ts     # Query de conversaciones
│   ├── useMessages.ts          # Query infinito de mensajes
│   ├── useInboxSocket.ts       # WebSocket
│   └── useSendMessage.ts       # Mutation enviar mensaje
└── types/
    └── inbox.types.ts          # Tipos TypeScript
```

### Layout Principal

```tsx
// InboxPage.tsx
export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-screen">
      {/* Lista de conversaciones */}
      <aside className="w-80 border-r">
        <ConversationList
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>

      {/* Ventana de chat */}
      <main className="flex-1">
        {selectedId ? (
          <ChatWindow conversacionId={selectedId} />
        ) : (
          <EmptyState message="Selecciona una conversación" />
        )}
      </main>
    </div>
  );
}
```

### Chat Window

```tsx
// ChatWindow.tsx
export function ChatWindow({ conversacionId }: Props) {
  const { data: conversacion } = useConversation(conversacionId);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useMessages(conversacionId);

  useInboxSocket(conversacionId);

  const mensajes = data?.pages.flatMap(p => p.data) ?? [];

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversacion={conversacion} />

      <MessageList
        mensajes={mensajes}
        onLoadMore={() => hasNextPage && fetchNextPage()}
        isLoading={isFetchingNextPage}
      />

      {conversacion?.modo === 'HANDOFF' && (
        <MessageInput conversacionId={conversacionId} />
      )}

      {conversacion?.modo === 'BOT' && (
        <HandoffControls conversacionId={conversacionId} />
      )}
    </div>
  );
}
```

---

## Variables de Entorno

```env
# Inbox
INBOX_MESSAGES_PER_PAGE=50
INBOX_CONVERSATIONS_PER_PAGE=20
INBOX_MESSAGE_ARCHIVE_MONTHS=6

# WebSocket
WEBSOCKET_CORS_ORIGIN=http://localhost:5173
```

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/inbox/conversaciones` | Listar con paginación |
| GET | `/inbox/conversaciones/:id` | Detalle conversación |
| GET | `/inbox/conversaciones/:id/mensajes` | Mensajes con cursor |
| POST | `/inbox/conversaciones/:id/mensajes` | Enviar mensaje |
| POST | `/inbox/conversaciones/:id/tomar` | Tomar (handoff) |
| POST | `/inbox/conversaciones/:id/cerrar` | Cerrar handoff |
| POST | `/inbox/conversaciones/:id/transferir` | Transferir |
| POST | `/inbox/conversaciones/:id/leer` | Marcar como leído |

---

## Comandos de Admin (WhatsApp)

| Comando | Descripción |
|---------|-------------|
| `>>mensaje` | Enviar mensaje al usuario en handoff |
| `/cerrar` | Cerrar conversación activa |
| `/pendientes` | Ver cantidad de conversaciones sin asignar |
| `/ayuda` | Ver comandos disponibles |
