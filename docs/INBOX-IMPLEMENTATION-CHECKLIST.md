# Inbox & Handoff - Checklist de Implementación

Este documento sirve como guía paso a paso para implementar el sistema de Inbox y Handoff. Marcar cada item como completado conforme se avanza.

> **Referencia:** Ver [INBOX-HANDOFF.md](./INBOX-HANDOFF.md) para detalles técnicos de cada sección.

---

## Estado Actual

- **Última actualización:** 2026-01-29
- **Fase actual:** Fases 1-9 completadas
- **Próximo paso:** Fase 10 (Testing y Deploy)

---

## Fase 1: Base de Datos

### Schema Prisma

- [x] Agregar campos a modelo `Conversacion`:
  - [x] `modo` (enum: BOT, HANDOFF, PAUSADO)
  - [x] `derivadaAId` (relación a Usuario)
  - [x] `derivadaAt` (DateTime)
  - [x] `ultimoMensaje` (String)
  - [x] `mensajesNoLeidos` (Int)
- [x] Actualizar modelo `Mensaje`:
  - [x] `direccion` cambiado a enum `DireccionMensaje`
  - [x] `enviadoPorId` (quien envió)
  - [x] `whatsappMsgId` (deduplicación)
  - [x] `estado` (enum EstadoMensaje)
  - [x] `leidoAt`
- [x] Crear enums:
  - [x] `ModoConversacion`
  - [x] `DireccionMensaje`
  - [x] `EstadoMensaje`
- [x] Agregar campos de preferencias a `Usuario`:
  - [x] `recibirNotificacionesWhatsApp`
  - [x] `notificarNuevasConversaciones`
- [x] Agregar relaciones a `Usuario`:
  - [x] `conversacionesDerivadas`
  - [x] `mensajesEnviados`
- [x] Crear índices para performance:
  - [x] `Conversacion(modo, updatedAt)`
  - [x] `Conversacion(derivadaAId, modo)`
  - [x] `Mensaje(conversacionId, createdAt)`
  - [x] `Mensaje(whatsappMsgId)` unique

### Migración

- [x] Sincronizar BD: `npx prisma db push` (desarrollo)
- [ ] Crear migración formal para producción
- [ ] Aplicar en producción cuando esté listo

---

## Fase 2: Backend - Servicios

### InboxService (`src/inbox/inbox.service.ts`)

- [x] Crear módulo `InboxModule`
- [x] Implementar `getConversaciones(cursor, limit, modo)` - paginación cursor-based
- [x] Implementar `getConversacion(id)` - detalle
- [x] Implementar `getMensajes(conversacionId, cursor, limit)` - paginación cursor-based
- [x] Implementar `guardarMensaje(data)` - crear mensaje
- [x] Implementar `enviarMensaje(conversacionId, contenido, adminId)` - admin envía
- [x] Implementar `tomarConversacion(conversacionId, adminId)` - handoff
- [x] Implementar `cerrarHandoff(conversacionId)` - devolver a bot
- [x] Implementar `transferirConversacion(conversacionId, nuevoAdminId)`
- [x] Implementar `marcarComoLeido(conversacionId, hastaMessageId)`

### InboxController (`src/inbox/inbox.controller.ts`)

- [x] `GET /api/inbox/conversaciones` - listar
- [x] `GET /api/inbox/conversaciones/:id` - detalle
- [x] `GET /api/inbox/conversaciones/:id/mensajes` - mensajes con paginación
- [x] `POST /api/inbox/conversaciones/:id/mensajes` - enviar mensaje
- [x] `POST /api/inbox/conversaciones/:id/tomar` - tomar conversación
- [x] `POST /api/inbox/conversaciones/:id/cerrar` - cerrar handoff
- [x] `POST /api/inbox/conversaciones/:id/transferir` - transferir
- [x] `POST /api/inbox/conversaciones/:id/leer` - marcar leído
- [x] Agregar guards de autenticación (solo ADMIN/LIDER)

---

## Fase 3: Backend - WebSocket

### InboxGateway (`src/inbox/inbox.gateway.ts`)

- [x] Crear gateway con namespace `/inbox`
- [x] Implementar autenticación en `handleConnection`
- [x] Implementar `handleJoin` - unirse a sala de conversación
- [x] Implementar `handleLeave` - salir de sala
- [x] Implementar `emitMensajeNuevo` - notificar nuevo mensaje
- [x] Implementar `emitConversacionActualizada` - notificar cambios
- [x] Implementar `emitConversacionNueva` - notificar nueva conversación
- [x] Implementar `emitTyping` - indicador de escritura

### Optimizaciones WebSocket

- [x] Implementar heartbeat/ping-pong
- [x] Implementar rate limiting por evento
- [x] Implementar throttling en typing (máx 1 cada 500ms)
- [x] Logging de conexiones/desconexiones

---

## Fase 4: Backend - Integración Bot

### Creación Automática de Conversaciones

- [x] Modificar webhook para llamar `getOrCreateConversacion`
- [x] Implementar `getOrCreateConversacion(telefono, nombreWhatsapp)`:
  - [x] Buscar conversación existente por teléfono
  - [x] Si no existe, crear nueva con modo BOT
  - [x] Vincular usuario existente si el teléfono coincide
  - [x] Emitir evento WebSocket `inbox:conversacion:nueva`

### Modificar IntentRouter

- [x] En `processMessage`, guardar mensaje entrante SIEMPRE
- [x] Verificar `conversacion.modo`:
  - [x] Si HANDOFF: no procesar con bot, notificar vía WebSocket
  - [x] Si HANDOFF + admin tiene notif. activa: reenviar a WhatsApp del admin
  - [x] Si BOT: procesar normalmente

### Detección de Admin

- [x] En webhook, verificar si mensaje viene de admin/líder
- [x] Si es admin, llamar `procesarMensajeAdmin`
- [x] Implementar `procesarMensajeAdmin`:
  - [x] Comando `/cerrar` - cerrar handoff
  - [x] Comando `/pendientes` - contar pendientes
  - [x] Comando `/ayuda` - listar comandos
  - [x] Prefijo `>>` - responder a usuario en handoff

### Timeout Automático

- [x] Crear cron job `liberarConversacionesInactivas`
- [x] Ejecutar cada 5 minutos
- [x] Buscar conversaciones HANDOFF sin actividad > 30 min
- [x] Notificar al admin (WhatsApp)
- [x] Notificar al usuario (WhatsApp)
- [x] Cambiar modo a BOT
- [x] Emitir evento WebSocket

---

## Fase 5: Frontend - Estructura

### Crear Archivos Base

- [x] `src/pages/inbox/InboxPage.tsx`
- [x] `src/pages/inbox/components/ConversationList.tsx`
- [x] `src/pages/inbox/components/ConversationItem.tsx`
- [x] `src/pages/inbox/components/ChatWindow.tsx`
- [x] `src/pages/inbox/components/MessageList.tsx`
- [x] `src/pages/inbox/components/MessageBubble.tsx`
- [x] `src/pages/inbox/components/MessageInput.tsx`
- [x] `src/pages/inbox/components/ChatHeader.tsx`
- [x] `src/pages/inbox/components/HandoffControls.tsx` (integrado en ChatHeader)
- [x] `src/pages/inbox/components/ConnectionStatus.tsx`

### Crear Hooks

- [x] `src/pages/inbox/hooks/useConversations.ts` - query de conversaciones
- [x] `src/pages/inbox/hooks/useMessages.ts` - query infinito de mensajes
- [x] `src/pages/inbox/hooks/useInboxSocket.ts` - WebSocket con reconexión
- [x] `src/pages/inbox/hooks/useSendMessage.ts` - mutation enviar
- [x] `src/pages/inbox/hooks/useTypingIndicator.ts` - debounce typing
- [x] `src/pages/inbox/hooks/useThrottledUpdates.ts` (no necesario, throttle en useTypingIndicator)

### Crear Types

- [x] `src/pages/inbox/types/inbox.types.ts`

---

## Fase 6: Frontend - Implementación

### InboxPage

- [x] Layout con sidebar (lista) + main (chat)
- [x] Estado para conversación seleccionada
- [x] Responsive: mobile muestra uno u otro

### ConversationList

- [x] Usar `useConversations` hook
- [x] Filtros: Todas, Bot, Mis conversaciones, Sin asignar
- [x] Búsqueda por nombre/teléfono
- [x] Indicadores de estado (verde, azul, amarillo)
- [x] Badge de mensajes no leídos
- [x] Scroll infinito con cursor

### ChatWindow

- [x] Header con info del usuario y acciones
- [x] MessageList virtualizado
- [x] Input condicional (solo en HANDOFF)
- [x] Botón "Tomar conversación" si es BOT/PAUSADO

### MessageList

- [ ] Virtualización con `@tanstack/react-virtual`
- [x] Scroll infinito hacia arriba (cargar antiguos)
- [x] Auto-scroll al recibir nuevo mensaje
- [x] Separadores de fecha
- [x] Typing indicator

### MessageBubble

- [x] Estilos diferentes: entrante (izq) vs saliente (der)
- [x] Indicador de quién envió (bot vs admin)
- [x] Estados de mensaje (enviando, enviado, entregado, leído, fallido)
- [x] Timestamp

### WebSocket Integration

- [x] Conexión con reconexión automática (backoff exponencial)
- [x] Escuchar `inbox:mensaje:nuevo`
- [x] Escuchar `inbox:conversacion:actualizada`
- [x] Escuchar `inbox:conversacion:nueva`
- [x] Escuchar `inbox:typing`
- [x] Cleanup de listeners al desmontar
- [x] UI de estado de conexión

---

## Fase 7: Frontend - Handoff

### HandoffControls

- [x] Botón "Tomar conversación" (si BOT o PAUSADO)
- [x] Dropdown "Cerrar" con opciones:
  - [x] Devolver al bot
  - [x] Transferir a otro admin
  - [ ] Marcar como resuelta (pendiente - no es crítico)
- [x] Confirmación antes de tomar/cerrar

### Transferir Conversación

- [x] Modal para seleccionar admin destino
- [x] Lista de admins disponibles
- [x] Mensaje opcional de contexto

---

## Fase 8: Frontend - Configuración

### Preferencias de Notificación

- [x] Agregar a página de configuración del usuario (ProfilePage.tsx)
- [x] Switch: Recibir mensajes en WhatsApp
- [x] Switch: Notificar nuevas conversaciones
- [x] Guardar preferencias vía API

---

## Fase 9: Navegación y Permisos

### Agregar al Menú

- [x] Agregar "Inbox" al sidebar
- [x] Solo visible para ADMIN/LIDER
- [ ] Badge con contador de pendientes (mejora futura)

### Rutas

- [x] Agregar ruta `/inbox`
- [ ] Agregar ruta `/inbox/:conversacionId` (deep link)
- [x] Proteger rutas (solo ADMIN/LIDER) - via ProtectedRoute

---

## Fase 10: Testing y Deploy

### Testing Unitario (Backend)

- [x] `inbox.service.spec.ts` - 25 tests
- [x] `inbox.controller.spec.ts` - 11 tests
- [x] `inbox.gateway.spec.ts` - 12 tests
- [x] `inbox.e2e-spec.ts` - Tests E2E (requiere DB)

### Testing Manual

- [ ] Probar creación automática de conversación
- [ ] Probar flujo completo de handoff (tomar → responder → cerrar)
- [ ] Probar respuesta desde WhatsApp del admin
- [ ] Probar timeout automático
- [ ] Probar reconexión de WebSocket
- [ ] Probar en móvil (responsive)

### Deploy

- [ ] Aplicar migración en producción
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verificar WebSocket en producción
- [ ] Monitorear logs

---

## Notas y Decisiones

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-01-28 | Documentación completa creada | Base para implementación |
| 2026-01-28 | Schema Prisma actualizado con campos inbox/handoff | Fase 1 completada |
| 2026-01-28 | Usado `prisma db push` en vez de migrate | Drift detectado, más rápido para dev |
| 2026-01-28 | `telefono` en Conversacion ahora es unique | Un teléfono = una conversación |
| 2026-01-28 | `direccion` en Mensaje cambiado a enum | Mejor type safety |
| 2026-01-29 | Fase 2 completada: InboxService y InboxController | Servicios REST listos |
| 2026-01-29 | Fase 3 completada: InboxGateway WebSocket | Tiempo real con Redis pub/sub |
| 2026-01-29 | Fase 4 completada: Integración Bot | Handoff, comandos admin, cron job |
| 2026-01-29 | Fase 5 y 6 completadas: Frontend estructura e implementación | Todos los componentes y hooks creados |
| 2026-01-29 | Fase 7 completada: Handoff UI | ConfirmDialog, TransferModal, Avatar component |
| 2026-01-29 | Fase 9 completada: Navegación | Inbox agregado al sidebar para admin/lider |
| 2026-01-29 | Fase 8 completada: Configuración | Preferencias de notificación en ProfilePage |
| 2026-01-29 | Fase 10 parcial: Testing unitario | 48 tests creados (service, controller, gateway) |

---

## Referencias

- [INBOX-HANDOFF.md](./INBOX-HANDOFF.md) - Documentación técnica completa
- Sección 6: Creación automática de conversaciones
- Sección 7: Flujo de handoff
- Sección 8: Responder desde WhatsApp del admin
- Sección 9: Optimizaciones (incluye WebSocket)
