# Sistema de Inbox y Handoff

Sistema interno de mensajería para gestionar conversaciones de WhatsApp con capacidad de intervención humana (handoff).

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [API Endpoints](#api-endpoints)
4. [Paginación Estilo WhatsApp](#paginación-estilo-whatsapp)
5. [WebSocket - Tiempo Real](#websocket---tiempo-real)
6. [Creación Automática de Conversaciones](#creación-automática-de-conversaciones)
7. [Flujo de Handoff](#flujo-de-handoff)
8. [Responder desde WhatsApp](#responder-desde-whatsapp-del-admin)
9. [Optimizaciones](#optimizaciones)
10. [Frontend - Componentes](#frontend---componentes)

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

## Creación Automática de Conversaciones

### Usuario Nuevo escribe por WhatsApp

Cuando alguien que no tiene conversación previa escribe por WhatsApp, el sistema debe crear automáticamente una nueva conversación y agregarla al inbox.

### Flujo de Creación

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENSAJE ENTRANTE                              │
│                         │                                        │
│                         ▼                                        │
│              ┌─────────────────────┐                             │
│              │ Buscar conversación │                             │
│              │ por teléfono        │                             │
│              └──────────┬──────────┘                             │
│                         │                                        │
│           ┌─────────────┴─────────────┐                          │
│           │                           │                          │
│           ▼                           ▼                          │
│   ┌───────────────┐          ┌───────────────┐                   │
│   │   EXISTE      │          │  NO EXISTE    │                   │
│   │               │          │  (Usuario     │                   │
│   │ Usar conv.    │          │   nuevo)      │                   │
│   │ existente     │          └───────┬───────┘                   │
│   └───────────────┘                  │                           │
│                                      ▼                           │
│                         ┌─────────────────────┐                  │
│                         │ CREAR CONVERSACIÓN  │                  │
│                         │ - modo: BOT         │                  │
│                         │ - estado: inicio    │                  │
│                         │ - mensajesNoLeidos:1│                  │
│                         └──────────┬──────────┘                  │
│                                    │                             │
│                                    ▼                             │
│                         ┌─────────────────────┐                  │
│                         │ Emitir WebSocket    │                  │
│                         │ inbox:conversacion  │                  │
│                         │ :nueva              │                  │
│                         └─────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementación Backend

```typescript
// whatsapp-bot.service.ts o intent-router.service.ts
async getOrCreateConversacion(telefono: string, nombreWhatsapp?: string) {
  // Buscar conversación existente
  let conversacion = await this.prisma.conversacion.findUnique({
    where: { telefono }
  });

  // Si no existe, crear nueva
  if (!conversacion) {
    conversacion = await this.prisma.conversacion.create({
      data: {
        telefono,
        modo: 'BOT',
        estado: 'inicio',
        contexto: {
          nombreWhatsapp: nombreWhatsapp || null,
          primeraInteraccion: new Date().toISOString()
        },
        mensajesNoLeidos: 1
      }
    });

    // Emitir evento WebSocket para actualizar inbox en tiempo real
    this.inboxGateway.emitConversacionNueva(conversacion);

    this.logger.log(`Nueva conversación creada: ${telefono}`);
  }

  return conversacion;
}
```

### Integración en el Webhook

```typescript
// whatsapp-bot.controller.ts
@Post('webhook')
async handleWebhook(@Body() payload: WhatsAppWebhookPayload) {
  const telefono = message.from;
  const nombreWhatsapp = message.pushName || null;
  const contenido = message.text?.body || '';
  const messageId = message.id;

  // 1. Obtener o crear conversación (NUEVO)
  const conversacion = await this.whatsappBotService.getOrCreateConversacion(
    telefono,
    nombreWhatsapp
  );

  // 2. Verificar si es admin (existente)
  const admin = await this.prisma.usuario.findFirst({
    where: {
      telefono: { endsWith: telefono.slice(-9) },
      rol: { in: ['ADMIN', 'LIDER'] }
    }
  });

  if (admin) {
    await this.procesarMensajeAdmin(admin, contenido, messageId);
    return { status: 'ok' };
  }

  // 3. Procesar mensaje con el bot (existente)
  await this.intentRouter.processMessage(
    conversacion.id,
    contenido,
    telefono,
    nombreWhatsapp,
    messageId
  );

  return { status: 'ok' };
}
```

### Evento WebSocket: Conversación Nueva

```typescript
// inbox.gateway.ts
@WebSocketGateway({ namespace: '/inbox' })
export class InboxGateway {
  // ... eventos existentes ...

  // NUEVO: Notificar nueva conversación
  emitConversacionNueva(conversacion: Conversacion) {
    this.server.emit('inbox:conversacion:nueva', {
      id: conversacion.id,
      telefono: conversacion.telefono,
      modo: conversacion.modo,
      ultimoMensaje: null,
      mensajesNoLeidos: 1,
      creadoAt: conversacion.creadoAt
    });
  }
}

// Agregar al enum de eventos
enum InboxEvents {
  // ... eventos existentes ...
  CONVERSACION_NUEVA = 'inbox:conversacion:nueva',
}
```

### Frontend: Escuchar Nuevas Conversaciones

```typescript
// hooks/useInboxSocket.ts
useEffect(() => {
  // ... conexión existente ...

  // Nueva conversación
  socket.on('inbox:conversacion:nueva', (conversacion) => {
    // Agregar al inicio de la lista
    queryClient.setQueryData(['conversaciones'], (old: any) => {
      if (!old) return old;
      const newPages = [...old.pages];
      newPages[0] = {
        ...newPages[0],
        data: [conversacion, ...newPages[0].data]
      };
      return { ...old, pages: newPages };
    });

    // Mostrar notificación toast
    toast({
      title: 'Nueva conversación',
      description: `${conversacion.telefono} ha iniciado una conversación`,
      action: (
        <Button onClick={() => navigate(`/inbox/${conversacion.id}`)}>
          Ver
        </Button>
      )
    });
  });

  // ... resto del código ...
}, [conversacionId]);
```

### Vincular Usuario Existente (Opcional)

Si el teléfono ya está registrado en la tabla `Usuario`, vincular automáticamente:

```typescript
async getOrCreateConversacion(telefono: string, nombreWhatsapp?: string) {
  let conversacion = await this.prisma.conversacion.findUnique({
    where: { telefono }
  });

  if (!conversacion) {
    // Buscar si existe usuario con ese teléfono
    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        telefono: { endsWith: telefono.slice(-9) }
      }
    });

    conversacion = await this.prisma.conversacion.create({
      data: {
        telefono,
        usuarioId: usuarioExistente?.id || null,  // Vincular si existe
        modo: 'BOT',
        estado: 'inicio',
        contexto: {
          nombreWhatsapp: nombreWhatsapp || null,
          primeraInteraccion: new Date().toISOString()
        },
        mensajesNoLeidos: 1
      }
    });

    this.inboxGateway.emitConversacionNueva(conversacion);
  }

  return conversacion;
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
     Timeout 30min  │      PAUSADO        │───────────┘
                    │  (Sin asignar)      │  Admin toma
                    └─────────────────────┘
```

### Timeout Automático

Si el admin no responde en un tiempo determinado, la conversación vuelve automáticamente al bot.

```typescript
// inbox.service.ts
import { Cron } from '@nestjs/schedule';
import { subMinutes } from 'date-fns';

@Injectable()
export class InboxService {

  // Ejecutar cada 5 minutos
  @Cron('*/5 * * * *')
  async liberarConversacionesInactivas() {
    const tiempoLimite = subMinutes(new Date(), 30); // 30 min sin actividad

    // Buscar conversaciones en HANDOFF sin actividad
    const conversacionesInactivas = await this.prisma.conversacion.findMany({
      where: {
        modo: 'HANDOFF',
        actualizadoAt: { lt: tiempoLimite }
      },
      include: {
        derivadaA: true
      }
    });

    for (const conv of conversacionesInactivas) {
      // Notificar al admin
      if (conv.derivadaA?.telefono) {
        await this.whatsappService.sendWhatsAppMessage(
          conv.derivadaA.telefono,
          `⏰ La conversación con ${conv.telefono} fue devuelta al bot por inactividad.`
        );
      }

      // Notificar al usuario
      await this.whatsappService.sendWhatsAppMessage(
        conv.telefono,
        'El asistente virtual te seguirá atendiendo. ¿En qué más puedo ayudarte?'
      );

      // Actualizar estado
      await this.prisma.conversacion.update({
        where: { id: conv.id },
        data: {
          modo: 'BOT',
          derivadaAId: null,
          derivadaAt: null
        }
      });

      // Emitir evento WebSocket
      this.inboxGateway.emitConversacionActualizada(conv.id, {
        modo: 'BOT',
        derivadaA: null
      });
    }

    if (conversacionesInactivas.length > 0) {
      this.logger.log(
        `${conversacionesInactivas.length} conversaciones liberadas por timeout`
      );
    }
  }
}
```

### Configuración del Timeout

```env
# .env
HANDOFF_TIMEOUT_MINUTES=30  # Tiempo antes de devolver al bot
```

```typescript
// inbox.service.ts
private readonly timeoutMinutes: number;

constructor(private configService: ConfigService) {
  this.timeoutMinutes = this.configService.get('HANDOFF_TIMEOUT_MINUTES', 30);
}
```

### Diagrama del Timeout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  HANDOFF ACTIVO                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Admin tomó la conversación                               │   │
│  │ Timer: 30:00 ────────────────────────────────── 00:00   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│            ┌─────────────────┼─────────────────┐               │
│            ▼                 ▼                 ▼               │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│   │ Admin       │   │ Admin       │   │ Timeout     │         │
│   │ responde    │   │ cierra      │   │ (30 min)    │         │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘         │
│          │                 │                 │                 │
│          ▼                 ▼                 ▼                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│   │ Timer se    │   │ Modo = BOT  │   │ Modo = BOT  │         │
│   │ reinicia    │   │ (manual)    │   │ (automático)│         │
│   └─────────────┘   └─────────────┘   └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notificaciones de Timeout

```
Al admin (vía WhatsApp):
┌─────────────────────────────────────────────────────────────┐
│ ⏰ La conversación con +51 999 888 777 fue devuelta al bot  │
│ por inactividad (30 min sin respuesta).                     │
└─────────────────────────────────────────────────────────────┘

Al usuario (vía WhatsApp):
┌─────────────────────────────────────────────────────────────┐
│ El asistente virtual te seguirá atendiendo.                 │
│ ¿En qué más puedo ayudarte?                                 │
└─────────────────────────────────────────────────────────────┘

En la web (toast):
┌─────────────────────────────────────────────────────────────┐
│ ⏰ Conversación liberada                                 ✕  │
│ María García fue devuelta al bot por timeout                │
└─────────────────────────────────────────────────────────────┘
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

El admin puede responder a los usuarios desde **dos canales**: la web (Inbox) o su WhatsApp personal.

### Canales de Respuesta del Admin

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN PUEDE RESPONDER                        │
│                                                                  │
│   ┌─────────────────────┐       ┌─────────────────────┐         │
│   │     WEB (Inbox)     │       │  WhatsApp Personal  │         │
│   │                     │       │                     │         │
│   │  - Ve el chat       │       │  - Recibe notif.    │         │
│   │  - Escribe en input │       │  - Responde con >>  │         │
│   │  - Click enviar     │       │                     │         │
│   └──────────┬──────────┘       └──────────┬──────────┘         │
│              │                             │                     │
│              └──────────────┬──────────────┘                     │
│                             │                                    │
│                             ▼                                    │
│                   ┌─────────────────────┐                        │
│                   │  Usuario recibe     │                        │
│                   │  mensaje en su      │                        │
│                   │  WhatsApp           │                        │
│                   └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Cuándo usar cada canal?

| Situación | Canal recomendado | Razón |
|-----------|-------------------|-------|
| Admin en la oficina/computadora | **Web** | Más cómodo, ve historial completo |
| Admin en movimiento/celular | **WhatsApp** | Responde rápido sin abrir web |
| Necesita enviar archivos/imágenes | **Web** | Mejor manejo de adjuntos |
| Respuesta rápida urgente | **WhatsApp** | Ya tiene la notificación ahí |

### Flujo Completo de Notificación

```
Usuario escribe por WhatsApp
         │
         ▼
┌─────────────────────────────────────────┐
│  Sistema detecta: modo = HANDOFF        │
│  Conversación asignada a Jorge          │
└─────────────────────────────────────────┘
         │
         ├────────────────────────────────────┐
         │                                    │
         ▼                                    ▼
┌─────────────────────┐            ┌─────────────────────┐
│ WebSocket → Web     │            │ Reenvío → WhatsApp  │
│                     │            │ del admin           │
│ Aparece mensaje en  │            │                     │
│ el inbox en tiempo  │            │ 📨 Mensaje de María │
│ real                │            │ "Hola, necesito..." │
└─────────────────────┘            └─────────────────────┘
         │                                    │
         │  Jorge responde                    │  Jorge responde
         │  desde la web                      │  >>Hola, te ayudo
         │                                    │
         ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│              Usuario recibe respuesta                    │
└─────────────────────────────────────────────────────────┘
```

### Configuración de Preferencias por Admin

Cada admin puede elegir si quiere recibir notificaciones en su WhatsApp personal.

#### Schema Prisma

```prisma
model Usuario {
  // ... campos existentes ...

  // Preferencias de notificación para el inbox
  recibirNotificacionesWhatsApp  Boolean  @default(true)  // Recibir mensajes reenviados
  notificarNuevasConversaciones  Boolean  @default(true)  // Notificar cuando hay nuevas sin asignar
}
```

#### Lógica de Reenvío Condicional

```typescript
// intent-router.service.ts
if (conversacion.modo === 'HANDOFF') {
  // SIEMPRE: notificar via WebSocket (para la web)
  this.inboxGateway.emitMensajeNuevo(conversacionId, mensajeGuardado);

  // CONDICIONAL: reenviar al WhatsApp del admin si tiene la preferencia activa
  if (
    conversacion.derivadaA?.telefono &&
    conversacion.derivadaA?.recibirNotificacionesWhatsApp
  ) {
    await this.reenviarAAdmin(conversacion, mensaje, nombreWhatsapp);
  }
}
```

#### UI de Configuración (Frontend)

```tsx
// components/NotificationSettings.tsx
export function NotificationSettings() {
  const { data: preferences, mutate } = useUserPreferences();

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Notificaciones del Inbox</h3>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Recibir mensajes en WhatsApp</p>
          <p className="text-sm text-muted-foreground">
            Cuando un usuario te escribe en handoff, recibirás el mensaje en tu WhatsApp
          </p>
        </div>
        <Switch
          checked={preferences?.recibirNotificacionesWhatsApp}
          onCheckedChange={(checked) =>
            mutate({ recibirNotificacionesWhatsApp: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Notificar nuevas conversaciones</p>
          <p className="text-sm text-muted-foreground">
            Recibir alerta cuando hay conversaciones sin asignar
          </p>
        </div>
        <Switch
          checked={preferences?.notificarNuevasConversaciones}
          onCheckedChange={(checked) =>
            mutate({ notificarNuevasConversaciones: checked })
          }
        />
      </div>
    </div>
  );
}
```

### Comparativa de Canales

| Característica | Web (Inbox) | WhatsApp Personal |
|----------------|-------------|-------------------|
| Historial completo | Si | Solo último mensaje |
| Enviar archivos | Si | Limitado |
| Respuesta rápida | Necesita abrir web | Inmediata |
| Múltiples conversaciones | Ve todas a la vez | Una a la vez |
| Funciona sin internet fijo | No | Datos móviles |
| Ver info del usuario | Panel lateral | Solo teléfono |
| Tomar/cerrar conversación | Botones | Comandos /cerrar |

---

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

### 5. Optimizaciones de WebSocket

#### 5.1 Reconexión Automática con Backoff Exponencial

```typescript
// hooks/useInboxSocket.ts
import { useRef, useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  lastError: string | null;
}

export function useInboxSocket(conversacionId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempt: 0,
    lastError: null
  });

  // Configuración de reconexión
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_DELAY = 1000; // 1 segundo
  const MAX_DELAY = 30000; // 30 segundos

  const getReconnectDelay = useCallback((attempt: number) => {
    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
    // Agregar jitter (±20%) para evitar thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return delay + jitter;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io('/inbox', {
      auth: { token: getAuthToken() },
      reconnection: false, // Manejamos reconexión manualmente
      timeout: 10000,
      transports: ['websocket', 'polling'] // WebSocket primero, fallback a polling
    });

    socket.on('connect', () => {
      setConnectionState({
        isConnected: true,
        isReconnecting: false,
        reconnectAttempt: 0,
        lastError: null
      });

      // Re-unirse a la conversación si había una activa
      if (conversacionId) {
        socket.emit('inbox:join', conversacionId);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        lastError: `Desconectado: ${reason}`
      }));

      // Reconectar solo si no fue intencional
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        lastError: error.message
      }));
      scheduleReconnect();
    });

    socketRef.current = socket;
  }, [conversacionId]);

  const scheduleReconnect = useCallback(() => {
    setConnectionState(prev => {
      if (prev.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
        return { ...prev, isReconnecting: false, lastError: 'Máximo de intentos alcanzado' };
      }

      const delay = getReconnectDelay(prev.reconnectAttempt);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      return {
        ...prev,
        isReconnecting: true,
        reconnectAttempt: prev.reconnectAttempt + 1
      };
    });
  }, [connect, getReconnectDelay]);

  // Cleanup al desmontar
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return { socket: socketRef.current, connectionState };
}
```

#### 5.2 Heartbeat y Detección de Conexiones Muertas

```typescript
// Backend: inbox.gateway.ts
@WebSocketGateway({ namespace: '/inbox' })
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly HEARTBEAT_INTERVAL = 25000; // 25 segundos
  private readonly HEARTBEAT_TIMEOUT = 60000;  // 60 segundos
  private clientHeartbeats = new Map<string, NodeJS.Timeout>();

  handleConnection(client: Socket) {
    // Iniciar heartbeat para este cliente
    this.startHeartbeat(client);

    client.on('pong', () => {
      // Cliente respondió, reiniciar timeout
      this.resetHeartbeatTimeout(client);
    });
  }

  handleDisconnect(client: Socket) {
    // Limpiar heartbeat
    const timeout = this.clientHeartbeats.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.clientHeartbeats.delete(client.id);
    }
  }

  private startHeartbeat(client: Socket) {
    const interval = setInterval(() => {
      if (client.connected) {
        client.emit('ping');
      }
    }, this.HEARTBEAT_INTERVAL);

    // Guardar referencia para cleanup
    client.data.heartbeatInterval = interval;

    // Timeout inicial
    this.resetHeartbeatTimeout(client);
  }

  private resetHeartbeatTimeout(client: Socket) {
    // Limpiar timeout anterior
    const existingTimeout = this.clientHeartbeats.get(client.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Nuevo timeout
    const timeout = setTimeout(() => {
      this.logger.warn(`Cliente ${client.id} no respondió heartbeat, desconectando`);
      client.disconnect(true);
    }, this.HEARTBEAT_TIMEOUT);

    this.clientHeartbeats.set(client.id, timeout);
  }
}

// Frontend: responder al ping
useEffect(() => {
  if (!socket) return;

  socket.on('ping', () => {
    socket.emit('pong');
  });

  return () => {
    socket.off('ping');
  };
}, [socket]);
```

#### 5.3 Debounce para Typing Indicator

```typescript
// hooks/useTypingIndicator.ts
import { useCallback, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function useTypingIndicator(socket: Socket | null, conversacionId: string) {
  const isTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce el envío del evento typing (300ms)
  const sendTyping = useDebouncedCallback(
    (isTyping: boolean) => {
      if (socket?.connected) {
        socket.emit('inbox:typing:enviar', {
          conversacionId,
          isTyping
        });
      }
    },
    300,
    { leading: true, trailing: true }
  );

  const handleInputChange = useCallback(() => {
    // Enviar "está escribiendo" si no lo estaba haciendo
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(true);
    }

    // Reiniciar timeout para "dejó de escribir"
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current);
    }

    // Si no escribe en 2 segundos, enviar "dejó de escribir"
    stopTypingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(false);
    }, 2000);
  }, [sendTyping]);

  // Cleanup al desmontar o cambiar de conversación
  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
      if (isTypingRef.current && socket?.connected) {
        socket.emit('inbox:typing:enviar', { conversacionId, isTyping: false });
      }
    };
  }, [socket, conversacionId]);

  return { handleInputChange };
}

// Backend: throttle de typing por conversación
@SubscribeMessage('inbox:typing:enviar')
@Throttle({ default: { limit: 1, ttl: 500 } }) // Máximo 1 evento cada 500ms
handleTyping(client: Socket, payload: { conversacionId: string; isTyping: boolean }) {
  this.server.to(`conv:${payload.conversacionId}`).emit('inbox:typing', {
    conversacionId: payload.conversacionId,
    isTyping: payload.isTyping,
    from: client.data.userId
  });
}
```

#### 5.4 Cleanup de Listeners (Evitar Memory Leaks)

```typescript
// hooks/useInboxSocket.ts - Versión completa con cleanup
export function useInboxSocket(conversacionId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const listenersRef = useRef<Array<{ event: string; handler: Function }>>([]);

  // Función helper para agregar listeners con tracking
  const addListener = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socketRef.current) return;

    socketRef.current.on(event, handler);
    listenersRef.current.push({ event, handler });
  }, []);

  // Limpiar todos los listeners
  const cleanupListeners = useCallback(() => {
    if (!socketRef.current) return;

    listenersRef.current.forEach(({ event, handler }) => {
      socketRef.current?.off(event, handler as any);
    });
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    const socket = io('/inbox', {
      auth: { token: getAuthToken() }
    });
    socketRef.current = socket;

    // Agregar listeners con tracking
    addListener('inbox:mensaje:nuevo', (mensaje: Mensaje) => {
      queryClient.setQueryData(['mensajes', mensaje.conversacionId], (old: any) => {
        if (!old) return old;
        const newPages = [...old.pages];
        const lastPage = { ...newPages[newPages.length - 1] };
        lastPage.data = [...lastPage.data, mensaje];
        newPages[newPages.length - 1] = lastPage;
        return { ...old, pages: newPages };
      });
    });

    addListener('inbox:conversacion:actualizada', () => {
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] });
    });

    addListener('inbox:conversacion:nueva', (conversacion) => {
      queryClient.setQueryData(['conversaciones'], (old: any) => {
        if (!old) return old;
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          data: [conversacion, ...newPages[0].data]
        };
        return { ...old, pages: newPages };
      });
    });

    // Unirse a conversación si hay una seleccionada
    if (conversacionId) {
      socket.emit('inbox:join', conversacionId);
    }

    // CLEANUP: Limpiar todo al desmontar
    return () => {
      cleanupListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Solo una vez al montar

  // Manejar cambio de conversación sin reconectar
  useEffect(() => {
    if (!socketRef.current?.connected || !conversacionId) return;

    socketRef.current.emit('inbox:join', conversacionId);

    return () => {
      socketRef.current?.emit('inbox:leave', conversacionId);
    };
  }, [conversacionId]);

  return socketRef.current;
}
```

#### 5.5 Estado de Conexión y UI Feedback

```typescript
// components/ConnectionStatus.tsx
interface Props {
  connectionState: ConnectionState;
  onRetry: () => void;
}

export function ConnectionStatus({ connectionState, onRetry }: Props) {
  const { isConnected, isReconnecting, reconnectAttempt, lastError } = connectionState;

  if (isConnected) {
    return null; // No mostrar nada si está conectado
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "rounded-lg p-4 shadow-lg",
        isReconnecting ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"
      )}>
        <div className="flex items-center gap-3">
          {isReconnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Reconectando...</p>
                <p className="text-sm text-yellow-600">
                  Intento {reconnectAttempt} de 10
                </p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Sin conexión</p>
                <p className="text-sm text-red-600">{lastError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Uso en InboxPage
function InboxPage() {
  const { socket, connectionState, reconnect } = useInboxSocket(selectedId);

  return (
    <div>
      {/* ... contenido ... */}
      <ConnectionStatus
        connectionState={connectionState}
        onRetry={reconnect}
      />
    </div>
  );
}
```

#### 5.6 Throttling de Actualizaciones en Frontend

```typescript
// hooks/useThrottledUpdates.ts
import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useThrottledUpdates() {
  const queryClient = useQueryClient();
  const pendingUpdates = useRef<Map<string, any>>(new Map());
  const flushTimeoutRef = useRef<NodeJS.Timeout>();

  const THROTTLE_MS = 100; // Agrupar actualizaciones cada 100ms

  const queueUpdate = useCallback((queryKey: string[], updater: (old: any) => any) => {
    const key = JSON.stringify(queryKey);

    // Guardar el updater más reciente para esta key
    pendingUpdates.current.set(key, { queryKey, updater });

    // Programar flush si no hay uno pendiente
    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(() => {
        // Aplicar todas las actualizaciones pendientes
        pendingUpdates.current.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, updater);
        });

        // Limpiar
        pendingUpdates.current.clear();
        flushTimeoutRef.current = undefined;
      }, THROTTLE_MS);
    }
  }, [queryClient]);

  return { queueUpdate };
}

// Uso en el socket
const { queueUpdate } = useThrottledUpdates();

socket.on('inbox:mensaje:nuevo', (mensaje) => {
  queueUpdate(['mensajes', mensaje.conversacionId], (old) => {
    if (!old) return old;
    // ... actualizar
  });
});
```

#### 5.7 Autenticación del Socket

```typescript
// Backend: inbox.gateway.ts
@WebSocketGateway({ namespace: '/inbox' })
export class InboxGateway implements OnGatewayConnection {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        throw new WsException('Token no proporcionado');
      }

      // Verificar JWT
      const payload = this.jwtService.verify(token);

      // Verificar que el usuario existe y tiene permisos
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        select: { id: true, rol: true, nombre: true }
      });

      if (!usuario || !['ADMIN', 'LIDER'].includes(usuario.rol)) {
        throw new WsException('No autorizado para acceder al inbox');
      }

      // Guardar datos del usuario en el socket
      client.data.userId = usuario.id;
      client.data.userRole = usuario.rol;
      client.data.userName = usuario.nombre;

      // Unir a sala de admins
      client.join('admins');

      this.logger.log(`Admin ${usuario.nombre} conectado al inbox`);
    } catch (error) {
      this.logger.error(`Error de autenticación: ${error.message}`);
      client.emit('error', { message: 'Autenticación fallida' });
      client.disconnect(true);
    }
  }
}

// Frontend: Manejo de error de auth
socket.on('error', ({ message }) => {
  if (message === 'Autenticación fallida') {
    // Redirigir a login o refrescar token
    handleAuthError();
  }
});
```

#### 5.8 Manejo de Errores Robusto

```typescript
// hooks/useSocketErrorHandler.ts
export function useSocketErrorHandler(socket: Socket | null) {
  const { toast } = useToast();

  useEffect(() => {
    if (!socket) return;

    const handleError = (error: { message: string; code?: string }) => {
      console.error('Socket error:', error);

      // Errores específicos
      switch (error.code) {
        case 'AUTH_FAILED':
          toast({
            title: 'Sesión expirada',
            description: 'Por favor, inicia sesión nuevamente',
            variant: 'destructive'
          });
          // Redirigir a login
          break;

        case 'RATE_LIMITED':
          toast({
            title: 'Demasiadas solicitudes',
            description: 'Espera un momento antes de continuar',
            variant: 'warning'
          });
          break;

        case 'PERMISSION_DENIED':
          toast({
            title: 'Acceso denegado',
            description: error.message,
            variant: 'destructive'
          });
          break;

        default:
          toast({
            title: 'Error de conexión',
            description: error.message || 'Ocurrió un error inesperado',
            variant: 'destructive'
          });
      }
    };

    socket.on('error', handleError);
    socket.on('exception', handleError); // NestJS WsException

    return () => {
      socket.off('error', handleError);
      socket.off('exception', handleError);
    };
  }, [socket, toast]);
}

// Backend: Emitir errores estructurados
@SubscribeMessage('inbox:join')
async handleJoin(client: Socket, conversacionId: string) {
  try {
    // Verificar que la conversación existe
    const conversacion = await this.prisma.conversacion.findUnique({
      where: { id: conversacionId }
    });

    if (!conversacion) {
      throw new WsException({
        message: 'Conversación no encontrada',
        code: 'NOT_FOUND'
      });
    }

    client.join(`conv:${conversacionId}`);

  } catch (error) {
    client.emit('error', {
      message: error.message || 'Error al unirse a la conversación',
      code: error.code || 'UNKNOWN'
    });
  }
}
```

#### 5.9 Rate Limiting en WebSocket

```typescript
// Backend: Guards y decorators para rate limiting
import { ThrottlerGuard } from '@nestjs/throttler';

@WebSocketGateway({ namespace: '/inbox' })
@UseGuards(WsThrottlerGuard)
export class InboxGateway {

  // Límite global: 100 eventos por minuto por cliente
  @SubscribeMessage('inbox:mensaje:enviar')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 mensajes por minuto
  async handleEnviarMensaje(client: Socket, payload: EnviarMensajeDto) {
    // ...
  }

  @SubscribeMessage('inbox:typing:enviar')
  @Throttle({ default: { limit: 10, ttl: 10000 } }) // 10 typing events cada 10 seg
  handleTyping(client: Socket, payload: TypingDto) {
    // ...
  }
}

// Guard personalizado para WebSocket
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number
  ): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const key = `ws_${client.data.userId}_${context.getHandler().name}`;

    const { totalHits } = await this.storageService.increment(key, ttl);

    if (totalHits > limit) {
      client.emit('error', {
        message: 'Demasiadas solicitudes, espera un momento',
        code: 'RATE_LIMITED'
      });
      return false;
    }

    return true;
  }
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

---

## UX - Diseño de Interfaz

### Layout General (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─ Sidebar ─┐  ┌─────────────── Main Content ────────────────────────────┐ │
│  │           │  │                                                         │ │
│  │  Dashboard│  │  ┌─ Inbox ──────────────────────────────────────────┐  │ │
│  │  Usuarios │  │  │                                                   │  │ │
│  │  Programas│  │  │  ┌─ Lista ─────┐  ┌─ Chat ─────────────────────┐ │  │ │
│  │  Asistenci│  │  │  │             │  │                             │ │  │ │
│  │ ►Inbox    │  │  │  │ Conversacio-│  │  Header + Info usuario     │ │  │ │
│  │           │  │  │  │ nes aquí    │  │ ─────────────────────────── │ │  │ │
│  │           │  │  │  │             │  │                             │ │  │ │
│  │           │  │  │  │             │  │  Mensajes                   │ │  │ │
│  │           │  │  │  │             │  │                             │ │  │ │
│  │           │  │  │  │             │  │                             │ │  │ │
│  │           │  │  │  │             │  │ ─────────────────────────── │ │  │ │
│  │           │  │  │  │             │  │  Input mensaje              │ │  │ │
│  │           │  │  │  └─────────────┘  └─────────────────────────────┘ │  │ │
│  │           │  │  └───────────────────────────────────────────────────┘  │ │
│  └───────────┘  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layout Mobile (Responsive)

```
Vista Lista                          Vista Chat (al seleccionar)
┌──────────────────────┐             ┌──────────────────────┐
│ ← Inbox              │             │ ← María García    ⋮  │
├──────────────────────┤             ├──────────────────────┤
│ 🔍 Buscar...         │             │                      │
├──────────────────────┤             │  ┌──────────────┐    │
│                      │             │  │ Hola, tengo  │    │
│ ┌──────────────────┐ │             │  │ una consulta │    │
│ │👤 María García   │ │             │  └──────────────┘    │
│ │   ¿Cómo registro │ │             │         10:30 AM     │
│ │   mi asisten... 2m│ │             │                      │
│ └──────────────────┘ │             │    ┌──────────────┐  │
│                      │             │    │ Claro, te    │  │
│ ┌──────────────────┐ │             │    │ ayudo        │  │
│ │🤖 Pedro López    │ │             │    └──────────────┘  │
│ │   Gracias por la │ │             │         10:31 AM  ✓✓ │
│ │   información  5m│ │             │                      │
│ └──────────────────┘ │             ├──────────────────────┤
│                      │             │ [Tomar conversación] │
│ ┌──────────────────┐ │             ├──────────────────────┤
│ │👤 Ana Torres     │ │             │ ┌────────────────┐ 📎│
│ │   (Jorge atendie)│ │             │ │ Escribe...     │ ▶ │
│ │   Esperando... 8m│ │             │ └────────────────┘   │
│ └──────────────────┘ │             └──────────────────────┘
└──────────────────────┘
```

---

### Componente: Lista de Conversaciones

```
┌─────────────────────────────────────────┐
│ Inbox                            🔔 3   │  ← Contador de no leídos
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Todas ▼] [🔍 Buscar contacto...  ] │ │  ← Filtros
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢                                  │ │  ← Indicador: verde=handoff activo
│ │ ┌──┐ María García              2m   │ │
│ │ │MG│ ¿Cómo puedo registrar mi      │ │  ← Preview del último mensaje
│ │ └──┘ asistencia?              ● 3   │ │  ← Badge: 3 mensajes sin leer
│ │      🤖 Bot atendiendo              │ │  ← Estado actual
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔵                                  │ │  ← Azul = tú lo estás atendiendo
│ │ ┌──┐ Pedro López               15m  │ │
│ │ │PL│ Gracias por la ayuda           │ │
│ │ └──┘                                │ │
│ │      👤 Jorge (tú)                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟡                                  │ │  ← Amarillo = esperando atención
│ │ ┌──┐ Ana Torres                 1h  │ │
│ │ │AT│ Necesito hablar con alguien    │ │
│ │ └──┘                           ● 5  │ │
│ │      ⏳ Sin asignar                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪                                  │ │  ← Gris = inactivo/cerrado
│ │ ┌──┐ Luis Ramos                 2d  │ │
│ │ │LR│ Ok, entendido                  │ │
│ │ └──┘                                │ │
│ │      🤖 Bot atendiendo              │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘

Filtros disponibles:
┌────────────────────────────────────┐
│ ▼ Todas las conversaciones         │
├────────────────────────────────────┤
│   Todas las conversaciones         │
│   🤖 Atendidas por bot             │
│   👤 Mis conversaciones            │
│   ⏳ Sin asignar                   │
│   📌 Archivadas                    │
└────────────────────────────────────┘
```

---

### Componente: Ventana de Chat

```
┌───────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐ │
│ │  ← │ ┌──┐ María García                          ⋮        │ │  ← Header
│ │    │ │MG│ +51 999 888 777 · Miembro                      │ │
│ │    │ └──┘                                                │ │
│ │    │     🤖 Bot atendiendo          [Tomar conversación] │ │  ← Acción principal
│ └───────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                      ─── Hoy ───                              │  ← Separador de fecha
│                                                               │
│   ┌─────────────────────────────────┐                         │
│   │ Hola, tengo una consulta sobre  │                         │  ← Mensaje entrante
│   │ cómo registrar mi asistencia    │                         │     (izquierda, gris)
│   └─────────────────────────────────┘                         │
│   10:30 AM                                                    │
│                                                               │
│                         ┌─────────────────────────────────┐   │
│                         │ ¡Hola María! Para registrar tu  │   │  ← Mensaje saliente
│                         │ asistencia, escanea el código   │   │     (derecha, verde/azul)
│                         │ QR que se muestra en la sala.   │   │
│                         └─────────────────────────────────┘   │
│                                               10:31 AM  ✓✓ 🤖 │  ← Checks + icono bot
│                                                               │
│   ┌─────────────────────────────────┐                         │
│   │ No encuentro el código QR,      │                         │
│   │ ¿pueden ayudarme?               │                         │
│   └─────────────────────────────────┘                         │
│   10:35 AM                                                    │
│                                                               │
│   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                          │
│   │  ⏳ Cargando más mensajes...   │                          │  ← Scroll up = cargar más
│   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │  ⚠️  Esta conversación está siendo atendida por el bot.   │ │  ← Banner informativo
│ │      Toma la conversación para responder.                 │ │
│ └───────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │         [ 👤 Tomar esta conversación ]                    │ │  ← CTA principal
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

### Estado: Conversación en Handoff (Admin atendiendo)

```
┌───────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐ │
│ │  ← │ ┌──┐ María García                          ⋮        │ │
│ │    │ │MG│ +51 999 888 777 · Miembro                      │ │
│ │    │ └──┘                                                │ │
│ │    │     👤 Tú estás atendiendo     [Cerrar ▼]           │ │  ← Dropdown acciones
│ └───────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────────────────┐                         │
│   │ No encuentro el código QR       │                         │
│   └─────────────────────────────────┘                         │
│   10:35 AM                                                    │
│                                                               │
│                         ┌─────────────────────────────────┐   │
│                         │ Te voy a ayudar. ¿En qué sala   │   │  ← Mensaje del admin
│                         │ estás ahora mismo?              │   │     (sin icono de bot)
│                         └─────────────────────────────────┘   │
│                                               10:36 AM  ✓✓ 👤 │
│                                                               │
│   ┌─────────────────────────────────┐                         │
│   │ Estoy en el salón principal     │                         │
│   └─────────────────────────────────┘                         │
│   10:37 AM                                                    │
│                                                               │
│                                         María está escribiendo...│ ← Typing indicator
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 📎 │ Escribe un mensaje...                           │ ▶ │ │  ← Input activo
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘

Dropdown "Cerrar ▼":
┌────────────────────────────┐
│ 🔄 Devolver al bot         │  ← El bot retoma
│ 👥 Transferir a...      ▶  │  ← Submenu con admins
│ ✅ Cerrar conversación     │  ← Marcar como resuelta
│ 📌 Archivar                │
└────────────────────────────┘
```

---

### Panel de Información del Usuario (Sidebar derecho opcional)

```
┌─────────────────────────────────────────┐
│          ┌────────────┐                 │
│          │            │                 │
│          │    FOTO    │                 │
│          │            │                 │
│          └────────────┘                 │
│                                         │
│          María García                   │
│          +51 999 888 777                │
│                                         │
├─────────────────────────────────────────┤
│ Información                             │
├─────────────────────────────────────────┤
│ Email         maria@email.com           │
│ Rol           Miembro                   │
│ Grupo         Jóvenes                   │
│ Registrado    15 Ene 2025               │
├─────────────────────────────────────────┤
│ Estadísticas                            │
├─────────────────────────────────────────┤
│ Asistencias        12                   │
│ Programas          3                    │
│ Última actividad   Hace 2 min           │
├─────────────────────────────────────────┤
│ Conversaciones anteriores               │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📅 10 Ene - Consulta asistencia     │ │
│ │    Resuelta por Jorge               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 5 Ene - Registro inicial         │ │
│ │    Atendida por bot                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Acciones rápidas                        │
├─────────────────────────────────────────┤
│ [Ver perfil completo]                   │
│ [Ver historial de asistencia]           │
│ [Enviar recordatorio]                   │
└─────────────────────────────────────────┘
```

---

### Notificaciones y Alertas

```
Notificación toast (nuevo mensaje):
┌─────────────────────────────────────────┐
│ 💬 María García                      ✕  │
│ "No encuentro el código QR..."          │
│                            [Ver chat]   │
└─────────────────────────────────────────┘

Notificación: Conversación esperando:
┌─────────────────────────────────────────┐
│ ⏳ Conversación sin atender             │
│ Ana Torres lleva 10 min esperando       │
│                           [Tomar]       │
└─────────────────────────────────────────┘

Badge en el menú:
┌─────────────────┐
│ 📬 Inbox    🔴 5 │  ← 5 conversaciones necesitan atención
└─────────────────┘
```

---

### Estados de Mensajes (Indicadores)

```
Estados de envío:
┌────────────────────────────────┐
│ Mensaje enviándose...       ⏳ │  ← Pendiente (reloj)
└────────────────────────────────┘

┌────────────────────────────────┐
│ Mensaje enviado              ✓ │  ← Enviado (1 check)
└────────────────────────────────┘

┌────────────────────────────────┐
│ Mensaje entregado           ✓✓ │  ← Entregado (2 checks grises)
└────────────────────────────────┘

┌────────────────────────────────┐
│ Mensaje leído               ✓✓ │  ← Leído (2 checks azules)
└────────────────────────────────┘

┌────────────────────────────────┐
│ Error al enviar              ⚠️│  ← Fallido (con opción reintentar)
│              [Reintentar]      │
└────────────────────────────────┘

Quién envió:
┌────────────────────────────────┐
│ Respuesta del bot         🤖   │  ← Bot automático
└────────────────────────────────┘

┌────────────────────────────────┐
│ Respuesta de Jorge        👤   │  ← Admin/humano
└────────────────────────────────┘
```

---

### Flujo de Interacción: Tomar Conversación

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Admin ve conversación         2. Click "Tomar"              │
│     en la lista                                                 │
│                                                                 │
│  ┌─────────────────────┐          ┌─────────────────────┐       │
│  │ 🟡 María García     │    →     │ Confirmar           │       │
│  │    ⏳ Sin asignar   │          │                     │       │
│  └─────────────────────┘          │ ¿Tomar esta         │       │
│                                   │ conversación?       │       │
│                                   │                     │       │
│                                   │ [Cancelar] [Tomar]  │       │
│                                   └─────────────────────┘       │
│                                              │                  │
│                                              ▼                  │
│  3. Se notifica al usuario        4. Input se activa            │
│                                                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │ 👤 Un agente te atenderá    │  │ 📎 │ Escribe...    │ ▶ │   │
│  │    en breve. Soy Jorge.     │  └─────────────────────────┘   │
│  └─────────────────────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo: Responder desde WhatsApp (Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  WhatsApp del Admin (Jorge)                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ┌───────────────────────────────────────────────────┐ │   │
│  │  │ 📨 *Mensaje de María García*                      │ │   │
│  │  │ 📱 +51 999 888 777                                │ │   │
│  │  │                                                   │ │   │
│  │  │ No encuentro el código QR, ¿pueden ayudarme?     │ │   │
│  │  │                                                   │ │   │
│  │  │ _Responde con >> seguido de tu mensaje_          │ │   │
│  │  │ _Ejemplo: >>Hola, te ayudo_                      │ │   │
│  │  └───────────────────────────────────────────────────┘ │   │
│  │                                              10:35 AM   │   │
│  │                                                         │   │
│  │  ┌───────────────────────────────────────────────────┐ │   │
│  │  │ >>Hola María, el código QR está en la entrada    │ │   │
│  │  │ del salón principal, lado derecho.               │ │   │
│  │  └───────────────────────────────────────────────────┘ │   │
│  │                                              10:36 AM ✓✓│   │
│  │                                                         │   │
│  │  ┌───────────────────────────────────────────────────┐ │   │
│  │  │ ✅ Mensaje enviado a María García                 │ │   │
│  │  └───────────────────────────────────────────────────┘ │   │
│  │                                              10:36 AM   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

  Comandos disponibles para el admin:
  ┌─────────────────────────────────────────┐
  │  >>mensaje    → Enviar al usuario       │
  │  /cerrar      → Devolver al bot         │
  │  /pendientes  → Ver cuántas esperan     │
  │  /ayuda       → Ver comandos            │
  └─────────────────────────────────────────┘
```

---

### Responsive Breakpoints

```
Desktop (≥1024px):
┌──────────────────────────────────────────────────────────┐
│  Lista (320px)  │  Chat (flex)  │  Info Panel (280px)   │
└──────────────────────────────────────────────────────────┘

Tablet (768px - 1023px):
┌──────────────────────────────────────────┐
│  Lista (280px)  │  Chat (flex)           │
└──────────────────────────────────────────┘
Info panel se oculta, disponible como modal

Mobile (<768px):
┌─────────────────────┐     ┌─────────────────────┐
│  Lista (100%)       │ ←→  │  Chat (100%)        │
└─────────────────────┘     └─────────────────────┘
Navegación entre vistas con animación slide
```

---

### Colores y Estados Visuales

```
Estados de conversación:
┌──────────────────────────────────────────┐
│  🟢 Verde    │ Handoff activo (tuyo)     │
│  🔵 Azul     │ Handoff activo (otro)     │
│  🟡 Amarillo │ Sin asignar, esperando    │
│  🟠 Naranja  │ Esperando respuesta larga │
│  ⚪ Gris     │ Bot atendiendo / inactivo │
└──────────────────────────────────────────┘

Colores de mensajes:
┌──────────────────────────────────────────┐
│  Entrante  │ Fondo gris claro (#f0f0f0)  │
│  Saliente  │ Fondo verde (#dcf8c6) o     │
│            │ azul brand (#0084ff)        │
│  Sistema   │ Fondo amarillo pálido,      │
│            │ texto centrado              │
└──────────────────────────────────────────┘

Badges:
┌──────────────────────────────────────────┐
│  🔴 Rojo       │ Mensajes sin leer       │
│  🟡 Amarillo   │ Esperando atención      │
│  🔵 Azul       │ En progreso             │
└──────────────────────────────────────────┘
```

---

### Atajos de Teclado

```
┌────────────────────────────────────────────────────────┐
│ Atajo              │ Acción                            │
├────────────────────┼───────────────────────────────────┤
│ Ctrl/Cmd + K       │ Buscar conversación               │
│ Ctrl/Cmd + Enter   │ Enviar mensaje                    │
│ Ctrl/Cmd + T       │ Tomar conversación                │
│ Ctrl/Cmd + W       │ Cerrar/devolver al bot            │
│ Esc                │ Cerrar panel lateral              │
│ ↑ / ↓              │ Navegar entre conversaciones      │
│ Ctrl/Cmd + 1-9     │ Ir a conversación N               │
└────────────────────────────────────────────────────────┘
```

---

### Empty States

```
Sin conversaciones:
┌─────────────────────────────────────────┐
│                                         │
│              📭                         │
│                                         │
│     No hay conversaciones               │
│                                         │
│     Las conversaciones de WhatsApp      │
│     aparecerán aquí automáticamente     │
│                                         │
└─────────────────────────────────────────┘

Sin selección:
┌─────────────────────────────────────────┐
│                                         │
│              💬                         │
│                                         │
│     Selecciona una conversación         │
│                                         │
│     Elige una conversación de la        │
│     lista para ver los mensajes         │
│                                         │
└─────────────────────────────────────────┘

Búsqueda sin resultados:
┌─────────────────────────────────────────┐
│                                         │
│              🔍                         │
│                                         │
│     No se encontraron resultados        │
│                                         │
│     Intenta con otros términos          │
│     de búsqueda                         │
│                                         │
└─────────────────────────────────────────┘
```

---

### Animaciones y Micro-interacciones

```
1. Nuevo mensaje entrante:
   - Slide in desde la izquierda (300ms)
   - Highlight suave del item en la lista
   - Sonido sutil (opcional, configurable)

2. Enviar mensaje:
   - Aparece con opacity 0.7 → 1.0
   - Check animado al confirmar envío

3. Tomar conversación:
   - Transición de color en el badge
   - Input aparece con slide up

4. Scroll infinito:
   - Skeleton loaders al cargar más
   - Smooth scroll al anclar en posición

5. Typing indicator:
   - 3 puntos con animación bounce
   - "María está escribiendo..."

6. Cambio de vista (mobile):
   - Slide left/right entre lista y chat
   - Duración: 250ms ease-out
```
