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
  participaEnRanking?: boolean;
  esJA?: boolean;
  debeCambiarPassword: boolean;
  ultimoLogin?: string;
  createdAt: string;
  roles: string[];
  fotoUrl?: string;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
  notificarNuevasConversaciones?: boolean;
  modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
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
  esJA?: boolean;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
  notificarNuevasConversaciones?: boolean;
  modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
}

export interface UpdateUsuarioRequest {
  nombre?: string;
  email?: string;
  nombreWhatsapp?: string;
  roles?: string[];
  activo?: boolean;
  esJA?: boolean;
  fechaNacimiento?: string;
  direccion?: string;
  biografia?: string;
  notificarNuevasConversaciones?: boolean;
  modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
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
  // Gamificación
  puntos: number;
  xp: number;
}

export interface CreateParteRequest {
  nombre: string;
  descripcion?: string;
  orden?: number;
  esFija?: boolean;
  esObligatoria?: boolean;
  textoFijo?: string;
  puntos?: number;
  xp?: number;
}

export interface UpdateParteRequest {
  nombre?: string;
  descripcion?: string;
  orden?: number;
  esFija?: boolean;
  esObligatoria?: boolean;
  textoFijo?: string;
  activo?: boolean;
  puntos?: number;
  xp?: number;
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
  margenTemprana: number; // Minutos antes de horaInicio = temprana
  margenTardia: number; // Minutos después de horaInicio = tardía
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
  margenTemprana?: number;
  margenTardia?: number;
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

// ==================== GAMIFICACIÓN ====================

export interface NivelBiblico {
  id: number;
  numero: number;
  nombre: string;
  descripcion?: string;
  xpRequerido: number;
  icono?: string;
  color?: string;
  activo?: boolean;
  _count?: { usuariosEnNivel: number };
}

export interface CrearNivelRequest {
  numero: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
}

export interface ActualizarNivelRequest {
  numero?: number;
  nombre?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  activo?: boolean;
}

export interface Insignia {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  condicionTipo: string;
  condicionValor: number;
  puntosBonus: number;
  xpBonus: number;
  desbloqueada?: boolean;
  desbloqueadaAt?: string;
}

export interface ConfiguracionPuntaje {
  id: number;
  codigo: string;
  categoria: 'ASISTENCIA' | 'PARTICIPACION' | 'EVENTO_ESPECIAL' | 'LOGRO' | 'BONUS';
  nombre: string;
  descripcion?: string;
  puntos: number;
  xp: number;
  activo: boolean;
}

export interface HistorialPuntos {
  id: number;
  puntos: number;
  xp: number;
  descripcion?: string;
  fecha: string;
  trimestre: number;
  anio: number;
  configPuntaje?: ConfiguracionPuntaje;
  createdAt: string;
}

export interface EventoEspecialConfig {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  puntos: number;
  xp: number;
  icono?: string;
  color?: string;
  activo: boolean;
}

export interface PerfilGamificacion {
  puntosTotal: number;
  puntosTrimestre: number;
  xpTotal: number;
  rachaActual: number;
  rachaMejor: number;
  asistenciasTotales: number;
  participacionesTotales: number;
}

export interface MiProgreso {
  perfil: PerfilGamificacion;
  nivel: {
    actual: NivelBiblico;
    siguiente: NivelBiblico | null;
    xpParaSiguienteNivel: number;
    progresoXp: number;
  };
  posicionRanking: number;
  insignias: Insignia[];
  historialReciente: HistorialPuntos[];
}

export interface RankingUsuario {
  posicion: number;
  usuarioId: number;
  nombre: string;
  fotoUrl?: string;
  nivel: NivelBiblico;
  puntosPeriodo: number;
  rachaActual: number;
  asistenciasTotales: number;
}

export interface RankingFilters {
  periodoId?: number;
  tipo?: 'general' | 'asistencia' | 'participacion';
  limit?: number;
}

export type EstadoRanking = 'ACTIVO' | 'CERRADO' | 'PAUSADO';

export interface PeriodoRanking {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoRanking;
  creadoPorId?: number;
  cerradoAt?: string;
  cerradoPorId?: number;
  resultadosJson?: RankingUsuario[];
  createdAt: string;
  updatedAt: string;
  creadoPor?: { id: number; nombre: string };
  cerradoPor?: { id: number; nombre: string };
  _count?: { historialPuntos: number };
}

export interface AsignarPuntosResult {
  puntosAsignados: number;
  xpAsignado: number;
  nuevoNivel: boolean;
  nivelActual: { numero: number; nombre: string };
  insigniasDesbloqueadas: Array<{ codigo: string; nombre: string; icono: string }>;
  rachaActual: number;
}

export interface RegistrarEventoRequest {
  eventoConfigId: number;
  fecha: string;
  usuarioIds: number[];
  notas?: string;
}

export interface RegistrarEventoResponse {
  evento: string;
  fecha: string;
  resultados: Array<{ usuarioId: number; status: string; puntos?: number }>;
}

export interface CrearEventoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  puntos: number;
  xp?: number;
  icono?: string;
  color?: string;
}

export interface ActualizarEventoRequest {
  nombre?: string;
  descripcion?: string;
  puntos?: number;
  xp?: number;
  icono?: string;
  color?: string;
  activo?: boolean;
}

// ==================== GRUPOS DE RANKING ====================

export type TipoGrupoRanking = 'SISTEMA' | 'PERSONALIZADO';
export type CriterioMembresia = 'MANUAL' | 'TODOS_ACTIVOS' | 'ROL_LIDER' | 'ROL_ADMIN' | 'ROL_LIDER_ADMIN';

export interface GrupoRanking {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  tipo: TipoGrupoRanking;
  criterio: CriterioMembresia;
  esPublico: boolean;
  soloMiembros: boolean;
  totalMiembros?: number;
  periodo?: { id: number; nombre: string; estado: EstadoRanking };
  activo: boolean;
  creadoPor?: { id: number; nombre: string };
  createdAt?: string;
}

export interface GrupoRankingMiembro {
  id: number;
  grupoId: number;
  usuarioId: number;
  oculto: boolean;
  usuario: {
    id: number;
    nombre: string;
    fotoUrl?: string;
  };
}

export interface GrupoRankingDetalle extends GrupoRanking {
  miembros: GrupoRankingMiembro[];
}

export interface CrearGrupoRankingRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  esPublico?: boolean;
  soloMiembros?: boolean;
  periodoId?: number;
  miembrosIds?: number[];
}

export interface ActualizarGrupoRankingRequest {
  nombre?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  esPublico?: boolean;
  soloMiembros?: boolean;
  periodoId?: number;
  activo?: boolean;
}

export interface RankingGrupoUsuario {
  posicion: number;
  usuarioId: number;
  nombre: string;
  fotoUrl?: string;
  nivelNumero: number;
  nivelNombre: string;
  nivelColor?: string;
  puntosPeriodo: number;
  rachaActual: number;
  esUsuarioActual?: boolean;
}

export interface MiVisibilidadRanking {
  ocultoEnGeneral: boolean;
  grupos: {
    grupoId: number;
    codigo: string;
    nombre: string;
    icono?: string;
    oculto: boolean;
  }[];
}

export interface PosicionGrupo {
  grupoId: number;
  codigo: string;
  nombre: string;
  icono: string | null;
  posicion: number;
  totalMiembros: number;
}

export interface HistorialPuntosItem {
  id: number;
  puntos: number;
  xp: number;
  descripcion?: string;
  fecha: string;
  createdAt: string;
  categoria: string;
  tipoPuntaje: string;
  periodo?: { id: number; nombre: string } | null;
}

export interface HistorialPuntosResponse {
  data: HistorialPuntosItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ResumenPeriodo {
  periodo: {
    id: number;
    nombre: string;
    fechaInicio: string;
    fechaFin?: string;
    estado: EstadoRanking;
  };
  puntosTotal: number;
  xpTotal: number;
  totalRegistros: number;
  posicionFinal: number;
  totalParticipantes: number;
  porCategoria: Record<string, { puntos: number; cantidad: number }>;
}

// Admin: Historial de puntos
export interface HistorialAdminItem {
  id: number;
  usuario: { id: number; nombre: string; fotoUrl?: string };
  categoria: string;
  accion: string;
  descripcion?: string;
  puntos: number;
  xp: number;
  fecha: string;
  periodo?: { id: number; nombre: string } | null;
  createdAt: string;
}

export interface HistorialAdminResponse {
  items: HistorialAdminItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

