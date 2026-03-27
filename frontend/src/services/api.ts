import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  Usuario,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  PaginatedResponse,
  Rol,
  PeriodoRanking,
  UsuariosInactivosResponse,
  ResumenInactividad,
  ResumenPerfilIncompleto,
  PosicionEnNivel,
  EstadisticasDashboard,
  PlantillaPrograma,
  ActividadCalendario,
  CalendarioMesResponse,
  CreateActividadRequest,
  UpdateActividadRequest,
  CreateProgramaBatchRequest,
  ProgramaVisita,
  QRAsistencia,
  MediaItem,
  TagMedia,
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

  forgotPassword: async (data: { codigoPais: string; telefono: string }) => {
    const response = await api.post<{ message: string }>('/auth/forgot-password', data);
    return response.data;
  },

  verifyResetCode: async (data: { codigoPais: string; telefono: string; code: string }) => {
    const response = await api.post<{ resetToken: string }>('/auth/verify-reset-code', data);
    return response.data;
  },

  resetPasswordWithToken: async (data: { resetToken: string; newPassword: string }) => {
    const response = await api.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
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
    tipoDocumento?: string;
    numeroDocumento?: string;
    tallaPolo?: string;
    esBautizado?: boolean;
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

  // Registro rápido (kiosk puerta - admin + lider)
  registroRapido: async (data: CreateUsuarioRequest): Promise<Usuario> => {
    const response = await api.post<Usuario>('/usuarios/registro-rapido', data);
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
    busqueda?: string;
  }): Promise<UsuariosInactivosResponse> => {
    const response = await api.get<UsuariosInactivosResponse>('/usuarios/inactivos', { params });
    return response.data;
  },

  getResumenInactividad: async (): Promise<ResumenInactividad> => {
    const response = await api.get<ResumenInactividad>('/usuarios/inactivos/resumen');
    return response.data;
  },

  getResumenPerfilIncompleto: async (): Promise<ResumenPerfilIncompleto> => {
    const response = await api.get<ResumenPerfilIncompleto>('/usuarios/perfil-incompleto/resumen');
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

  createBatch: async (data: CreateProgramaBatchRequest): Promise<Programa[]> => {
    const response = await api.post<Programa[]>('/programas/batch', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProgramaRequest): Promise<Programa> => {
    const response = await api.put<Programa>(`/programas/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/programas/${id}`);
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

  getUsuarios: async (search?: string): Promise<UsuarioSimple[]> => {
    const response = await api.get<UsuarioSimple[]>('/programas/usuarios', {
      params: search ? { search } : undefined,
    });
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

  getEstadisticasAdmin: async (): Promise<{
    programasEsteMes: number;
    programasPendientes: number;
    totalProgramas: number;
  }> => {
    const response = await api.get('/programas/estadisticas-admin');
    return response.data;
  },

  getProximoPrograma: async (): Promise<Programa[]> => {
    const response = await api.get<Programa[]>('/programas/proximo');
    return response.data;
  },

  // ==================== FOTOS ====================

  uploadFotoPrograma: async (file: File): Promise<{ url: string; mediaItemId: number }> => {
    const formData = new FormData();
    formData.append('foto', file);
    const response = await api.post<{ url: string; mediaItemId: number }>('/programas/fotos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // ==================== VISITAS ====================

  getProgramasHoyVisitas: async (): Promise<{
    id: number;
    titulo: string;
    fecha: string;
    visitas: ProgramaVisita[];
    qrAsistencia?: QRAsistencia | null;
  }[]> => {
    const response = await api.get('/programas/visitas/hoy');
    return response.data;
  },

  getVisitas: async (programaId: number): Promise<ProgramaVisita[]> => {
    const response = await api.get<ProgramaVisita[]>(`/programas/${programaId}/visitas`);
    return response.data;
  },

  createVisita: async (programaId: number, data: { nombre: string; procedencia: string; telefono?: string; direccion?: string }): Promise<ProgramaVisita> => {
    const response = await api.post<ProgramaVisita>(`/programas/${programaId}/visitas`, data);
    return response.data;
  },

  deleteVisita: async (visitaId: number): Promise<void> => {
    await api.delete(`/programas/visitas/${visitaId}`);
  },

  // ==================== PLANTILLAS ====================

  getPlantillas: async (): Promise<PlantillaPrograma[]> => {
    const response = await api.get<PlantillaPrograma[]>('/programas/plantillas');
    return response.data;
  },

  createPlantilla: async (data: {
    nombre: string;
    descripcion?: string;
    parteIds: number[];
    esDefault?: boolean;
    obsTheme?: object;
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
    obsTheme?: object;
  }): Promise<PlantillaPrograma> => {
    const response = await api.put<PlantillaPrograma>(`/programas/plantillas/${id}`, data);
    return response.data;
  },

  deletePlantilla: async (id: number): Promise<void> => {
    await api.delete(`/programas/plantillas/${id}`);
  },
};

// ==================== ESTUDIOS BÍBLICOS API ====================

import type {
  CursoBiblico,
  EstudianteBiblico,
  EstadisticasEstudiosBiblicos,
  Interesado,
  EstadisticasInteresados,
  InstructorSimple,
  EstadoInteresado,
} from '@/types';

export const estudiosBiblicosApi = {
  getCursos: async (): Promise<CursoBiblico[]> => {
    const response = await api.get<CursoBiblico[]>('/estudios-biblicos/cursos');
    return response.data;
  },

  getMisEstudiantes: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    cursoId?: number;
  }): Promise<PaginatedResponse<EstudianteBiblico>> => {
    const response = await api.get<PaginatedResponse<EstudianteBiblico>>(
      '/estudios-biblicos/mis-estudiantes',
      { params }
    );
    return response.data;
  },

  getEstudiante: async (id: number): Promise<EstudianteBiblico> => {
    const response = await api.get<EstudianteBiblico>(`/estudios-biblicos/estudiantes/${id}`);
    return response.data;
  },

  createEstudiante: async (data: {
    nombre: string;
    fechaNacimiento?: string;
    estadoCivil?: string;
    telefono?: string;
    direccion?: string;
    notas?: string;
    cursoId: number;
  }): Promise<EstudianteBiblico> => {
    const response = await api.post<EstudianteBiblico>('/estudios-biblicos/estudiantes', data);
    return response.data;
  },

  updateEstudiante: async (id: number, data: {
    nombre?: string;
    fechaNacimiento?: string;
    estadoCivil?: string;
    telefono?: string;
    direccion?: string;
    notas?: string;
    cursoId?: number;
    fechaBautismo?: string;
  }): Promise<EstudianteBiblico> => {
    const response = await api.put<EstudianteBiblico>(`/estudios-biblicos/estudiantes/${id}`, data);
    return response.data;
  },

  deleteEstudiante: async (id: number): Promise<void> => {
    await api.delete(`/estudios-biblicos/estudiantes/${id}`);
  },

  toggleLeccion: async (estudianteId: number, leccion: number): Promise<{
    leccion: number;
    completada: boolean;
    fechaCompletada?: string;
    message: string;
    gamificacion?: {
      puntosAsignados: number;
      xpAsignado: number;
      nuevoNivel: boolean;
      nivelActual: { numero: number; nombre: string };
      insigniasDesbloqueadas: Array<{ codigo: string; nombre: string; icono: string }>;
      rachaActual: number;
    };
  }> => {
    const response = await api.post(`/estudios-biblicos/estudiantes/${estudianteId}/lecciones/${leccion}/toggle`);
    return response.data;
  },

  getEstadisticas: async (): Promise<EstadisticasEstudiosBiblicos> => {
    const response = await api.get<EstadisticasEstudiosBiblicos>('/estudios-biblicos/estadisticas');
    return response.data;
  },

  getEstadisticasGlobal: async (): Promise<EstadisticasEstudiosBiblicos> => {
    const response = await api.get<EstadisticasEstudiosBiblicos>('/estudios-biblicos/estadisticas-global');
    return response.data;
  },

  // ==================== INTERESADOS ====================

  getInteresados: async (params?: {
    page?: number;
    limit?: number;
    estado?: EstadoInteresado;
    instructorId?: number;
    sinAsignar?: boolean;
    search?: string;
  }): Promise<PaginatedResponse<Interesado>> => {
    const response = await api.get<PaginatedResponse<Interesado>>(
      '/estudios-biblicos/interesados',
      { params }
    );
    return response.data;
  },

  createInteresado: async (data: {
    nombre: string;
    edad: number;
    telefono?: string;
    direccion?: string;
    notas?: string;
  }): Promise<Interesado> => {
    const response = await api.post<Interesado>('/estudios-biblicos/interesados', data);
    return response.data;
  },

  updateInteresado: async (id: number, data: {
    nombre?: string;
    edad?: number;
    telefono?: string;
    direccion?: string;
    notas?: string;
  }): Promise<Interesado> => {
    const response = await api.put<Interesado>(`/estudios-biblicos/interesados/${id}`, data);
    return response.data;
  },

  deleteInteresado: async (id: number): Promise<void> => {
    await api.delete(`/estudios-biblicos/interesados/${id}`);
  },

  asignarInteresado: async (id: number, instructorId: number): Promise<Interesado> => {
    const response = await api.post<Interesado>(`/estudios-biblicos/interesados/${id}/asignar`, { instructorId });
    return response.data;
  },

  asignarMasivo: async (ids: number[], instructorId: number): Promise<{ actualizados: number }> => {
    const response = await api.post<{ actualizados: number }>('/estudios-biblicos/interesados/asignar-masivo', { ids, instructorId });
    return response.data;
  },

  getMisInteresados: async (): Promise<Interesado[]> => {
    const response = await api.get<Interesado[]>('/estudios-biblicos/mis-interesados');
    return response.data;
  },

  updateEstadoInteresado: async (id: number, estado: EstadoInteresado): Promise<Interesado> => {
    const response = await api.put<Interesado>(`/estudios-biblicos/interesados/${id}/estado`, { estado });
    return response.data;
  },

  convertirInteresado: async (id: number, cursoId: number): Promise<{ interesado: Interesado; estudiante: EstudianteBiblico }> => {
    const response = await api.post<{ interesado: Interesado; estudiante: EstudianteBiblico }>(`/estudios-biblicos/interesados/${id}/convertir`, { cursoId });
    return response.data;
  },

  getEstadisticasInteresados: async (): Promise<EstadisticasInteresados> => {
    const response = await api.get<EstadisticasInteresados>('/estudios-biblicos/interesados/estadisticas');
    return response.data;
  },

  getInstructores: async (): Promise<InstructorSimple[]> => {
    const response = await api.get<InstructorSimple[]>('/estudios-biblicos/interesados/instructores');
    return response.data;
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

};

// ==================== ASISTENCIA API ====================

import type {
  Asistencia,
  CreateQRRequest,
  RegistrarAsistenciaRequest,
  ConfirmarAsistenciaRequest,
  EstadisticasGenerales,
  EstadisticasMesPorSemana,
  MiAsistencia,
  AsistenciaUsuarioResponse,
  RegistroMasivoResponse,
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

  updateQR: async (id: number, data: { semanaInicio?: string; horaInicio?: string; horaFin?: string; margenTemprana?: number; margenTardia?: number; descripcion?: string; programaId?: number | null }): Promise<QRAsistencia> => {
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
    tipoAsistenciaManual?: 'temprana' | 'normal' | 'tardia';
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

  registrarManualMasivo: async (data: {
    codigoQR: string;
    usuarioIds: number[];
    datosFormulario?: Record<string, unknown>;
    tipoAsistenciaManual?: 'temprana' | 'normal' | 'tardia';
  }): Promise<RegistroMasivoResponse> => {
    const response = await api.post<RegistroMasivoResponse>('/asistencia/registrar-manual-masivo', data);
    return response.data;
  },

  registrarHistoricaMasivo: async (data: {
    codigoQR: string;
    usuarioIds: number[];
    tipoAsistenciaManual: 'temprana' | 'normal' | 'tardia';
    datosFormulario?: Record<string, unknown>;
  }): Promise<RegistroMasivoResponse> => {
    const response = await api.post<RegistroMasivoResponse>('/asistencia/registrar-historica-masivo', data);
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

  getEstadisticasMesPorSemana: async (mes: string): Promise<EstadisticasMesPorSemana> => {
    const response = await api.get<EstadisticasMesPorSemana>('/asistencia/estadisticas/mes', { params: { mes } });
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

  // [Admin] Asistencia y heatmap de un usuario
  getAsistenciaUsuario: async (usuarioId: number): Promise<AsistenciaUsuarioResponse> => {
    const response = await api.get<AsistenciaUsuarioResponse>(`/asistencia/admin/asistencia-usuario/${usuarioId}`);
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
  PosicionGrupo,
  HistorialPuntosResponse,
  ResumenPeriodo,
  CrearNivelRequest,
  ActualizarNivelRequest,
  HistorialAdminResponse,
  ComparacionResponse,
  PerfilParticipante,
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

  getNiveles: async (incluirInactivos = false): Promise<NivelBiblico[]> => {
    const response = await api.get<NivelBiblico[]>('/gamificacion/niveles', {
      params: { incluirInactivos },
    });
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

  getEventosEspeciales: async (incluirInactivos = false): Promise<EventoEspecialConfig[]> => {
    const params = incluirInactivos ? { incluirInactivos: 'true' } : {};
    const response = await api.get<EventoEspecialConfig[]>('/gamificacion/eventos-especiales', { params });
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

  // Obtener ranking de un grupo con paginación
  getRankingGrupo: async (grupoId: number, params?: { periodoId?: number; page?: number; limit?: number }): Promise<PaginatedResponse<RankingGrupoUsuario>> => {
    const response = await api.get<PaginatedResponse<RankingGrupoUsuario>>(`/gamificacion/grupos-ranking/${grupoId}/ranking`, {
      params,
    });
    return response.data;
  },

  // Ranking de un nivel específico con paginación
  getRankingNivel: async (nivelId: number, params?: { periodoId?: number; page?: number; limit?: number }): Promise<PaginatedResponse<RankingGrupoUsuario>> => {
    const response = await api.get<PaginatedResponse<RankingGrupoUsuario>>(`/gamificacion/ranking-nivel/${nivelId}`, {
      params,
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

  // Obtener mis posiciones en todos los grupos
  getMisPosicionesRanking: async (): Promise<PosicionGrupo[]> => {
    const response = await api.get<PosicionGrupo[]>('/gamificacion/grupos-ranking/mis-posiciones');
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

  // Comparar participantes (radar + desglose)
  compararParticipantes: async (usuarioIds: number[]): Promise<ComparacionResponse> => {
    const response = await api.get<ComparacionResponse>('/gamificacion/comparar', {
      params: { usuarioIds: usuarioIds.join(',') },
    });
    return response.data;
  },

  // [Admin] Perfil completo de un participante
  getPerfilParticipante: async (usuarioId: number, params?: { historialPage?: number; historialPeriodoId?: number }): Promise<PerfilParticipante> => {
    const response = await api.get<PerfilParticipante>(`/gamificacion/admin/perfil-participante/${usuarioId}`, { params });
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

// ==================== CALENDARIO ====================

export const calendarioApi = {
  // Obtener calendario del mes
  getCalendarioMes: async (mes: number, anio: number): Promise<CalendarioMesResponse> => {
    const response = await api.get<CalendarioMesResponse>(`/calendario/${mes}/${anio}`);
    return response.data;
  },

  createActividad: async (data: CreateActividadRequest): Promise<ActividadCalendario> => {
    const response = await api.post<ActividadCalendario>('/calendario/actividades', data);
    return response.data;
  },

  updateActividad: async (
    id: number,
    data: UpdateActividadRequest
  ): Promise<ActividadCalendario> => {
    const response = await api.put<ActividadCalendario>(`/calendario/actividades/${id}`, data);
    return response.data;
  },

  deleteActividad: async (
    id: number
  ): Promise<{ message: string; instanciasEliminadas?: number }> => {
    const response = await api.delete<{ message: string; instanciasEliminadas?: number }>(
      `/calendario/actividades/${id}`
    );
    return response.data;
  },

  deleteSerieRecurrente: async (
    id: number
  ): Promise<{ message: string; actividadesEliminadas: number }> => {
    const response = await api.delete<{ message: string; actividadesEliminadas: number }>(
      `/calendario/actividades/${id}/serie`
    );
    return response.data;
  },
};

// ==================== BIBLIOTECA DE MEDIOS ====================

export const mediaApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tag?: TagMedia;
  }): Promise<PaginatedResponse<MediaItem>> => {
    const response = await api.get<PaginatedResponse<MediaItem>>('/media', { params });
    return response.data;
  },

  upload: async (
    file: File,
    nombre?: string,
    tag?: TagMedia,
    onUploadProgress?: (progress: number) => void,
  ): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (nombre) formData.append('nombre', nombre);
    if (tag) formData.append('tag', tag);
    const response = await api.post<MediaItem>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => onUploadProgress(e.total ? Math.round((e.loaded * 100) / e.total) : 0)
        : undefined,
    });
    return response.data;
  },

  downloadYouTube: async (
    url: string,
    nombre?: string,
    linkId?: number,
  ): Promise<MediaItem> => {
    const response = await api.post<MediaItem>(
      '/media/download-youtube',
      { url, nombre, linkId },
      { timeout: 300000 },
    );
    return response.data;
  },

  update: async (id: number, data: { nombre?: string; tag?: TagMedia }): Promise<MediaItem> => {
    const response = await api.patch<MediaItem>(`/media/${id}`, data);
    return response.data;
  },

  findByYoutubeUrl: async (url: string): Promise<MediaItem | null> => {
    const response = await api.get<MediaItem | null>('/media/find-by-youtube', { params: { url } });
    return response.data;
  },

  downloadYouTubeBatch: async (
    items: { url: string; nombre?: string; linkId?: number }[],
  ): Promise<{ url: string; mediaItem?: MediaItem; skipped?: boolean; error?: string }[]> => {
    const response = await api.post('/media/download-youtube-batch', { items }, { timeout: 600000 });
    return response.data;
  },

  replace: async (id: number, file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<MediaItem>(`/media/${id}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/media/${id}`);
  },

  deleteBatch: async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await api.delete<{ deleted: number }>('/media/batch', { data: { ids } });
    return response.data;
  },
};

// ==================== ROLES DE SERVICIO ====================

import type {
  TipoRolServicio,
  MiembroRolServicio,
  TurnoRolServicio,
  CreateTipoRolRequest,
  UpdateTipoRolRequest,
  GenerarTurnosRequest,
  UpdateTurnoRequest,
} from '@/types';

export const rolesServicioApi = {
  // Tipos
  getTipos: async (): Promise<TipoRolServicio[]> => {
    const response = await api.get<TipoRolServicio[]>('/roles-servicio/tipos');
    return response.data;
  },

  createTipo: async (data: CreateTipoRolRequest): Promise<TipoRolServicio> => {
    const response = await api.post<TipoRolServicio>('/roles-servicio/tipos', data);
    return response.data;
  },

  updateTipo: async (id: number, data: UpdateTipoRolRequest): Promise<TipoRolServicio> => {
    const response = await api.put<TipoRolServicio>(`/roles-servicio/tipos/${id}`, data);
    return response.data;
  },

  deleteTipo: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/roles-servicio/tipos/${id}`);
    return response.data;
  },

  // Miembros
  getMiembros: async (tipoRolId: number): Promise<MiembroRolServicio[]> => {
    const response = await api.get<MiembroRolServicio[]>(`/roles-servicio/tipos/${tipoRolId}/miembros`);
    return response.data;
  },

  agregarMiembros: async (tipoRolId: number, miembros: { usuarioId?: number; nombreLibre?: string }[]): Promise<MiembroRolServicio[]> => {
    const response = await api.post<MiembroRolServicio[]>(`/roles-servicio/tipos/${tipoRolId}/miembros`, { miembros });
    return response.data;
  },

  removeMiembro: async (miembroId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/roles-servicio/miembros/${miembroId}`);
    return response.data;
  },

  reorderMiembros: async (tipoRolId: number, orden: number[]): Promise<MiembroRolServicio[]> => {
    const response = await api.post<MiembroRolServicio[]>(`/roles-servicio/tipos/${tipoRolId}/miembros/reorder`, { orden });
    return response.data;
  },

  // Turnos
  getTurnos: async (tipoRolId: number, params?: { desde?: string; hasta?: string }): Promise<TurnoRolServicio[]> => {
    const response = await api.get<TurnoRolServicio[]>(`/roles-servicio/tipos/${tipoRolId}/turnos`, { params });
    return response.data;
  },

  createTurno: async (tipoRolId: number, data: { semana: string; miembroIds: number[]; notas?: string }): Promise<TurnoRolServicio> => {
    const response = await api.post<TurnoRolServicio>(`/roles-servicio/tipos/${tipoRolId}/turnos`, data);
    return response.data;
  },

  generarRotacion: async (tipoRolId: number, data: GenerarTurnosRequest): Promise<{ turnosCreados: number; turnos: TurnoRolServicio[] }> => {
    const response = await api.post(`/roles-servicio/tipos/${tipoRolId}/generar`, data);
    return response.data;
  },

  updateTurno: async (turnoId: number, data: UpdateTurnoRequest): Promise<TurnoRolServicio> => {
    const response = await api.put<TurnoRolServicio>(`/roles-servicio/turnos/${turnoId}`, data);
    return response.data;
  },

  completarTurno: async (turnoId: number): Promise<{ message: string; puntosAsignados: number }> => {
    const response = await api.put(`/roles-servicio/turnos/${turnoId}/completar`);
    return response.data;
  },

  eliminarTurno: async (turnoId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/roles-servicio/turnos/${turnoId}`);
    return response.data;
  },

  notificarTurno: async (turnoId: number): Promise<{ totalNotificados: number; totalErrores: number; resultados: any[] }> => {
    const response = await api.post(`/roles-servicio/turnos/${turnoId}/notificar`);
    return response.data;
  },
};

export default api;

