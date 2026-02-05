import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
  Trophy,
  Star,
  Flame,
  ArrowRight,
  ArrowLeft,
  Activity,
  Mic,
  AlertTriangle,
  UserSearch,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { programasApi, asistenciaApi, usuariosApi, gamificacionApi, estudiosBiblicosApi } from '@/services/api';
import { CalendarioMes } from '@/components/calendario';
import type { EstadisticasGenerales, EstadisticasMesPorSemana, MiAsistencia, MiProgreso, PeriodoRanking, PosicionGrupo, EstadisticasDashboard, PosicionEnNivel, ResumenInactividad, ResumenPerfilIncompleto, Programa, EstadisticasEstudiosBiblicos } from '@/types';
import RegistrarMiAsistencia from '@/components/asistencia/RegistrarMiAsistencia';
import { parseLocalDate } from '@/lib/utils';

interface AdminStats {
  programasEsteMes: number;
  programasPendientes: number;
  totalProgramas: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Admin stats
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<EstadisticasGenerales | null>(null);
  // Calendar navigation state
  const now = new Date();
  const [selectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear] = useState(now.getFullYear());

  // Personal stats
  const [proximoPrograma, setProximoPrograma] = useState<Programa | null>(null);
  const [miAsistencia, setMiAsistencia] = useState<MiAsistencia | null>(null);

  // Estudios bíblicos
  const [estudiosBiblicosStats, setEstudiosBiblicosStats] = useState<EstadisticasEstudiosBiblicos | null>(null);

  // Gamificación
  const [miProgreso, setMiProgreso] = useState<MiProgreso | null>(null);
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoRanking | null>(null);
  const [misPosiciones, setMisPosiciones] = useState<PosicionGrupo[]>([]);
  const [miPosicionNivel, setMiPosicionNivel] = useState<PosicionEnNivel | null>(null);

  // Dashboard charts
  const [dashboardEquipo, setDashboardEquipo] = useState<EstadisticasDashboard | null>(null);
  const [miDashboard, setMiDashboard] = useState<EstadisticasDashboard | null>(null);

  // Seguimiento de inactividad
  const [resumenInactividad, setResumenInactividad] = useState<ResumenInactividad | null>(null);

  // Perfil incompleto
  const [resumenPerfil, setResumenPerfil] = useState<ResumenPerfilIncompleto | null>(null);

  // Drill-down de tendencia de asistencia
  const [drilldownMes, setDrilldownMes] = useState<string | null>(null); // "YYYY-MM" or null
  const [drilldownData, setDrilldownData] = useState<EstadisticasMesPorSemana | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const isAdminOrLider = user?.roles?.some(r => ['admin', 'lider'].includes(r));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [
          asistenciaApi.getMiAsistencia().catch(() => null),
          programasApi.getProximoPrograma().catch(() => null),
          gamificacionApi.getMiProgreso().catch(() => null),
          gamificacionApi.getPeriodoActivo().catch(() => null),
          gamificacionApi.getMisPosicionesRanking().catch(() => []),
          gamificacionApi.getMiDashboard().catch(() => null),
          gamificacionApi.getMiPosicionEnNivel().catch(() => null),
        ];

        // Solo cargar stats de admin si tiene permisos
        if (isAdminOrLider) {
          promises.push(
            programasApi.getEstadisticasAdmin().catch(() => null),
            asistenciaApi.getEstadisticasGenerales().catch(() => null),
            gamificacionApi.getDashboardEquipo().catch(() => null),
            usuariosApi.getResumenInactividad().catch(() => null),
            usuariosApi.getResumenPerfilIncompleto().catch(() => null),
            estudiosBiblicosApi.getEstadisticasGlobal().catch(() => null),
          );
        }

        const results = await Promise.all(promises);
        setMiAsistencia(results[0]);
        setProximoPrograma(results[1]);
        setMiProgreso(results[2]);
        setPeriodoActivo(results[3]);
        setMisPosiciones(results[4] || []);
        setMiDashboard(results[5]);
        setMiPosicionNivel(results[6]);

        if (isAdminOrLider) {
          setAdminStats(results[7]);
          setEstadisticasGenerales(results[8]);
          setDashboardEquipo(results[9]);
          setResumenInactividad(results[10]);
          setResumenPerfil(results[11]);
          setEstudiosBiblicosStats(results[12]);
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

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleDrilldownMes = async (mesIso: string) => {
    // Extraer YYYY-MM del ISO string
    const date = new Date(mesIso);
    const mes = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setDrilldownMes(mes);
    setDrilldownLoading(true);
    try {
      const data = await asistenciaApi.getEstadisticasMesPorSemana(mes);
      setDrilldownData(data);
    } catch {
      setDrilldownMes(null);
    } finally {
      setDrilldownLoading(false);
    }
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
                    <p className="text-sm text-gray-500">Miembros JA / Total</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {estadisticasGenerales?.totalJA ?? 0}
                      <span className="text-base font-normal text-gray-400"> / {estadisticasGenerales?.totalUsuarios ?? 0}</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to="/mis-estudiantes">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Estudios bíblicos en curso</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {estudiosBiblicosStats?.enProgreso ?? 0}
                        <span className="text-base font-normal text-gray-400"> / {estudiosBiblicosStats?.totalEstudiantes ?? 0}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Widget de Seguimiento de Inactividad */}
          {resumenInactividad && (resumenInactividad.criticos > 0 || resumenInactividad.enRiesgo > 0) && (
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UserSearch className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                        <span className="whitespace-nowrap">Seguimiento</span>
                        {resumenInactividad.criticos > 0 && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {resumenInactividad.criticos} críticos
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {resumenInactividad.criticos + resumenInactividad.enRiesgo} miembros necesitan atención
                        {resumenInactividad.enRiesgo > 0 && (
                          <span className="text-yellow-600 ml-1">({resumenInactividad.enRiesgo} en riesgo)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link to="/seguimiento" className="flex-shrink-0">
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100 w-full sm:w-auto">
                      Ver detalles
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Widget de Perfil Incompleto */}
          {resumenPerfil && resumenPerfil.totalIncompletos > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                        <span className="whitespace-nowrap">Datos incompletos</span>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          {resumenPerfil.totalIncompletos} de {resumenPerfil.totalJA}
                        </Badge>
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {resumenPerfil.totalIncompletos} miembros tienen información pendiente por completar
                      </p>
                    </div>
                  </div>
                  <Link to="/usuarios?perfilIncompleto=true" className="flex-shrink-0">
                    <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto">
                      Completar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendario de Actividades */}
          <CalendarioMes
            initialMonth={selectedMonth}
            initialYear={selectedYear}
            showExportButton={true}
          />

          {/* Attendance Trend — Month / Week drill-down */}
          {estadisticasGenerales?.meses && estadisticasGenerales.meses.length > 0 && (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                  {drilldownMes ? (
                    <>
                      <button
                        onClick={() => { setDrilldownMes(null); setDrilldownData(null); }}
                        className="p-1 -ml-1 rounded-md hover:bg-gray-100 transition-colors"
                        title="Volver a meses"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <span className="capitalize">{drilldownData?.mesNombre || '...'}</span>
                      <span className="text-gray-400 font-normal">— por Semana</span>
                    </>
                  ) : (
                    'Tendencia de Asistencia por Mes'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {drilldownLoading ? (
                  <div className="flex items-center justify-center h-28">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : drilldownMes && drilldownData ? (
                  /* === VISTA SEMANAL === */
                  (() => {
                    const maxSem = Math.max(...drilldownData.semanas.map(s => s.confirmados), 1);
                    const barMaxHeight = 100;
                    return (
                      <div className="space-y-4">
                        <div className="flex items-end gap-4">
                          {drilldownData.semanas.map((sem) => {
                            const heightPx = sem.confirmados > 0
                              ? Math.max(20, (sem.confirmados / maxSem) * barMaxHeight)
                              : 6;
                            return (
                              <div key={sem.semanaNum} className="flex-1 flex flex-col items-center">
                                <span className="text-sm font-bold text-gray-800 mb-1">{sem.confirmados}</span>
                                {sem.confirmados > 0 && sem.porTipo ? (
                                  <div
                                    className="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
                                    style={{ height: `${heightPx}px` }}
                                  >
                                    {sem.porTipo
                                      .filter(t => t.cantidad > 0)
                                      .map((tipo) => (
                                        <div
                                          key={tipo.tipoId}
                                          style={{
                                            backgroundColor: tipo.color,
                                            height: `${(tipo.cantidad / sem.confirmados) * 100}%`,
                                          }}
                                          title={`${tipo.label}: ${tipo.cantidad}`}
                                        />
                                      ))}
                                  </div>
                                ) : (
                                  <div
                                    className="w-full rounded-t-md bg-gray-200"
                                    style={{ height: `${heightPx}px` }}
                                  />
                                )}
                                <span className="text-xs text-gray-600 font-medium mt-2">
                                  {sem.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        {drilldownData.tipos && drilldownData.tipos.length > 0 && (
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                            {drilldownData.tipos.map((tipo) => (
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
                  })()
                ) : (
                  /* === VISTA MENSUAL === */
                  (() => {
                    const maxConfirmados = Math.max(...estadisticasGenerales.meses.map(m => m.confirmados), 1);
                    const barMaxHeight = 100;
                    return (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-400">Toca un mes para ver el detalle semanal</p>
                        <div className="flex items-end gap-4">
                          {estadisticasGenerales.meses.map((mes, index) => {
                            const totalHeightPx = mes.confirmados > 0
                              ? Math.max(20, (mes.confirmados / maxConfirmados) * barMaxHeight)
                              : 6;
                            return (
                              <div
                                key={index}
                                className="flex-1 flex flex-col items-center cursor-pointer group"
                                onClick={() => handleDrilldownMes(mes.mes)}
                              >
                                <span className="text-sm font-bold text-gray-800 mb-1">{mes.confirmados}</span>
                                {mes.confirmados > 0 && mes.porTipo ? (
                                  <div
                                    className="w-full flex flex-col-reverse rounded-t-md overflow-hidden transition-all group-hover:opacity-80 group-hover:scale-105 group-hover:shadow-md"
                                    style={{ height: `${totalHeightPx}px` }}
                                  >
                                    {mes.porTipo
                                      .filter(t => t.cantidad > 0)
                                      .map((tipo) => (
                                        <div
                                          key={tipo.tipoId}
                                          style={{
                                            backgroundColor: tipo.color,
                                            height: `${(tipo.cantidad / mes.confirmados) * 100}%`,
                                          }}
                                          title={`${tipo.label}: ${tipo.cantidad}`}
                                        />
                                      ))}
                                  </div>
                                ) : (
                                  <div
                                    className="w-full rounded-t-md bg-gray-200 transition-all group-hover:bg-gray-300"
                                    style={{ height: `${totalHeightPx}px` }}
                                  />
                                )}
                                <span className="text-xs text-gray-600 font-medium capitalize mt-2 group-hover:text-blue-600 transition-colors">
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
                  })()
                )}
              </CardContent>
            </Card>
          )}

          {/* Gráficos de Gamificación del Equipo */}
          {dashboardEquipo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Acciones por Tipo */}
              {dashboardEquipo.accionesPorTipo.length > 0 && (() => {
                const items = dashboardEquipo.accionesPorTipo.slice(0, 8);
                const max = Math.max(...items.map(i => i.cantidad), 1);
                const getColor = (cat: string) =>
                  cat === 'ASISTENCIA' ? 'bg-green-500' :
                  cat === 'PARTICIPACION' ? 'bg-purple-500' :
                  cat === 'EVENTO' ? 'bg-amber-500' : 'bg-indigo-500';
                const getDot = (cat: string) =>
                  cat === 'ASISTENCIA' ? 'bg-green-400' :
                  cat === 'PARTICIPACION' ? 'bg-purple-400' :
                  cat === 'EVENTO' ? 'bg-amber-400' : 'bg-indigo-400';
                return (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-gray-900 flex flex-wrap items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span>Acciones del Equipo</span>
                      {dashboardEquipo.periodo && (
                        <Badge variant="outline" className="text-xs">{dashboardEquipo.periodo.nombre}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <div className="space-y-2.5">
                      {items.map((item) => (
                        <div key={item.nombre} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${getDot(item.categoria)}`} />
                          <span className="text-sm text-gray-700 w-28 sm:w-36 truncate shrink-0" title={item.nombre}>
                            {item.nombre}
                          </span>
                          <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getColor(item.categoria)} transition-all`}
                              style={{ width: `${(item.cantidad / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-8 text-right shrink-0">
                            {item.cantidad}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Leyenda */}
                    <div className="flex flex-wrap gap-3 pt-3 mt-3 border-t border-gray-100">
                      {[
                        { label: 'Asistencia', cls: 'bg-green-400' },
                        { label: 'Participación', cls: 'bg-purple-400' },
                        { label: 'Evento', cls: 'bg-amber-400' },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${l.cls}`} />
                          <span className="text-xs text-gray-500">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                );
              })()}

              {/* Partes más hechas */}
              {dashboardEquipo.partesMasHechas.length > 0 && (() => {
                const PIE_COLORS = ['#8b5cf6', '#6366f1', '#a78bfa', '#c084fc', '#7c3aed', '#818cf8', '#a5b4fc', '#ddd6fe'];
                const data = dashboardEquipo.partesMasHechas.slice(0, 8);
                return (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-purple-600" />
                      Partes Más Realizadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            dataKey="cantidad"
                            nameKey="nombre"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={2}
                            label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            style={{ fontSize: 10 }}
                          >
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value ?? 0, 'Veces']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                );
              })()}
            </div>
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

      {/* Calendario de Actividades - Solo para participantes (admin/lider ya lo ven arriba) */}
      {!isAdminOrLider && (
        <CalendarioMes
          initialMonth={selectedMonth}
          initialYear={selectedYear}
          showExportButton={true}
        />
      )}

      {/* Registrar Mi Asistencia */}
      <RegistrarMiAsistencia compact onSuccess={() => {
        // Recargar mi asistencia al registrar
        asistenciaApi.getMiAsistencia().then(setMiAsistencia).catch(() => null);
      }} />

      {/* Mi Progreso de Gamificación */}
      {miProgreso && (
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-600" />
                Mi Progreso
              </CardTitle>
              <Link to="/mi-progreso">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-100">
                  Ver más <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nivel y XP */}
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-2xl">
                    {miProgreso.nivel.actual?.icono || '🌱'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{miProgreso.nivel.actual?.nombre || 'Discípulo'}</p>
                    <p className="text-xs text-gray-500">Nivel {miProgreso.nivel.actual?.numero || 1}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>XP: {miProgreso.perfil.xpTotal}</span>
                    {miProgreso.nivel.siguiente && (
                      <span>{miProgreso.nivel.siguiente.xpRequerido} XP</span>
                    )}
                  </div>
                  <Progress value={miProgreso.nivel.progresoXp} className="h-2" />
                  {miProgreso.nivel.siguiente && (
                    <p className="text-xs text-gray-500 text-center">
                      {miProgreso.nivel.xpParaSiguienteNivel} XP para {miProgreso.nivel.siguiente.nombre}
                    </p>
                  )}
                </div>
              </div>

              {/* Puntos del Período */}
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">Puntos del Período</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-600 mb-1">
                  {miProgreso.perfil.puntosTrimestre}
                </p>
                {periodoActivo ? (
                  <p className="text-xs text-gray-500">{periodoActivo.nombre}</p>
                ) : (
                  <p className="text-xs text-yellow-600">Sin período activo</p>
                )}
                {/* Posición en mi nivel */}
                {miPosicionNivel && (
                  <div className="mt-3 pt-3 border-t border-purple-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{miPosicionNivel.nivel.icono || '🏅'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-amber-600 text-lg">#{miPosicionNivel.posicion}</span>
                          <span className="text-xs text-gray-500">de {miPosicionNivel.totalEnNivel}</span>
                        </div>
                        <p className="text-xs text-gray-600">Ranking {miPosicionNivel.nivel.nombre}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Posiciones en grupos adicionales */}
                {misPosiciones.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {misPosiciones.slice(0, 2).map((pos) => (
                      <div key={pos.grupoId} className="flex items-center gap-2 text-sm">
                        <span className="text-base">{pos.icono || '📊'}</span>
                        <span className="font-semibold text-amber-600">#{pos.posicion}</span>
                        <span className="text-xs text-gray-500 truncate">{pos.nombre}</span>
                      </div>
                    ))}
                    {misPosiciones.length > 2 && (
                      <p className="text-xs text-gray-400">+{misPosiciones.length - 2} más</p>
                    )}
                  </div>
                )}
              </div>

              {/* Racha y Stats */}
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Racha</span>
                    </div>
                    <span className="text-xl font-bold text-orange-500">{miProgreso.perfil.rachaActual} sem</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Mejor racha:</span>
                    <span className="font-medium">{miProgreso.perfil.rachaMejor} semanas</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Asistencias:</span>
                    <span className="font-medium">{miProgreso.perfil.asistenciasTotales}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Participaciones:</span>
                    <span className="font-medium">{miProgreso.perfil.participacionesTotales}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Link al Ranking */}
            <div className="mt-4 pt-4 border-t border-purple-100 flex justify-center">
              <Link to="/ranking">
                <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <Trophy className="w-4 h-4 mr-2" />
                  Ver Ranking Completo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mis Gráficos de Actividad */}
      {miDashboard && (miDashboard.accionesPorTipo.length > 0 || miDashboard.partesMasHechas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mis Acciones por Tipo */}
          {miDashboard.accionesPorTipo.length > 0 && (() => {
            const items = miDashboard.accionesPorTipo.slice(0, 6);
            const max = Math.max(...items.map(i => i.cantidad), 1);
            const getColor = (cat: string) =>
              cat === 'ASISTENCIA' ? 'bg-green-500' :
              cat === 'PARTICIPACION' ? 'bg-purple-500' :
              cat === 'EVENTO' ? 'bg-amber-500' : 'bg-indigo-500';
            const getDot = (cat: string) =>
              cat === 'ASISTENCIA' ? 'bg-green-400' :
              cat === 'PARTICIPACION' ? 'bg-purple-400' :
              cat === 'EVENTO' ? 'bg-amber-400' : 'bg-indigo-400';
            return (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-gray-900 flex flex-wrap items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Mis Acciones</span>
                  {miDashboard.periodo && (
                    <Badge variant="outline" className="text-xs">{miDashboard.periodo.nombre}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div key={item.nombre} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${getDot(item.categoria)}`} />
                      <span className="text-sm text-gray-700 w-28 sm:w-36 truncate shrink-0" title={item.nombre}>
                        {item.nombre}
                      </span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getColor(item.categoria)} transition-all`}
                          style={{ width: `${(item.cantidad / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right shrink-0">
                        {item.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            );
          })()}

          {/* Mis Partes más hechas */}
          {miDashboard.partesMasHechas.length > 0 && (() => {
            const PIE_COLORS = ['#8b5cf6', '#6366f1', '#a78bfa', '#c084fc', '#7c3aed', '#818cf8'];
            const data = miDashboard.partesMasHechas.slice(0, 6);
            return (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-600" />
                  Mis Partes Realizadas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey="cantidad"
                        nameKey="nombre"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                        paddingAngle={2}
                        label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        style={{ fontSize: 10 }}
                      >
                        {data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value ?? 0, 'Veces']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            );
          })()}
        </div>
      )}

      {/* Próximo Programa */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              Próximo Programa
            </CardTitle>
            {proximoPrograma && (
              <Badge
                variant="outline"
                className={
                  proximoPrograma.estado === 'enviado'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : proximoPrograma.estado === 'completo'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : proximoPrograma.estado === 'finalizado'
                        ? 'bg-gray-50 text-gray-600 border-gray-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                }
              >
                {proximoPrograma.estado}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!proximoPrograma ? (
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay programas próximos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Fecha y título */}
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    {formatDate(proximoPrograma.fecha)}
                  </span>
                  {proximoPrograma.horaInicio && (
                    <span className="text-xs text-gray-500">
                      {formatTime(proximoPrograma.horaInicio)}{proximoPrograma.horaFin ? ` - ${formatTime(proximoPrograma.horaFin)}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-indigo-700 font-medium">{proximoPrograma.titulo}</p>
              </div>

              {/* Lista de partes con asignados */}
              {proximoPrograma.partes.length > 0 && (
                <div className="space-y-1.5">
                  {proximoPrograma.partes.map((pp) => {
                    const asignados = proximoPrograma.asignaciones.filter(
                      (a) => a.parte.id === pp.parte.id
                    );
                    const nombres = asignados
                      .map((a) => a.usuario?.nombre || a.nombreLibre || '—')
                      .join(', ');
                    const esMiParte = asignados.some(
                      (a) => a.usuario?.id === user?.id
                    );
                    return (
                      <div
                        key={pp.id}
                        className={`flex items-start gap-3 px-3 py-2 rounded-md text-sm ${
                          esMiParte
                            ? 'bg-indigo-50 border border-indigo-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <span className={`font-medium w-32 sm:w-40 shrink-0 truncate ${esMiParte ? 'text-indigo-700' : 'text-gray-700'}`} title={pp.parte.nombre}>
                          {pp.parte.nombre}
                        </span>
                        <span className={`flex-1 truncate ${esMiParte ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`} title={nombres}>
                          {nombres || pp.parte.textoFijo || <span className="text-gray-300 italic">Sin asignar</span>}
                        </span>
                        {esMiParte && (
                          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] shrink-0">Tú</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className={`grid grid-cols-1 ${!isAdminOrLider ? 'lg:grid-cols-2' : ''} gap-6`}>
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
                        {parseLocalDate(item.fecha).toLocaleDateString('es-PE', {
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
