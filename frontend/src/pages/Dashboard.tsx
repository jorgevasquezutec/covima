import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  CalendarDays,
  BarChart3,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Cake,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { programasApi, asistenciaApi, usuariosApi } from '@/services/api';
import type { EstadisticasGenerales, MiAsistencia } from '@/types';
import RegistrarMiAsistencia from '@/components/asistencia/RegistrarMiAsistencia';

interface ProximaAsignacion {
  id: number;
  fecha: string;
  titulo: string;
  estado: string;
  partes: { id: number; nombre: string }[];
}

interface AdminStats {
  programasEsteMes: number;
  programasPendientes: number;
  totalProgramas: number;
}

interface CumpleanosMes {
  mes: number;
  mesNombre: string;
  anio: number;
  cumpleaneros: { id: number; nombre: string; dia: number; mes: number }[];
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Admin stats
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<EstadisticasGenerales | null>(null);
  const [cumpleanosMes, setCumpleanosMes] = useState<CumpleanosMes | null>(null);
  const [loadingCumpleanos, setLoadingCumpleanos] = useState(false);

  // Calendar navigation state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Personal stats
  const [misAsignaciones, setMisAsignaciones] = useState<ProximaAsignacion[]>([]);
  const [miAsistencia, setMiAsistencia] = useState<MiAsistencia | null>(null);

  const isAdminOrLider = user?.roles?.some(r => ['admin', 'lider'].includes(r));

  // Load cumpleanos for selected month
  const loadCumpleanos = async (mes: number, anio: number) => {
    if (!isAdminOrLider) return;
    setLoadingCumpleanos(true);
    try {
      const data = await usuariosApi.getCumpleanosDelMes({ mes, anio });
      setCumpleanosMes(data);
    } catch (error) {
      console.error('Error loading cumpleanos:', error);
    } finally {
      setLoadingCumpleanos(false);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    let newMonth = selectedMonth - 1;
    let newYear = selectedYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    loadCumpleanos(newMonth, newYear);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    let newMonth = selectedMonth + 1;
    let newYear = selectedYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    loadCumpleanos(newMonth, newYear);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [
          asistenciaApi.getMiAsistencia().catch(() => null),
          programasApi.getMisAsignaciones().catch(() => []),
        ];

        // Solo cargar stats de admin si tiene permisos
        if (isAdminOrLider) {
          promises.push(
            programasApi.getEstadisticasAdmin().catch(() => null),
            asistenciaApi.getEstadisticasGenerales().catch(() => null),
            usuariosApi.getCumpleanosDelMes().catch(() => null),
          );
        }

        const results = await Promise.all(promises);
        setMiAsistencia(results[0]);
        setMisAsignaciones(results[1] || []);

        if (isAdminOrLider) {
          setAdminStats(results[2]);
          setEstadisticasGenerales(results[3]);
          setCumpleanosMes(results[4]);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdminOrLider]);

  const formatDate = (date: string) => {
    // Parsear fecha evitando problemas de timezone
    // Extraer YYYY-MM-DD y crear fecha en zona local
    const [datePart] = date.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    return localDate.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Bienvenido, {user?.nombre}</p>
      </div>

      {/* Password Change Alert */}
      {user?.debeCambiarPassword && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700">Cambio de contraseña requerido</p>
              <p className="text-sm text-amber-600">
                Por seguridad, debes cambiar tu contraseña inicial.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== ADMIN/LIDER DASHBOARD ==================== */}
      {isAdminOrLider && (
        <>
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Estadísticas del Equipo
            </h2>
            <p className="text-sm text-gray-500">Visión general del grupo</p>
          </div>

          {/* Admin Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Programas este mes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {adminStats?.programasEsteMes ?? 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Asistencia este mes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {estadisticasGenerales?.promedioAsistencia ?? 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Usuarios activos</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {estadisticasGenerales?.totalUsuarios ?? 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Programas pendientes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {adminStats?.programasPendientes ?? 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cumpleaños del Mes - Siempre visible con navegación */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-500" />
                  Cumpleaños
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    disabled={loadingCumpleanos}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center capitalize">
                    {cumpleanosMes?.mesNombre || new Date(selectedYear, selectedMonth - 1).toLocaleDateString('es-PE', { month: 'long' })} {selectedYear}
                  </span>
                  <button
                    type="button"
                    onClick={goToNextMonth}
                    disabled={loadingCumpleanos}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCumpleanos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                      <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const year = selectedYear;
                      const month = selectedMonth - 1;
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const today = new Date();
                      const currentDay = today.getMonth() === month && today.getFullYear() === year ? today.getDate() : null;

                      const birthdayDays = new Set(cumpleanosMes?.cumpleaneros.map(c => c.dia) || []);

                      const cells = [];
                      // Empty cells for days before first day of month
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} className="h-7" />);
                      }
                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const isBirthday = birthdayDays.has(day);
                        const isToday = day === currentDay;
                        cells.push(
                          <div
                            key={day}
                            className={`h-7 flex items-center justify-center text-xs rounded-full relative
                              ${isToday ? 'bg-blue-500 text-white font-bold' : ''}
                              ${isBirthday && !isToday ? 'bg-pink-100 text-pink-700 font-semibold' : ''}
                              ${!isBirthday && !isToday ? 'text-gray-600' : ''}
                            `}
                            title={isBirthday ? cumpleanosMes?.cumpleaneros.filter(c => c.dia === day).map(c => c.nombre).join(', ') : undefined}
                          >
                            {day}
                            {isBirthday && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full" />
                            )}
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>

                  {/* Lista de cumpleañeros */}
                  {cumpleanosMes && cumpleanosMes.cumpleaneros.length > 0 ? (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      {cumpleanosMes.cumpleaneros.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Cake className="w-3.5 h-3.5 text-pink-400" />
                            <span className="text-gray-700">{c.nombre}</span>
                          </div>
                          <span className="text-gray-500 text-xs">{c.dia} de {cumpleanosMes.mesNombre}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-gray-100 pt-3 text-center">
                      <p className="text-sm text-gray-400">No hay cumpleaños este mes</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Attendance Trend by Month */}
          {estadisticasGenerales?.meses && estadisticasGenerales.meses.length > 0 && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-gray-900">
                  Tendencia de Asistencia por Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const maxConfirmados = Math.max(...estadisticasGenerales.meses.map(m => m.confirmados), 1);
                  const barMaxHeight = 100; // pixels
                  return (
                    <div className="space-y-4">
                      <div className="flex items-end gap-4">
                        {estadisticasGenerales.meses.map((mes, index) => {
                          const totalHeightPx = mes.confirmados > 0
                            ? Math.max(20, (mes.confirmados / maxConfirmados) * barMaxHeight)
                            : 6;
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <span className="text-sm font-bold text-gray-800 mb-1">{mes.confirmados}</span>
                              {mes.confirmados > 0 && mes.porTipo ? (
                                <div
                                  className="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
                                  style={{ height: `${totalHeightPx}px` }}
                                >
                                  {mes.porTipo
                                    .filter(t => t.cantidad > 0)
                                    .map((tipo) => {
                                      const segmentHeight = (tipo.cantidad / mes.confirmados) * 100;
                                      return (
                                        <div
                                          key={tipo.tipoId}
                                          style={{
                                            backgroundColor: tipo.color,
                                            height: `${segmentHeight}%`,
                                          }}
                                          title={`${tipo.label}: ${tipo.cantidad}`}
                                        />
                                      );
                                    })}
                                </div>
                              ) : (
                                <div
                                  className="w-full rounded-t-md bg-gray-200"
                                  style={{ height: `${totalHeightPx}px` }}
                                />
                              )}
                              <span className="text-xs text-gray-600 font-medium capitalize mt-2">
                                {mes.mesNombre}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Legend */}
                      {estadisticasGenerales.tipos && estadisticasGenerales.tipos.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                          {estadisticasGenerales.tipos.map((tipo) => (
                            <div key={tipo.id} className="flex items-center gap-1.5">
                              <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: tipo.color || '#6366f1' }}
                              />
                              <span className="text-xs text-gray-600">{tipo.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

        </>
      )}

      {/* ==================== PERSONAL DASHBOARD ==================== */}
      <div className="border-b border-gray-200 pb-2 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Mi Dashboard Personal
        </h2>
        <p className="text-sm text-gray-500">Tu actividad{!isAdminOrLider ? ' y próximas participaciones' : ''}</p>
      </div>

      {/* Registrar Mi Asistencia */}
      <RegistrarMiAsistencia compact onSuccess={() => {
        // Recargar mi asistencia al registrar
        asistenciaApi.getMiAsistencia().then(setMiAsistencia).catch(() => null);
      }} />

      <div className={`grid grid-cols-1 ${!isAdminOrLider ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Próximas Asignaciones - Solo para participantes */}
        {(
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                Mis Próximas Participaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {misAsignaciones.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No tienes participaciones programadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {misAsignaciones.slice(0, 4).map((asig) => (
                    <div
                      key={asig.id}
                      className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {formatDate(asig.fecha)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            asig.estado === 'enviado'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : asig.estado === 'completo'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                          }
                        >
                          {asig.estado}
                        </Badge>
                      </div>
                      {asig.titulo && (
                        <p className="text-sm text-gray-700 mb-2">{asig.titulo}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {asig.partes.map((parte) => (
                          <Badge
                            key={parte.id}
                            variant="secondary"
                            className="text-xs bg-white text-indigo-700 border border-indigo-200"
                          >
                            {parte.nombre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mi Asistencia */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-green-600" />
              Mi Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">{miAsistencia?.totalAsistencias ?? 0}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total de asistencias</p>
                <p className="text-xs text-gray-500">Historial reciente</p>
              </div>
            </div>

            {/* Historial reciente */}
            {miAsistencia?.historial && miAsistencia.historial.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historial reciente</p>
                {miAsistencia.historial.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {new Date(item.fecha).toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    {item.tipo && (
                      <Badge variant="outline" className="text-xs">
                        {item.tipo.label}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Sin historial de asistencia</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
