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
};

// ==================== PROGRAMAS API ====================

import type {
  Programa,
  Parte,
  CreateProgramaRequest,
  UpdateProgramaRequest,
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

  enviarNotificaciones: async (id: number): Promise<{
    enviados: number;
    errores: number;
    detalles: { nombre: string; telefono: string; success: boolean; error?: string }[];
  }> => {
    const response = await api.post(`/programas/${id}/enviar-notificaciones`);
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

  toggleQRActive: async (id: number): Promise<QRAsistencia> => {
    const response = await api.patch<QRAsistencia>(`/asistencia/qr/${id}/toggle`);
    return response.data;
  },

  updateQR: async (id: number, data: { semanaInicio?: string; horaInicio?: string; horaFin?: string; descripcion?: string }): Promise<QRAsistencia> => {
    const response = await api.patch<QRAsistencia>(`/asistencia/qr/${id}`, data);
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

export default api;

