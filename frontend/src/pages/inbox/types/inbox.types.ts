// ==================== INBOX TYPES ====================

export type ModoConversacion = 'BOT' | 'HANDOFF' | 'PAUSADO';
export type DireccionMensaje = 'ENTRANTE' | 'SALIENTE';
export type EstadoMensaje = 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO' | 'LEIDO' | 'FALLIDO';
export type ModoRespuestaHandoff = 'WEB' | 'WHATSAPP' | 'AMBOS';

export interface ConversacionUsuario {
  id: number;
  nombre: string;
  nombreWhatsapp?: string;
  fotoUrl?: string;
}

export interface ConversacionAdmin {
  id: number;
  nombre: string;
  modoHandoffDefault?: ModoRespuestaHandoff;
}

export interface Conversacion {
  id: number;
  telefono: string;
  modo: ModoConversacion;
  estado: string;
  ultimoMensaje?: string;
  mensajesNoLeidos: number;
  modoRespuesta?: ModoRespuestaHandoff | null;
  updatedAt: string;
  createdAt: string;
  derivadaAt?: string;
  usuario: ConversacionUsuario | null;
  derivadaA: ConversacionAdmin | null;
}

export interface MensajeEnviadoPor {
  id: number;
  nombre: string;
}

export interface Mensaje {
  id: number;
  contenido: string;
  tipo: string;
  direccion: DireccionMensaje;
  estado: EstadoMensaje;
  createdAt: string;
  leidoAt?: string;
  enviadoPor: MensajeEnviadoPor | null;
}

// ==================== API RESPONSES ====================

export interface ConversacionesResponse {
  data: Conversacion[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MensajesResponse {
  data: Mensaje[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface EnviarMensajeResponse {
  mensaje: Mensaje;
  enviado: boolean;
}

export interface TomarConversacionResponse {
  success: boolean;
  conversacion: Conversacion;
}

export interface AdminDisponible {
  id: number;
  nombre: string;
  fotoUrl?: string;
  rol?: string;
}

// ==================== WEBSOCKET EVENTS ====================

export interface SocketMensajeNuevo {
  id: number;
  contenido: string;
  tipo: string;
  direccion: DireccionMensaje;
  estado: EstadoMensaje;
  createdAt: string;
  enviadoPor: MensajeEnviadoPor | null;
}

export interface SocketConversacionActualizada {
  id: number;
  telefono?: string;
  modo?: ModoConversacion;
  ultimoMensaje?: string;
  mensajesNoLeidos?: number;
  updatedAt?: string;
  derivadaA?: ConversacionAdmin | null;
}

export interface SocketTyping {
  odId: number;
  nombre: string;
  conversacionId: number;
  isTyping: boolean;
}

export interface SocketAdminJoined {
  odId: number;
  nombre: string;
  conversacionId: number;
}

// ==================== FILTER OPTIONS ====================

export type ModoFiltro = 'TODOS' | 'BOT' | 'HANDOFF' | 'PAUSADO';

export interface ConversacionesFilters {
  modo?: ModoFiltro;
  misConversaciones?: boolean;
  search?: string;
}
