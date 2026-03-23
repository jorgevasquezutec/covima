import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeft, Star, Flame, Trophy, CheckCircle, Users, TrendingUp,
  Award, Lock, Calendar, ChevronLeft, ChevronRight, ChevronUp, History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { gamificacionApi, asistenciaApi } from '@/services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIAS_COLORES: Record<string, string> = {
  ASISTENCIA: 'bg-green-100 text-green-700',
  PARTICIPACION: 'bg-blue-100 text-blue-700',
  EVENTO_ESPECIAL: 'bg-purple-100 text-purple-700',
  LOGRO: 'bg-yellow-100 text-yellow-700',
  BONUS: 'bg-orange-100 text-orange-700',
  OTRO: 'bg-gray-100 text-gray-700',
};

const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export default function PerfilParticipantePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const usuarioId = Number(id);

  const [historialPage, setHistorialPage] = useState(1);
  const [historialPeriodoId, setHistorialPeriodoId] = useState<string>('all');

  // Main data query
  const { data: perfil, isLoading } = useQuery({
    queryKey: ['perfil-participante', usuarioId, historialPage, historialPeriodoId],
    queryFn: () => gamificacionApi.getPerfilParticipante(usuarioId, {
      historialPage,
      historialPeriodoId: historialPeriodoId !== 'all' ? parseInt(historialPeriodoId) : undefined,
    }),
    enabled: !!usuarioId,
  });

  // Asistencia + heatmap data
  const { data: asistencia } = useQuery({
    queryKey: ['asistencia-usuario', usuarioId],
    queryFn: () => asistenciaApi.getAsistenciaUsuario(usuarioId),
    enabled: !!usuarioId,
  });

  // Periodos for historial filter
  const { data: todosLosPeriodos } = useQuery({
    queryKey: ['periodos-ranking-all'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="p-3 sm:p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No se encontró el participante</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { usuario, progreso, historial, periodos, posiciones, posicionNivel, insignias, puntosSemanales, puntosPorCategoria } = perfil;

  // Radar data (normalized to 0-100 scale)
  const maxVals = {
    asistencia: Math.max(progreso.perfil.asistenciasTotales, 1),
    participacion: Math.max(progreso.perfil.participacionesTotales, 1),
    puntos: Math.max(progreso.perfil.puntosTotal, 1),
    xp: Math.max(progreso.perfil.xpTotal, 1),
    racha: Math.max(progreso.perfil.rachaMejor, 1),
    nivel: Math.max(progreso.nivel.actual.numero, 1),
  };
  const radarData = [
    { subject: 'Asistencia', value: Math.min(100, (progreso.perfil.asistenciasTotales / Math.max(maxVals.asistencia, 20)) * 100), raw: progreso.perfil.asistenciasTotales },
    { subject: 'Participación', value: Math.min(100, (progreso.perfil.participacionesTotales / Math.max(maxVals.participacion, 10)) * 100), raw: progreso.perfil.participacionesTotales },
    { subject: 'Puntos', value: Math.min(100, (progreso.perfil.puntosTotal / Math.max(maxVals.puntos, 500)) * 100), raw: progreso.perfil.puntosTotal },
    { subject: 'XP', value: Math.min(100, (progreso.perfil.xpTotal / Math.max(maxVals.xp, 300)) * 100), raw: progreso.perfil.xpTotal },
    { subject: 'Racha', value: Math.min(100, (progreso.perfil.rachaActual / Math.max(maxVals.racha, 10)) * 100), raw: progreso.perfil.rachaActual },
    { subject: 'Nivel', value: Math.min(100, (progreso.nivel.actual.numero / 10) * 100), raw: progreso.nivel.actual.numero },
  ];

  // AreaChart data
  // Weekly activity data — fill gaps with 0s so missing weeks show
  const weeklyData = (() => {
    const dataMap = new Map(puntosSemanales.map(s => [s.semana, s]));
    const result: { semana: string; puntos: number; xp: number }[] = [];
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setMonth(inicio.getMonth() - 6);
    // Align to Sunday
    inicio.setDate(inicio.getDate() - inicio.getDay());

    const cursor = new Date(inicio);
    while (cursor <= hoy) {
      const key = cursor.toISOString().split('T')[0];
      const entry = dataMap.get(key);
      result.push({
        semana: format(new Date(cursor), 'd MMM', { locale: es }),
        puntos: entry?.puntos || 0,
        xp: entry?.xp || 0,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    return result;
  })();

  // BarChart data - from periodos
  const barData = periodos.map(p => ({
    nombre: p.periodo.nombre.length > 12 ? p.periodo.nombre.slice(0, 12) + '...' : p.periodo.nombre,
    puntos: p.puntosTotal,
    xp: p.xpTotal,
  }));

  // PieChart data - from puntosPorCategoria (all-time, real categories)
  const CAT_LABELS: Record<string, string> = {
    ASISTENCIA: 'Asistencia',
    PARTICIPACION: 'Participación',
    EVENTO_ESPECIAL: 'Eventos',
    BONUS: 'Bonus',
    LOGRO: 'Insignias',
    OTRO: 'Otros',
  };
  const pieData = puntosPorCategoria
    .filter(c => c.puntos > 0)
    .map(c => ({ name: CAT_LABELS[c.categoria] || c.categoria, value: c.puntos }));

  // Heatmap state
  const [selectedDay, setSelectedDay] = useState<{ key: string; date: Date; count: number; tipos: string[] } | null>(null);

  // Heatmap helper
  const renderHeatmap = () => {
    const heatmapData = asistencia?.heatmap || [];
    const hoy = new Date();
    const hace6Meses = new Date(hoy);
    hace6Meses.setMonth(hoy.getMonth() - 6);
    hace6Meses.setDate(hace6Meses.getDate() - hace6Meses.getDay());

    const heatmapMap = new Map(heatmapData.map(h => [h.fecha, h]));
    const weeks: { date: Date; key: string; count: number; tipos: string[] }[][] = [];
    const currentDate = new Date(hace6Meses);

    while (currentDate <= hoy) {
      const week: { date: Date; key: string; count: number; tipos: string[] }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const entry = heatmapMap.get(dateStr);
        week.push({
          date: new Date(currentDate),
          key: dateStr,
          count: entry?.count || 0,
          tipos: entry?.tipos || [],
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    const getColor = (count: number, isSelected: boolean) => {
      const base = count === 0 ? 'bg-gray-100' : count === 1 ? 'bg-green-200' : count === 2 ? 'bg-green-400' : 'bg-green-600';
      return isSelected ? `${base} ring-2 ring-primary scale-125` : base;
    };

    const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstDay = week.find(d => d.date <= hoy);
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ col: wi, label: format(firstDay.date, 'MMM', { locale: es }) });
          lastMonth = month;
        }
      }
    });

    // Stats
    const totalDias = heatmapData.length;
    const totalAsistencias = heatmapData.reduce((sum, h) => sum + h.count, 0);
    const tiposCount = new Map<string, number>();
    heatmapData.forEach(h => h.tipos.forEach(t => tiposCount.set(t, (tiposCount.get(t) || 0) + 1)));

    const totalCols = weeks.length;

    return (
      <div className="w-full space-y-3">
        {/* Heatmap grid */}
        <div>
          {/* Month labels */}
          <div className="grid mb-1" style={{ gridTemplateColumns: `16px repeat(${totalCols}, 1fr)`, gap: '2px' }}>
            <div />
            {weeks.map((_week, wi) => {
              const ml = monthLabels.find(m => m.col === wi);
              return (
                <div key={wi} className="text-[9px] sm:text-[10px] text-muted-foreground capitalize truncate">
                  {ml ? ml.label : ''}
                </div>
              );
            })}
          </div>
          {/* Grid */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `16px repeat(${totalCols}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)', gap: '2px' }}
          >
            {dayLabels.map((label, dayIdx) => (
              <React.Fragment key={dayIdx}>
                <div className="flex items-center justify-end pr-0.5 text-[8px] sm:text-[9px] text-muted-foreground">
                  {dayIdx % 2 === 1 ? label : ''}
                </div>
                {weeks.map((week, wi) => {
                  const day = week[dayIdx];
                  if (!day) return <div key={`${wi}-${dayIdx}`} />;
                  const isFuture = day.date > hoy;
                  const isSelected = selectedDay?.key === day.key;
                  return (
                    <div
                      key={day.key}
                      className={`aspect-square rounded-[2px] sm:rounded-sm transition-all ${
                        getColor(day.count, isSelected)
                      } ${isFuture ? 'opacity-0' : 'hover:scale-110 hover:ring-1 hover:ring-gray-400 cursor-pointer'}`}
                      onClick={() => !isFuture && setSelectedDay(isSelected ? null : day)}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border text-sm animate-in fade-in-0 slide-in-from-top-1">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: selectedDay.count > 0 ? '#dcfce7' : '#f3f4f6' }}>
              {selectedDay.count > 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Calendar className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium capitalize">{format(selectedDay.date, "EEEE d 'de' MMMM", { locale: es })}</p>
              {selectedDay.count > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {selectedDay.tipos.map((tipo, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] bg-green-100 text-green-700">{tipo}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">({selectedDay.count} registro{selectedDay.count > 1 ? 's' : ''})</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin asistencia</p>
              )}
            </div>
            <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <span className="sr-only">Cerrar</span>&times;
            </button>
          </div>
        )}

        {/* Legend + Stats row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-gray-100" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-green-200" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-green-400" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] bg-green-600" />
            <span>Más</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
            <span><strong className="text-foreground">{totalDias}</strong> días asistió</span>
            <span><strong className="text-foreground">{totalAsistencias}</strong> registros</span>
            {tiposCount.size > 0 && (
              <span className="hidden sm:inline">{Array.from(tiposCount.entries()).map(([t, c]) => `${t}: ${c}`).join(' · ')}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/ranking')} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Volver al ranking
      </Button>

      {/* User header */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
          <AvatarImage src={usuario.fotoUrl} alt={usuario.nombre} />
          <AvatarFallback className="text-xl">{usuario.nombre.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{usuario.nombre}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{usuario.roles.join(', ')}</span>
            <span>·</span>
            <span>Miembro desde {format(new Date(usuario.createdAt), 'd MMM yyyy', { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">{progreso.nivel.actual.icono}</span>
            <span className="font-semibold" style={{ color: progreso.nivel.actual.color }}>
              {progreso.nivel.actual.nombre}
            </span>
            <Badge variant="secondary" className="text-xs">Nivel {progreso.nivel.actual.numero}</Badge>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: 'Puntos', value: progreso.perfil.puntosTotal.toLocaleString(), icon: Star, color: 'text-blue-500' },
          { label: 'XP', value: progreso.perfil.xpTotal.toLocaleString(), icon: TrendingUp, color: 'text-purple-500' },
          { label: 'Racha', value: `${progreso.perfil.rachaActual} sem`, icon: Flame, color: 'text-orange-500' },
          { label: 'Mejor', value: `${progreso.perfil.rachaMejor} sem`, icon: Trophy, color: 'text-yellow-500' },
          { label: 'Asist.', value: progreso.perfil.asistenciasTotales.toString(), icon: CheckCircle, color: 'text-green-500' },
          { label: 'Partic.', value: progreso.perfil.participacionesTotales.toString(), icon: Users, color: 'text-indigo-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Level progress + Radar */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Level progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">{progreso.nivel.actual.icono}</span>
              Progreso de Nivel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color: progreso.nivel.actual.color }}>
                  {progreso.nivel.actual.nombre}
                </span>
                {progreso.nivel.siguiente && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" />
                    {progreso.nivel.siguiente.nombre}
                  </span>
                )}
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progreso.nivel.progresoXp}%`,
                    backgroundColor: progreso.nivel.actual.color || '#6366f1',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progreso.perfil.xpTotal.toLocaleString()} XP</span>
                {progreso.nivel.siguiente ? (
                  <span>{progreso.nivel.xpParaSiguienteNivel.toLocaleString()} XP para subir</span>
                ) : (
                  <span className="text-green-600 font-medium">Nivel máximo</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Radar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Perfil Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar name="Perfil" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip formatter={(_value: any, _name: any, props: any) => [`${props.payload.raw}`, props.payload.subject]} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Weekly activity chart */}
      {weeklyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Actividad Semanal (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="semana" fontSize={10} tick={{ fill: '#6b7280' }} interval={Math.max(0, Math.floor(weeklyData.length / 8) - 1)} />
                <YAxis fontSize={11} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value}`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="puntos" name="Puntos" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={weeklyData.length > 16 ? 8 : 16} />
                <Line type="linear" dataKey="xp" name="XP" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 3: Bar chart (by period) + Pie chart (by category) */}
      <div className="grid md:grid-cols-2 gap-4">
        {barData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Puntos por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="nombre" fontSize={11} tick={{ fill: '#6b7280' }} />
                  <YAxis fontSize={11} tick={{ fill: '#9ca3af' }} />
                  <Tooltip />
                  <Bar dataKey="puntos" name="Puntos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="xp" name="XP" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 4: Attendance heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Asistencia (últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderHeatmap()}
        </CardContent>
      </Card>

      {/* Row 5: Streaks + Badges */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Streaks */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rachas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <span className="text-3xl font-bold text-orange-500">{progreso.perfil.rachaActual}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Racha Actual</p>
              </div>
              <div className="w-px h-12 bg-orange-200" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <span className="text-3xl font-bold text-yellow-500">{progreso.perfil.rachaMejor}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mejor Racha</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Insignias
              <Badge variant="secondary" className="ml-auto">
                {insignias.filter(i => i.desbloqueada).length}/{insignias.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {insignias.slice(0, 6).map((insignia) => (
                <div
                  key={insignia.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    insignia.desbloqueada
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span className={`text-xl shrink-0 ${!insignia.desbloqueada ? 'grayscale opacity-50' : ''}`}>
                    {insignia.icono}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${insignia.desbloqueada ? 'text-amber-800' : 'text-gray-500'}`}>
                      {insignia.nombre}
                    </p>
                    {!insignia.desbloqueada && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Bloqueada
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {insignias.length > 6 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{insignias.length - 6} más
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Ranking positions */}
      {(posiciones.length > 0 || posicionNivel) && (
        <div className="flex gap-2 flex-wrap">
          {posicionNivel && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
              <span className="text-lg">{posicionNivel.nivel.icono || '🏅'}</span>
              <span className="text-sm font-medium">{posicionNivel.nivel.nombre}</span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">#{posicionNivel.posicion}</Badge>
              <span className="text-xs text-muted-foreground">de {posicionNivel.totalEnNivel}</span>
            </div>
          )}
          {posiciones.map((pos) => (
            <div key={pos.grupoId} className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
              <span className="text-lg">{pos.icono || '🏆'}</span>
              <span className="text-sm font-medium">{pos.nombre}</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">#{pos.posicion}</Badge>
              <span className="text-xs text-muted-foreground">de {pos.totalMiembros}</span>
            </div>
          ))}
        </div>
      )}

      {/* Row 7: Historial de puntos */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Historial de Puntos
            </CardTitle>
            <Select
              value={historialPeriodoId}
              onValueChange={(v) => {
                setHistorialPeriodoId(v);
                setHistorialPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Todos los períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                {todosLosPeriodos?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {historial.data.length > 0 ? (
            <div className="space-y-2">
              {historial.data.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.descripcion || item.tipoPuntaje}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-[10px] ${CATEGORIAS_COLORES[item.categoria] || CATEGORIAS_COLORES.OTRO}`}>
                        {item.categoria}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "d MMM yyyy", { locale: es })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-primary">+{item.puntos}</p>
                    <p className="text-[10px] text-muted-foreground">+{item.xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sin registros</p>
            </div>
          )}

          {/* Pagination */}
          {historial.meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <span className="text-xs text-muted-foreground">
                Pág {historial.meta.page} de {historial.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistorialPage(p => Math.max(1, p - 1))}
                  disabled={historialPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistorialPage(p => Math.min(historial.meta.totalPages, p + 1))}
                  disabled={historialPage >= historial.meta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
