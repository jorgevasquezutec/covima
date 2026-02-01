import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  ChangePasswordRequest,
  Usuario,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  PaginatedResponse,
  Rol,
  PeriodoRanking,
  UsuariosInactivosResponse,
  ResumenInactividad,
  RankingsPorNivelResponse,
  PosicionEnNivel,
  EstadisticasDashboard,
} from '@/types';

// En desarrollo, usar la misma IP/host del navegador para la API
const getApiUrl = (): string => {
  // Si hay variable de entorno, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // En desarrollo, usar el mismo host que el frontend pero puerto 3000
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.post('/auth/change-password', data);
  },
};

export const usuariosApi = {
  getAll: async (params?: {
    search?: string;
    rol?: string;
    activo?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Usuario>> => {
    const response = await api.get<PaginatedResponse<Usuario>>('/usuarios', { params });
    return response.data;
  },

  getOne: async (id: number): Promise<Usuario> => {
    const response = await api.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  create: async (data: CreateUsuarioRequest): Promise<Usuario> => {
    const response = await api.post<Usuario>('/usuarios', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUsuarioRequest): Promise<Usuario> => {
    const response = await api.put<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await api.patch(`/usuarios/${id}/reset-password`, { newPassword });
  },

  toggleActive: async (id: number): Promise<Usuario> => {
    const response = await api.patch<Usuario>(`/usuarios/${id}/toggle-active`);
    return response.data;
  },

  toggleRanking: async (id: number): Promise<Usuario> => {
    const response = await api.patch<Usuario>(`/usuarios/${id}/toggle-ranking`);
    return response.data;
  },

  getRoles: async (): Promise<Rol[]> => {
    const response = await api.get<Rol[]>('/usuarios/roles');
    return response.data;
  },

  // Perfil del usuario actual
  getMyProfile: async (): Promise<any> => {
    const response = await api.get('/usuarios/profile/me');
    return response.data;
  },

  updateMyProfile: async (data: {
    nombre?: string;
    email?: string;
    fotoUrl?: string;
    fechaNacimiento?: string;
    direccion?: string;
    biografia?: string;
    notificarNuevasConversaciones?: boolean;
    modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
  }): Promise<any> => {
    const response = await api.patch('/usuarios/profile/me', data);
    return response.data;
  },

  uploadProfilePhoto: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('foto', file);
    const response = await api.post('/usuarios/profile/me/foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin: actualizar teléfono de usuario
  updateTelefono: async (id: number, codigoPais: string, telefono: string): Promise<Usuario> => {
    const response = await api.patch<Usuario>(`/usuarios/${id}/telefono`, { codigoPais, telefono });
    return response.data;
  },

  // Admin: subir foto de usuario
  uploadUserPhoto: async (id: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('foto', file);
    const response = await api.post(`/usuarios/${id}/foto`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Cumpleaños del mes
  getCumpleanosDelMes: async (params?: { mes?: number; anio?: number }): Promise<{
    mes: number;
    mesNombre: string;
    anio: number;
    cumpleaneros: { id: number; nombre: string; dia: number; mes: number }[];
  }> => {
    const response = await api.get('/usuarios/cumpleanos-mes', { params });
    return response.data;
  },

  // ==================== SEGUIMIENTO DE INACTIVIDAD ====================

  getUsuariosInactivos: async (params?: {
    nivel?: 'critico' | 'en_riesgo' | 'activo' | 'todos';
    nivelGamificacionId?: number;
    ordenarPor?: 'ultimaAsistencia' | 'ultimaActividad' | 'nombre';
    orden?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<UsuariosInactivosResponse> => {
    const response = await api.get<UsuariosInactivosResponse>('/usuarios/inactivos', { params });
    return response.data;
  },

  getResumenInactividad: async (): Promise<ResumenInactividad> => {
    const response = await api.get<ResumenInactividad>('/usuarios/inactivos/resumen');
    return response.data;
  },
};

// ==================== PROGRAMAS API ====================

import type {
  Programa,
  Parte,
  CreateProgramaRequest,
  UpdateProgramaRequest,
  CreateParteRequest,
  UpdateParteRequest,
  UsuarioSimple,
  PreviewNotificacionesResponse,
} from '@/types';

export const programasApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    estado?: string;
  }): Promise<PaginatedResponse<Programa>> => {
    const response = await api.get<PaginatedResponse<Programa>>('/programas', { params });
    return response.data;
  },

  getOne: async (id: number): Promise<Programa> => {
    const response = await api.get<Programa>(`/programas/${id}`);
    return response.data;
  },

  create: async (data: CreateProgramaRequest): Promise<Programa> => {
    const response = await api.post<Programa>('/programas', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProgramaRequest): Promise<Programa> => {
    const response = await api.put<Programa>(`/programas/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/programas/${id}`);
  },

  getPartes: async (): Promise<Parte[]> => {
    const response = await api.get<Parte[]>('/programas/partes');
    return response.data;
  },

  getPartesObligatorias: async (): Promise<Parte[]> => {
    const response = await api.get<Parte[]>('/programas/partes/obligatorias');
    return response.data;
  },

  getPartesOpcionales: async (): Promise<Parte[]> => {
    const response = await api.get<Parte[]>('/programas/partes/opcionales');
    return response.data;
  },

  // CRUD Partes (Admin)
  getAllPartes: async (): Promise<Parte[]> => {
    const response = await api.get<Parte[]>('/programas/partes/all');
    return response.data;
  },

  createParte: async (data: CreateParteRequest): Promise<Parte> => {
    const response = await api.post<Parte>('/programas/partes', data);
    return response.data;
  },

  updateParte: async (id: number, data: UpdateParteRequest): Promise<Parte> => {
    const response = await api.put<Parte>(`/programas/partes/${id}`, data);
    return response.data;
  },

  deleteParte: async (id: number): Promise<Parte> => {
    const response = await api.delete<Parte>(`/programas/partes/${id}`);
    return response.data;
  },

  getUsuarios: async (): Promise<UsuarioSimple[]> => {
    const response = await api.get<UsuarioSimple[]>('/programas/usuarios');
    return response.data;
  },

  generarTexto: async (id: number): Promise<{ texto: string }> => {
    const response = await api.post<{ texto: string }>(`/programas/${id}/generar-texto`);
    return response.data;
  },

  previewNotificaciones: async (id: number): Promise<PreviewNotificacionesResponse> => {
    const response = await api.get<PreviewNotificacionesResponse>(`/programas/${id}/preview-notificaciones`);
    return response.data;
  },

  enviarNotificaciones: async (id: number, usuarioIds?: number[]): Promise<{
    enviados: number;
    errores: number;
    detalles: { nombre: string; telefono: string; success: boolean; error?: string }[];
  }> => {
    const response = await api.post(`/programas/${id}/enviar-notificaciones`, {
      usuarioIds,
    });
    return response.data;
  },

  previewFinalizarPrograma: async (id: number): Promise<{
    programa: { id: number; titulo: string; fecha: string; estado: string };
    resumen: { participantes: number; puntosTotal: number; xpTotal: number };
    detalles: { usuario: string; usuarioId: number; parte: string; parteId: number; puntos: number; xp: number }[];
  }> => {
    const response = await api.get(`/programas/${id}/preview-finalizacion`);
    return response.data;
  },

  finalizarPrograma: async (id: number): Promise<{
    message: string;
    programa: { id: number; titulo: string; fecha: string; estado: string };
    resumen: { participantes: number; errores: number; puntosAsignados: number; xpAsignado: number };
    detalles: { usuario: string; parte: string; puntos: number; xp: number; success: boolean; error?: string }[];
  }> => {
    const response = await api.post(`/programas/${id}/finalizar`);
    return response.data;
  },

  // Dashboard endpoints
  getMisAsignaciones: async (): Promise<{
    id: number;
    fecha: string;
    titulo: string;
    estado: string;
    partes: { id: number; nombre: string }[];
  }[]> => {
    const response = await api.get('/programas/mis-asignaciones');
    return response.data;
  },

  getEstadisticasAdmin: async (): Promise<{
    programasEsteMes: number;
    programasPendientes: number;
    totalProgramas: number;
  }> => {
    const response = await api.get('/programas/estadisticas-admin');
    return response.data;
  },

  // ==================== PLANTILLAS ====================

  getPlantillas: async (): Promise<PlantillaPrograma[]> => {
    const response = await api.get<PlantillaPrograma[]>('/programas/plantillas');
    return response.data;
  },

  getPlantilla: async (id: number): Promise<PlantillaPrograma> => {
    const response = await api.get<PlantillaPrograma>(`/programas/plantillas/${id}`);
    return response.data;
  },

  createPlantilla: async (data: {
    nombre: string;
    descripcion?: string;
    parteIds: number[];
    esDefault?: boolean;
  }): Promise<PlantillaPrograma> => {
    const response = await api.post<PlantillaPrograma>('/programas/plantillas', data);
    return response.data;
  },

  updatePlantilla: async (id: number, data: {
    nombre?: string;
    descripcion?: string;
    activo?: boolean;
    esDefault?: boolean;
    parteIds?: number[];
  }): Promise<PlantillaPrograma> => {
    const response = await api.put<PlantillaPrograma>(`/programas/plantillas/${id}`, data);
    return response.data;
  },

  deletePlantilla: async (id: number): Promise<void> => {
    await api.delete(`/programas/plantillas/${id}`);
  },
};

// ==================== TIPOS DE ASISTENCIA API ====================

import type {
  TipoAsistencia,
  CreateTipoAsistenciaRequest,
  UpdateTipoAsistenciaRequest,
  FormularioCampo,
} from '@/types';

export const tiposAsistenciaApi = {
  getAll: async (params?: { activo?: boolean }): Promise<TipoAsistencia[]> => {
    const response = await api.get<TipoAsistencia[]>('/tipos-asistencia', { params });
    return response.data;
  },

  getOne: async (id: number): Promise<TipoAsistencia> => {
    const response = await api.get<TipoAsistencia>(`/tipos-asistencia/${id}`);
    return response.data;
  },

  create: async (data: CreateTipoAsistenciaRequest): Promise<TipoAsistencia> => {
    const response = await api.post<TipoAsistencia>('/tipos-asistencia', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTipoAsistenciaRequest): Promise<TipoAsistencia> => {
    const response = await api.put<TipoAsistencia>(`/tipos-asistencia/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tipos-asistencia/${id}`);
  },

  addCampo: async (tipoId: number, campo: Omit<FormularioCampo, 'id'>): Promise<FormularioCampo> => {
    const response = await api.post<FormularioCampo>(`/tipos-asistencia/${tipoId}/campos`, campo);
    return response.data;
  },

  updateCampo: async (campoId: number, campo: Partial<FormularioCampo>): Promise<FormularioCampo> => {
    const response = await api.put<FormularioCampo>(`/tipos-asistencia/campos/${campoId}`, campo);
    return response.data;
  },

  deleteCampo: async (campoId: number): Promise<void> => {
    await api.delete(`/tipos-asistencia/campos/${campoId}`);
  },

  reorderCampos: async (tipoId: number, campoIds: number[]): Promise<TipoAsistencia> => {
    const response = await api.put<TipoAsistencia>(`/tipos-asistencia/${tipoId}/campos/reorder`, { campoIds });
    return response.data;
  },
};

// ==================== ASISTENCIA API ====================

import type {
  QRAsistencia,
  Asistencia,
  CreateQRRequest,
  RegistrarAsistenciaRequest,
  ConfirmarAsistenciaRequest,
  EstadisticasGenerales,
  EstadisticasSemana,
  MiAsistencia,
} from '@/types';

export const asistenciaApi = {
  // QR endpoints
  createQR: async (data: CreateQRRequest): Promise<QRAsistencia> => {
    const response = await api.post<QRAsistencia>('/asistencia/qr', data);
    return response.data;
  },

  getAllQRs: async (params?: {
    page?: number;
    limit?: number;
    activo?: boolean;
  }): Promise<PaginatedResponse<QRAsistencia>> => {
    const response = await api.get<PaginatedResponse<QRAsistencia>>('/asistencia/qr', { params });
    return response.data;
  },

  getQRByCodigo: async (codigo: string): Promise<QRAsistencia> => {
    const response = await api.get<QRAsistencia>(`/asistencia/qr/${codigo}`);
    return response.data;
  },

  getQRsDisponibles: async (): Promise<QRAsistencia[]> => {
    const response = await api.get<QRAsistencia[]>('/asistencia/qrs-disponibles');
    return response.data;
  },

  toggleQRActive: async (id: number): Promise<QRAsistencia> => {
    const response = await api.patch<QRAsistencia>(`/asistencia/qr/${id}/toggle`);
    return response.data;
  },

  updateQR: async (id: number, data: { semanaInicio?: string; horaInicio?: string; horaFin?: string; margenTemprana?: number; margenTardia?: number; descripcion?: string }): Promise<QRAsistencia> => {
    const response = await api.patch<QRAsistencia>(`/asistencia/qr/${id}`, data);
    return response.data;
  },

  deleteQR: async (id: number): Promise<{ message: string; codigo: string; asistenciasEliminadas: number }> => {
    const response = await api.delete<{ message: string; codigo: string; asistenciasEliminadas: number }>(`/asistencia/qr/${id}`);
    return response.data;
  },

  // Asistencia endpoints
  registrar: async (data: RegistrarAsistenciaRequest): Promise<Asistencia> => {
    const response = await api.post<Asistencia>('/asistencia/registrar', data);
    return response.data;
  },

  registrarManual: async (data: {
    codigoQR: string;
    usuarioId?: number;
    telefonoManual?: string;
    nombreManual?: string;
    datosFormulario?: Record<string, unknown>;
  }): Promise<Asistencia> => {
    const response = await api.post<Asistencia>('/asistencia/registrar-manual', data);
    return response.data;
  },

  registrarHistorica: async (data: {
    codigoQR: string;
    usuarioId?: number;
    telefonoManual?: string;
    nombreManual?: string;
    tipoAsistenciaManual: 'temprana' | 'normal' | 'tardia';
    datosFormulario?: Record<string, unknown>;
  }): Promise<Asistencia> => {
    const response = await api.post<Asistencia>('/asistencia/registrar-historica', data);
    return response.data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    semanaInicio?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    usuarioId?: number;
    tipoId?: number;
  }): Promise<PaginatedResponse<Asistencia>> => {
    const response = await api.get<PaginatedResponse<Asistencia>>('/asistencia', { params });
    return response.data;
  },

  confirmar: async (id: number, data: ConfirmarAsistenciaRequest): Promise<Asistencia> => {
    const response = await api.patch<Asistencia>(`/asistencia/${id}/confirmar`, data);
    return response.data;
  },

  confirmarMultiples: async (ids: number[], estado: 'confirmado' | 'rechazado'): Promise<{ count: number; message: string }> => {
    const response = await api.post<{ count: number; message: string }>('/asistencia/confirmar-multiples', { ids, estado });
    return response.data;
  },

  vincularUsuario: async (asistenciaId: number, usuarioId: number): Promise<Asistencia> => {
    const response = await api.patch<Asistencia>(`/asistencia/${asistenciaId}/vincular-usuario`, { usuarioId });
    return response.data;
  },

  deleteAsistencia: async (id: number): Promise<{ mensaje: string }> => {
    const response = await api.delete<{ mensaje: string }>(`/asistencia/${id}`);
    return response.data;
  },

  // Estadísticas
  getEstadisticasGenerales: async (): Promise<EstadisticasGenerales> => {
    const response = await api.get<EstadisticasGenerales>('/asistencia/estadisticas');
    return response.data;
  },

  getEstadisticasSemana: async (semanaInicio: string): Promise<EstadisticasSemana> => {
    const response = await api.get<EstadisticasSemana>('/asistencia/estadisticas/semana', { params: { semanaInicio } });
    return response.data;
  },

  getMiAsistencia: async (): Promise<MiAsistencia> => {
    const response = await api.get<MiAsistencia>('/asistencia/mi-asistencia');
    return response.data;
  },

  exportarExcel: async (params?: {
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    tipoId?: number;
  }): Promise<Blob> => {
    const response = await api.get('/asistencia/exportar', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};

// ==================== INBOX API ====================

import type {
  Conversacion,
  ConversacionesResponse,
  MensajesResponse,
  EnviarMensajeResponse,
  TomarConversacionResponse,
  AdminDisponible,
  ModoFiltro,
} from '@/pages/inbox/types/inbox.types';

// ==================== GAMIFICACIÓN API ====================

import type {
  MiProgreso,
  RankingUsuario,
  RankingFilters,
  NivelBiblico,
  Insignia,
  ConfiguracionPuntaje,
  EventoEspecialConfig,
  RegistrarEventoRequest,
  RegistrarEventoResponse,
  CrearEventoRequest,
  ActualizarEventoRequest,
  GrupoRanking,
  GrupoRankingDetalle,
  RankingGrupoUsuario,
  CrearGrupoRankingRequest,
  ActualizarGrupoRankingRequest,
  MiVisibilidadRanking,
  PosicionGrupo,
  HistorialPuntosResponse,
  ResumenPeriodo,
  CrearNivelRequest,
  ActualizarNivelRequest,
  HistorialAdminResponse,
} from '@/types';

export const gamificacionApi = {
  getMiProgreso: async (): Promise<MiProgreso> => {
    const response = await api.get<MiProgreso>('/gamificacion/mi-progreso');
    return response.data;
  },

  // Historial completo de puntos con paginación
  getMiHistorial: async (params?: {
    periodoId?: number;
    page?: number;
    limit?: number;
  }): Promise<HistorialPuntosResponse> => {
    const response = await api.get<HistorialPuntosResponse>(
      '/gamificacion/mi-historial',
      { params }
    );
    return response.data;
  },

  // Resumen de mis puntos por período
  getMisPeriodos: async (): Promise<ResumenPeriodo[]> => {
    const response = await api.get<ResumenPeriodo[]>('/gamificacion/mis-periodos');
    return response.data;
  },

  getRanking: async (params?: RankingFilters): Promise<RankingUsuario[]> => {
    const response = await api.get<RankingUsuario[]>('/gamificacion/ranking', { params });
    return response.data;
  },

  getNiveles: async (incluirInactivos = false): Promise<NivelBiblico[]> => {
    const response = await api.get<NivelBiblico[]>('/gamificacion/niveles', {
      params: { incluirInactivos },
    });
    return response.data;
  },

  // [Admin] Obtener nivel por ID
  getNivel: async (id: number): Promise<NivelBiblico> => {
    const response = await api.get<NivelBiblico>(`/gamificacion/niveles/${id}`);
    return response.data;
  },

  // [Admin] Crear nivel
  crearNivel: async (data: CrearNivelRequest): Promise<NivelBiblico> => {
    const response = await api.post<NivelBiblico>('/gamificacion/niveles', data);
    return response.data;
  },

  // [Admin] Actualizar nivel
  actualizarNivel: async (id: number, data: ActualizarNivelRequest): Promise<NivelBiblico> => {
    const response = await api.put<NivelBiblico>(`/gamificacion/niveles/${id}`, data);
    return response.data;
  },

  // [Admin] Eliminar nivel
  eliminarNivel: async (id: number): Promise<{ mensaje: string }> => {
    const response = await api.delete(`/gamificacion/niveles/${id}`);
    return response.data;
  },

  // [Admin] Recalcular XP de todos los niveles
  recalcularXpNiveles: async (): Promise<{ mensaje: string }> => {
    const response = await api.post('/gamificacion/niveles/recalcular-xp');
    return response.data;
  },

  getMisInsignias: async (): Promise<Insignia[]> => {
    const response = await api.get<Insignia[]>('/gamificacion/insignias');
    return response.data;
  },

  getEventosEspeciales: async (): Promise<EventoEspecialConfig[]> => {
    const response = await api.get<EventoEspecialConfig[]>('/gamificacion/eventos-especiales');
    return response.data;
  },

  // Admin endpoints
  getConfigPuntajes: async (): Promise<ConfiguracionPuntaje[]> => {
    const response = await api.get<ConfiguracionPuntaje[]>('/gamificacion/config-puntajes');
    return response.data;
  },

  updateConfigPuntaje: async (
    id: number,
    data: { puntos: number; xp?: number; nombre?: string; descripcion?: string }
  ): Promise<ConfiguracionPuntaje> => {
    const response = await api.put<ConfiguracionPuntaje>(`/gamificacion/config-puntajes/${id}`, data);
    return response.data;
  },

  registrarEvento: async (data: RegistrarEventoRequest): Promise<RegistrarEventoResponse> => {
    const response = await api.post<RegistrarEventoResponse>('/gamificacion/registrar-evento', data);
    return response.data;
  },

  // CRUD Eventos Especiales
  crearEvento: async (data: CrearEventoRequest): Promise<EventoEspecialConfig> => {
    const response = await api.post<EventoEspecialConfig>('/gamificacion/eventos-especiales', data);
    return response.data;
  },

  actualizarEvento: async (id: number, data: ActualizarEventoRequest): Promise<EventoEspecialConfig> => {
    const response = await api.put<EventoEspecialConfig>(`/gamificacion/eventos-especiales/${id}`, data);
    return response.data;
  },

  eliminarEvento: async (id: number): Promise<EventoEspecialConfig> => {
    const response = await api.delete<EventoEspecialConfig>(`/gamificacion/eventos-especiales/${id}`);
    return response.data;
  },

  // CRUD Períodos de Ranking
  getPeriodos: async (incluirCerrados = true): Promise<PeriodoRanking[]> => {
    const response = await api.get<PeriodoRanking[]>('/gamificacion/periodos', {
      params: { incluirCerrados },
    });
    return response.data;
  },

  getPeriodoActivo: async (): Promise<PeriodoRanking | null> => {
    const response = await api.get('/gamificacion/periodos/activo');
    return response.data.id ? response.data : null;
  },

  getPeriodo: async (id: number): Promise<PeriodoRanking> => {
    const response = await api.get<PeriodoRanking>(`/gamificacion/periodos/${id}`);
    return response.data;
  },

  crearPeriodo: async (data: {
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin?: string;
  }): Promise<PeriodoRanking> => {
    const response = await api.post<PeriodoRanking>('/gamificacion/periodos', data);
    return response.data;
  },

  actualizarPeriodo: async (
    id: number,
    data: { nombre?: string; descripcion?: string; fechaFin?: string | null }
  ): Promise<PeriodoRanking> => {
    const response = await api.put<PeriodoRanking>(`/gamificacion/periodos/${id}`, data);
    return response.data;
  },

  cerrarPeriodo: async (id: number): Promise<{
    periodo: PeriodoRanking;
    mensaje: string;
    top3: RankingUsuario[];
  }> => {
    const response = await api.post(`/gamificacion/periodos/${id}/cerrar`);
    return response.data;
  },

  reactivarPeriodo: async (id: number): Promise<{
    periodo: PeriodoRanking;
    mensaje: string;
  }> => {
    const response = await api.post(`/gamificacion/periodos/${id}/reactivar`);
    return response.data;
  },

  pausarPeriodo: async (id: number): Promise<PeriodoRanking> => {
    const response = await api.post<PeriodoRanking>(`/gamificacion/periodos/${id}/pausar`);
    return response.data;
  },

  reanudarPeriodo: async (id: number): Promise<PeriodoRanking> => {
    const response = await api.post<PeriodoRanking>(`/gamificacion/periodos/${id}/reanudar`);
    return response.data;
  },

  eliminarPeriodo: async (id: number): Promise<{ mensaje: string }> => {
    const response = await api.delete(`/gamificacion/periodos/${id}`);
    return response.data;
  },

  // ==================== GRUPOS DE RANKING ====================

  // Obtener grupos visibles para el usuario actual
  getGruposRanking: async (): Promise<GrupoRanking[]> => {
    const response = await api.get<GrupoRanking[]>('/gamificacion/grupos-ranking');
    return response.data;
  },

  // [Admin] Obtener todos los grupos
  getAllGruposRanking: async (): Promise<GrupoRanking[]> => {
    const response = await api.get<GrupoRanking[]>('/gamificacion/grupos-ranking/admin/todos');
    return response.data;
  },

  // Obtener un grupo por ID con detalles
  getGrupoRanking: async (id: number): Promise<GrupoRankingDetalle> => {
    const response = await api.get<GrupoRankingDetalle>(`/gamificacion/grupos-ranking/${id}`);
    return response.data;
  },

  // Obtener ranking de un grupo
  getRankingGrupo: async (grupoId: number, periodoId?: number, limit?: number): Promise<RankingGrupoUsuario[]> => {
    const response = await api.get<RankingGrupoUsuario[]>(`/gamificacion/grupos-ranking/${grupoId}/ranking`, {
      params: { periodoId, limit },
    });
    return response.data;
  },

  // Rankings por nivel (todos los niveles con sus top 3)
  getRankingsPorNivel: async (periodoId?: number): Promise<RankingsPorNivelResponse> => {
    const response = await api.get<RankingsPorNivelResponse>('/gamificacion/ranking-por-nivel', {
      params: periodoId ? { periodoId } : undefined,
    });
    return response.data;
  },

  // Ranking de un nivel específico
  getRankingNivel: async (nivelId: number, periodoId?: number, limit?: number): Promise<RankingGrupoUsuario[]> => {
    const response = await api.get<RankingGrupoUsuario[]>(`/gamificacion/ranking-nivel/${nivelId}`, {
      params: { periodoId, limit },
    });
    return response.data;
  },

  // Mi posición en mi nivel actual
  getMiPosicionEnNivel: async (): Promise<PosicionEnNivel | null> => {
    const response = await api.get<PosicionEnNivel | null>('/gamificacion/mi-posicion-nivel');
    return response.data;
  },

  // Obtener miembros de un grupo (funciona para sistema y personalizados)
  getMiembrosGrupo: async (grupoId: number): Promise<{ id: number; nombre: string; fotoUrl: string | null; activo: boolean; roles: string[] }[]> => {
    const response = await api.get(`/gamificacion/grupos-ranking/${grupoId}/miembros`);
    return response.data;
  },

  // Crear grupo personalizado
  crearGrupoRanking: async (data: CrearGrupoRankingRequest): Promise<GrupoRanking> => {
    const response = await api.post<GrupoRanking>('/gamificacion/grupos-ranking', data);
    return response.data;
  },

  // Actualizar grupo
  actualizarGrupoRanking: async (id: number, data: ActualizarGrupoRankingRequest): Promise<GrupoRanking> => {
    const response = await api.put<GrupoRanking>(`/gamificacion/grupos-ranking/${id}`, data);
    return response.data;
  },

  // Eliminar grupo
  eliminarGrupoRanking: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/gamificacion/grupos-ranking/${id}`);
    return response.data;
  },

  // Convertir grupo sistema a personalizado
  convertirGrupoAPersonalizado: async (id: number): Promise<{ grupo: GrupoRanking; miembrosAgregados: number; mensaje: string }> => {
    const response = await api.post(`/gamificacion/grupos-ranking/${id}/convertir`);
    return response.data;
  },

  // Agregar miembros a un grupo
  agregarMiembrosGrupo: async (grupoId: number, usuariosIds: number[]): Promise<{ message: string }> => {
    const response = await api.post(`/gamificacion/grupos-ranking/${grupoId}/miembros`, { usuariosIds });
    return response.data;
  },

  // Quitar miembro de un grupo
  quitarMiembroGrupo: async (grupoId: number, usuarioId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/gamificacion/grupos-ranking/${grupoId}/miembros/${usuarioId}`);
    return response.data;
  },

  // Obtener mi visibilidad en rankings
  getMiVisibilidadRanking: async (): Promise<MiVisibilidadRanking> => {
    const response = await api.get<MiVisibilidadRanking>('/gamificacion/grupos-ranking/mi-visibilidad');
    return response.data;
  },

  // Obtener mis posiciones en todos los grupos
  getMisPosicionesRanking: async (): Promise<PosicionGrupo[]> => {
    const response = await api.get<PosicionGrupo[]>('/gamificacion/grupos-ranking/mis-posiciones');
    return response.data;
  },

  // Toggle visibilidad en ranking general
  toggleOcultoGeneral: async (oculto: boolean): Promise<{ ocultoEnGeneral: boolean }> => {
    const response = await api.put('/gamificacion/grupos-ranking/mi-visibilidad/general', { oculto });
    return response.data;
  },

  // Toggle visibilidad en un grupo específico
  toggleOcultoGrupo: async (grupoId: number, oculto: boolean): Promise<{ oculto: boolean }> => {
    const response = await api.put(`/gamificacion/grupos-ranking/mi-visibilidad/${grupoId}`, { oculto });
    return response.data;
  },

  // [Admin] Cambiar participación de un usuario en rankings
  setParticipaEnRanking: async (usuarioId: number, participa: boolean): Promise<{ participaEnRanking: boolean }> => {
    const response = await api.put(`/gamificacion/grupos-ranking/usuarios/${usuarioId}/participacion`, { participa });
    return response.data;
  },

  // === ADMIN: HISTORIAL DE PUNTOS ===

  // [Admin] Obtener historial de todos los usuarios
  getHistorialAdmin: async (params: {
    usuarioId?: number;
    periodoId?: number;
    categoria?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }): Promise<HistorialAdminResponse> => {
    const response = await api.get<HistorialAdminResponse>('/gamificacion/admin/historial', { params });
    return response.data;
  },

  // [Admin] Obtener una entrada del historial
  getHistorialEntry: async (id: number) => {
    const response = await api.get(`/gamificacion/admin/historial/${id}`);
    return response.data;
  },

  // [Admin] Actualizar una entrada del historial
  updateHistorialEntry: async (id: number, data: { puntos?: number; xp?: number; descripcion?: string }): Promise<{ mensaje: string }> => {
    const response = await api.put(`/gamificacion/admin/historial/${id}`, data);
    return response.data;
  },

  // [Admin] Eliminar una entrada del historial
  deleteHistorialEntry: async (id: number): Promise<{ mensaje: string }> => {
    const response = await api.delete(`/gamificacion/admin/historial/${id}`);
    return response.data;
  },

  // === ESTADÍSTICAS DASHBOARD ===

  // Estadísticas para mi dashboard personal
  getMiDashboard: async (): Promise<EstadisticasDashboard> => {
    const response = await api.get<EstadisticasDashboard>('/gamificacion/mi-dashboard');
    return response.data;
  },

  // Estadísticas globales del equipo (admin/lider)
  getDashboardEquipo: async (): Promise<EstadisticasDashboard> => {
    const response = await api.get<EstadisticasDashboard>('/gamificacion/dashboard-equipo');
    return response.data;
  },
};

export const inboxApi = {
  // Conversaciones
  getConversaciones: async (params?: {
    cursor?: string;
    limit?: number;
    modo?: ModoFiltro;
    misConversaciones?: string;
    search?: string;
  }): Promise<ConversacionesResponse> => {
    const response = await api.get<ConversacionesResponse>('/inbox/conversaciones', { params });
    return response.data;
  },

  getConversacion: async (id: number): Promise<Conversacion> => {
    const response = await api.get<Conversacion>(`/inbox/conversaciones/${id}`);
    return response.data;
  },

  // Mensajes
  getMensajes: async (
    conversacionId: number,
    params?: {
      cursor?: string;
      limit?: number;
      direccion?: 'antes' | 'despues';
    }
  ): Promise<MensajesResponse> => {
    const response = await api.get<MensajesResponse>(
      `/inbox/conversaciones/${conversacionId}/mensajes`,
      { params }
    );
    return response.data;
  },

  enviarMensaje: async (
    conversacionId: number,
    data: { contenido: string; tipo?: string }
  ): Promise<EnviarMensajeResponse> => {
    const response = await api.post<EnviarMensajeResponse>(
      `/inbox/conversaciones/${conversacionId}/mensajes`,
      data
    );
    return response.data;
  },

  // Handoff
  tomarConversacion: async (conversacionId: number): Promise<TomarConversacionResponse> => {
    const response = await api.post<TomarConversacionResponse>(
      `/inbox/conversaciones/${conversacionId}/tomar`
    );
    return response.data;
  },

  cerrarHandoff: async (
    conversacionId: number,
    data?: { mensajeDespedida?: string }
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `/inbox/conversaciones/${conversacionId}/cerrar`,
      data || {}
    );
    return response.data;
  },

  transferirConversacion: async (
    conversacionId: number,
    data: { adminId: number; mensajeContexto?: string }
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `/inbox/conversaciones/${conversacionId}/transferir`,
      data
    );
    return response.data;
  },

  marcarComoLeido: async (
    conversacionId: number,
    data?: { hastaMessageId?: string }
  ): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(
      `/inbox/conversaciones/${conversacionId}/leer`,
      data || {}
    );
    return response.data;
  },

  actualizarModoRespuesta: async (
    conversacionId: number,
    modoRespuesta: 'WEB' | 'WHATSAPP' | 'AMBOS' | null
  ): Promise<Conversacion> => {
    const response = await api.post<Conversacion>(
      `/inbox/conversaciones/${conversacionId}/modo-respuesta`,
      { modoRespuesta }
    );
    return response.data;
  },

  // Utilidades
  getAdminsDisponibles: async (): Promise<AdminDisponible[]> => {
    const response = await api.get<AdminDisponible[]>('/inbox/admins-disponibles');
    return response.data;
  },

  // Eliminación
  eliminarHistorialConversacion: async (
    conversacionId: number
  ): Promise<{ success: boolean; mensajesEliminados: number }> => {
    const response = await api.delete<{ success: boolean; mensajesEliminados: number }>(
      `/inbox/conversaciones/${conversacionId}/historial`
    );
    return response.data;
  },

  eliminarTodoElHistorial: async (): Promise<{
    success: boolean;
    mensajesEliminados: number;
    conversacionesEliminadas: number;
  }> => {
    const response = await api.delete<{
      success: boolean;
      mensajesEliminados: number;
      conversacionesEliminadas: number;
    }>('/inbox/historial-completo');
    return response.data;
  },
};

export default api;

