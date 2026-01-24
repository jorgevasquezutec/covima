export interface User {
  id: number;
  codigoPais: string;
  telefono: string;
  nombre: string;
  roles: string[];
  debeCambiarPassword: boolean;
  nombreWhatsapp?: string;
  email?: string;
  ultimoLogin?: string;
  fotoUrl?: string;
}

export interface LoginRequest {
  codigoPais: string;
  telefono: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Usuario {
  id: number;
  codigoPais: string;
  telefono: string;
  nombre: string;
  nombreWhatsapp?: string;
  email?: string;
  activo: boolean;
  debeCambiarPassword: boolean;
  ultimoLogin?: string;
  createdAt: string;
  roles: string[];
  fotoUrl?: string;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
}

export interface CreateUsuarioRequest {
  codigoPais: string;
  telefono: string;
  nombre: string;
  password?: string;
  email?: string;
  nombreWhatsapp?: string;
  roles?: string[];
  activo?: boolean;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
}

export interface UpdateUsuarioRequest {
  nombre?: string;
  email?: string;
  nombreWhatsapp?: string;
  roles?: string[];
  activo?: boolean;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

// ==================== PROGRAMAS ====================

export interface Parte {
  id: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  esFija: boolean;
  esObligatoria: boolean;
  textoFijo?: string;
  activo: boolean;
}

export interface ProgramaParte {
  id: number;
  parteId: number;
  parte: Parte;
  orden: number;
}

export interface ProgramaAsignacion {
  id: number;
  parte: Parte;
  usuario: {
    id: number;
    nombre: string;
    codigoPais?: string;
    telefono?: string;
  } | null;
  nombreLibre?: string | null;
  orden: number;
  notificado: boolean;
  confirmado: boolean;
}

export interface ProgramaLink {
  id: number;
  parte: Parte;
  nombre: string;
  url: string;
  orden: number;
}

export interface Programa {
  id: number;
  codigo: string;
  fecha: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  titulo: string;
  estado: 'borrador' | 'completo' | 'enviado' | 'finalizado';
  textoGenerado?: string;
  creador?: {
    id: number;
    nombre: string;
  };
  enviadoAt?: string;
  createdAt: string;
  partes: ProgramaParte[];
  asignaciones: ProgramaAsignacion[];
  links: ProgramaLink[];
}

export interface ParteOrdenDto {
  parteId: number;
  orden: number;
}

export interface AsignacionDto {
  parteId: number;
  usuarioIds?: number[];
  nombresLibres?: string[];
}

export interface LinkDto {
  parteId: number;
  nombre: string;
  url: string;
}

export interface CreateProgramaRequest {
  fecha: string;
  titulo?: string;
  horaInicio?: string;
  horaFin?: string;
  partes?: ParteOrdenDto[];
  asignaciones?: AsignacionDto[];
  links?: LinkDto[];
}

export interface UpdateProgramaRequest {
  fecha?: string;
  titulo?: string;
  horaInicio?: string;
  horaFin?: string;
  estado?: 'borrador' | 'completo' | 'enviado' | 'finalizado';
  partes?: ParteOrdenDto[];
  asignaciones?: AsignacionDto[];
  links?: LinkDto[];
}

export interface UsuarioSimple {
  id: number;
  nombre: string;
  codigoPais?: string;
  telefono?: string;
}

// ==================== TIPOS DE ASISTENCIA ====================

export interface FormularioCampo {
  id: number;
  nombre: string;
  label: string;
  tipo: 'number' | 'checkbox' | 'text' | 'select' | 'rating';
  requerido: boolean;
  orden: number;
  placeholder?: string;
  valorMinimo?: number;
  valorMaximo?: number;
  opciones?: { value: string; label: string }[];
}

export interface TipoAsistencia {
  id: number;
  nombre: string;
  label: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  soloPresencia: boolean;
  activo: boolean;
  orden: number;
  campos: FormularioCampo[];
  totalQRs?: number;
  totalAsistencias?: number;
}

export interface CreateTipoAsistenciaRequest {
  nombre: string;
  label: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  soloPresencia?: boolean;
  orden?: number;
  campos?: Omit<FormularioCampo, 'id'>[];
}

export interface UpdateTipoAsistenciaRequest {
  label?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  soloPresencia?: boolean;
  orden?: number;
  activo?: boolean;
}

// ==================== ASISTENCIA ====================

export interface QRAsistencia {
  id: number;
  semanaInicio: string;
  codigo: string;
  tipoAsistencia: TipoAsistencia | null;
  descripcion?: string;
  urlGenerada?: string;
  urlWhatsapp?: string;
  activo: boolean;
  horaInicio: string;
  horaFin: string;
  creador?: UsuarioSimple;
  totalAsistencias: number;
  createdAt: string;
}

export interface Asistencia {
  id: number;
  usuario?: UsuarioSimple | null;
  telefonoRegistro?: string | null;
  nombreRegistro?: string | null;
  fecha: string;
  semanaInicio: string;
  datosFormulario?: Record<string, unknown>;
  metodoRegistro: 'qr_web' | 'qr_bot' | 'plataforma' | 'manual';
  estado: 'pendiente_confirmacion' | 'confirmado' | 'rechazado';
  confirmador?: UsuarioSimple;
  confirmadoAt?: string;
  notasConfirmacion?: string;
  qr?: {
    id: number;
    codigo: string;
  };
  tipo?: {
    id: number;
    nombre: string;
    label: string;
    color?: string;
  };
  createdAt: string;
}

export interface CreateQRRequest {
  semanaInicio: string;
  tipoId: number;
  horaInicio?: string;
  horaFin?: string;
  descripcion?: string;
}

export interface RegistrarAsistenciaRequest {
  codigoQR?: string;
  tipoId?: number;
  datosFormulario?: Record<string, unknown>;
  metodoRegistro?: string;
}

export interface ConfirmarAsistenciaRequest {
  estado: 'confirmado' | 'rechazado';
  notas?: string;
}

export interface EstadisticasSemana {
  semanaInicio: string;
  total: number;
  confirmados: number;
  pendientes: number;
  rechazados: number;
  porcentajeConfirmados: number;
}

export interface AsistenciaPorTipo {
  tipoId: number;
  nombre: string;
  label: string;
  color: string;
  cantidad: number;
}

export interface TipoAsistenciaInfo {
  id: number;
  nombre: string;
  label: string;
  color: string | null;
}

export interface EstadisticasMes {
  mes: string;
  mesNombre: string;
  total: number;
  confirmados: number;
  porcentajeConfirmados: number;
  porTipo: AsistenciaPorTipo[];
}

export interface EstadisticasGenerales {
  totalUsuarios: number;
  promedioAsistencia: number;
  tipos: TipoAsistenciaInfo[];
  meses: EstadisticasMes[];
}

export interface MiAsistencia {
  totalAsistencias: number;
  historial: {
    semanaInicio: string;
    fecha: string;
    tipo?: { id: number; nombre: string; label: string };
    datosFormulario?: Record<string, unknown>;
  }[];
}

// ==================== WEBSOCKET ====================

export interface RoomUser {
  id: number;
  nombre: string;
  joinedAt: string;
}

export interface RoomState {
  usuarios: RoomUser[];
  totalEnRoom: number;
}

// Notificaciones WhatsApp
export interface NotificacionUsuario {
  usuario: {
    id: number;
    nombre: string;
    telefono: string;
    codigoPais: string;
  };
  partes: string[];
  mensaje: string;
}

export interface UsuarioSinTelefono {
  id: number;
  nombre: string;
  partes: string[];
}

export interface PreviewNotificacionesResponse {
  programa: {
    id: number;
    codigo: string;
    fecha: string;
    titulo: string;
  };
  notificaciones: NotificacionUsuario[];
  usuariosSinTelefono: UsuarioSinTelefono[];
  resumen: {
    totalUsuariosConTelefono: number;
    totalUsuariosSinTelefono: number;
    totalAsignaciones: number;
  };
}

