import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Flame, Star, Calendar, CheckCircle, History, Lock, ChevronRight, ChevronLeft, Medal, TrendingUp, ChevronUp } from 'lucide-react';
import { gamificacionApi } from '@/services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const CATEGORIAS_COLORES: Record<string, string> = {
  ASISTENCIA: 'bg-green-100 text-green-700',
  PARTICIPACION: 'bg-blue-100 text-blue-700',
  EVENTO_ESPECIAL: 'bg-purple-100 text-purple-700',
  LOGRO: 'bg-yellow-100 text-yellow-700',
  BONUS: 'bg-orange-100 text-orange-700',
  OTRO: 'bg-gray-100 text-gray-700',
};

export default function MiProgresoPage() {
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialPeriodoId, setHistorialPeriodoId] = useState<string>('all');

  const { data: progreso, isLoading } = useQuery({
    queryKey: ['mi-progreso'],
    queryFn: gamificacionApi.getMiProgreso,
  });

  const { data: niveles } = useQuery({
    queryKey: ['niveles'],
    queryFn: () => gamificacionApi.getNiveles(),
  });

  const { data: posiciones } = useQuery({
    queryKey: ['mis-posiciones-ranking'],
    queryFn: gamificacionApi.getMisPosicionesRanking,
  });

  const { data: miPosicionNivel } = useQuery({
    queryKey: ['mi-posicion-nivel'],
    queryFn: gamificacionApi.getMiPosicionEnNivel,
  });

  const { data: misPeriodos } = useQuery({
    queryKey: ['mis-periodos'],
    queryFn: gamificacionApi.getMisPeriodos,
  });

  const { data: historial, isLoading: loadingHistorial } = useQuery({
    queryKey: ['mi-historial', historialPeriodoId, historialPage],
    queryFn: () =>
      gamificacionApi.getMiHistorial({
        periodoId: historialPeriodoId !== 'all' ? parseInt(historialPeriodoId) : undefined,
        page: historialPage,
        limit: 15,
      }),
    enabled: showHistorialModal,
  });

  const { data: periodos } = useQuery({
    queryKey: ['periodos-ranking-all'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!progreso) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Error al cargar tu progreso</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ordenar niveles de mayor a menor para el roadmap
  const nivelesOrdenados = niveles ? [...niveles].sort((a, b) => b.numero - a.numero) : [];

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header compacto con stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Progreso</h1>
          <p className="text-gray-500 mt-1">Tu camino en la fe</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">{progreso.perfil.puntosTotal.toLocaleString()}</span>
            <span className="text-muted-foreground">pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-semibold">{progreso.perfil.rachaActual}</span>
            <span className="text-muted-foreground">sem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-semibold">{progreso.perfil.asistenciasTotales}</span>
            <span className="text-muted-foreground">asist</span>
          </div>
        </div>
      </div>

      {/* Rankings compactos */}
      {(miPosicionNivel || (posiciones && posiciones.length > 0)) && (
        <div className="flex gap-2 flex-wrap">
          {/* Posición en mi nivel - destacado */}
          {miPosicionNivel && (
            <Link
              to={`/ranking?nivel=${miPosicionNivel.nivel.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 hover:shadow-md transition-all hover:scale-105"
            >
              <span className="text-lg">{miPosicionNivel.nivel.icono || '🏅'}</span>
              <span className="text-sm font-medium truncate max-w-[100px]">
                Ranking {miPosicionNivel.nivel.nombre}
              </span>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                #{miPosicionNivel.posicion}
              </Badge>
              <span className="text-xs text-muted-foreground">
                de {miPosicionNivel.totalEnNivel}
              </span>
            </Link>
          )}
          {/* Posiciones en grupos */}
          {posiciones?.map((pos) => (
            <Link
              key={pos.grupoId}
              to={`/ranking?grupo=${pos.grupoId}`}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 hover:shadow-md transition-all hover:scale-105"
            >
              <span className="text-lg">{pos.icono || '🏆'}</span>
              <span className="text-sm font-medium truncate max-w-[100px]">{pos.nombre}</span>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                #{pos.posicion}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Nivel Actual - Compacto */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Icono grande del nivel */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg shrink-0"
              style={{
                backgroundColor: `${progreso.nivel.actual.color}20` || '#6366f120',
                border: `2px solid ${progreso.nivel.actual.color || '#6366f1'}`
              }}
            >
              {progreso.nivel.actual.icono}
            </div>

            {/* Info del nivel */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: progreso.nivel.actual.color }}
                >
                  {progreso.nivel.actual.nombre}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  Nivel {progreso.nivel.actual.numero}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {progreso.nivel.actual.descripcion}
              </p>

              {/* Barra de progreso al siguiente nivel */}
              {progreso.nivel.siguiente ? (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium">{progreso.perfil.xpTotal.toLocaleString()} XP</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ChevronUp className="w-3 h-3" />
                      {progreso.nivel.siguiente.nombre} ({progreso.nivel.siguiente.xpRequerido.toLocaleString()} XP)
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progreso.nivel.progresoXp}%`,
                        backgroundColor: progreso.nivel.actual.color || '#6366f1'
                      }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1.5">
                    Te faltan <span className="font-semibold" style={{ color: progreso.nivel.actual.color }}>{progreso.nivel.xpParaSiguienteNivel.toLocaleString()}</span> XP para subir de nivel
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Trophy className="w-4 h-4" />
                  <span className="font-medium">Has alcanzado el nivel máximo</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview de próximos niveles - Clickeable */}
          {nivelesOrdenados.length > 0 && (
            <button
              onClick={() => setShowNivelesModal(true)}
              className="mt-5 w-full p-3 rounded-xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  Próximos niveles
                </span>
                <span className="text-xs text-amber-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Ver todos
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center justify-center gap-1">
                {nivelesOrdenados
                  .filter(n => n.xpRequerido > progreso.perfil.xpTotal)
                  .slice(-5)
                  .reverse()
                  .map((nivel, idx) => (
                    <div
                      key={nivel.id}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-white border-2 shadow-sm hover:scale-110 transition-transform"
                      style={{
                        borderColor: nivel.color,
                        opacity: 1 - (idx * 0.15)
                      }}
                      title={`${nivel.nombre} - ${nivel.xpRequerido.toLocaleString()} XP`}
                    >
                      {nivel.icono}
                    </div>
                  ))}
                {nivelesOrdenados.filter(n => n.xpRequerido > progreso.perfil.xpTotal).length > 5 && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-amber-100 border-2 border-amber-300 text-amber-700">
                    +{nivelesOrdenados.filter(n => n.xpRequerido > progreso.perfil.xpTotal).length - 5}
                  </div>
                )}
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Grid: Insignias + Actividad Reciente */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Insignias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Medal className="w-5 h-5 text-purple-500" />
              Mis Insignias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progreso.insignias.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {progreso.insignias.map((insignia) => (
                  <div
                    key={insignia.codigo}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100"
                    title={insignia.descripcion}
                  >
                    <span className="text-2xl">{insignia.icono}</span>
                    <span className="text-xs text-center font-medium truncate w-full">
                      {insignia.nombre}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aún no has desbloqueado insignias
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Actividad Reciente
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistorialModal(true)}
                className="text-primary"
              >
                Ver todo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {progreso.historialReciente.length > 0 ? (
              <div className="space-y-2">
                {progreso.historialReciente.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50"
                  >
                    <span className="text-muted-foreground truncate flex-1">{item.descripcion}</span>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      +{item.puntos}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de Racha */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100">
        <CardContent className="py-4">
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

      {/* Resumen por Períodos */}
      {misPeriodos && misPeriodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Historial por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {misPeriodos.map((resumen) => (
                <div
                  key={resumen.periodo.id}
                  className={`p-4 rounded-lg border ${
                    resumen.periodo.estado === 'ACTIVO'
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{resumen.periodo.nombre}</h4>
                      {resumen.periodo.estado === 'ACTIVO' && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Activo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-600">
                      <Medal className="w-4 h-4" />
                      <span className="font-bold">#{resumen.posicionFinal}</span>
                      <span className="text-xs text-muted-foreground">/ {resumen.totalParticipantes}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-semibold text-primary">{resumen.puntosTotal}</span>
                      <span className="text-muted-foreground ml-1">pts</span>
                    </div>
                    <div>
                      <span className="font-semibold text-purple-600">{resumen.xpTotal}</span>
                      <span className="text-muted-foreground ml-1">XP</span>
                    </div>
                    <div>
                      <span className="font-semibold">{resumen.totalRegistros}</span>
                      <span className="text-muted-foreground ml-1">actividades</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Todos los Niveles - Horizontal */}
      <Dialog open={showNivelesModal} onOpenChange={setShowNivelesModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Camino de Fe
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {/* Indicador de cantidad y scroll */}
              <div className="flex items-center justify-between mb-2 px-3">
                <span className="text-xs text-muted-foreground">
                  Nivel {progreso.nivel.actual.numero} de {niveles?.length || 0}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
                  Desliza para ver más
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>

              {/* Path horizontal con scroll */}
              <div className="relative">
                <div className="overflow-x-auto scrollbar-thin">
                  {/* Niveles en fila */}
                  <div className="flex gap-5 p-3">
                  {[...nivelesOrdenados].reverse().map((nivel) => {
                    const isCurrentLevel = nivel.id === progreso.nivel.actual.id;
                    const isUnlocked = progreso.perfil.xpTotal >= nivel.xpRequerido;
                    const isNext = progreso.nivel.siguiente?.id === nivel.id;

                    return (
                      <div
                        key={nivel.id}
                        className={`flex flex-col items-center min-w-[80px] p-2 rounded-xl transition-all ${
                          isCurrentLevel
                            ? 'bg-primary/10 ring-2 ring-primary shadow-lg'
                            : isNext
                              ? 'bg-yellow-50 ring-1 ring-yellow-300'
                              : isUnlocked
                                ? 'bg-green-50/50'
                                : ''
                        }`}
                      >
                        {/* Icono del nivel */}
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md relative ${
                            isCurrentLevel
                              ? 'bg-white'
                              : isUnlocked
                                ? 'bg-white'
                                : 'bg-gray-50'
                          }`}
                          style={{
                            borderColor: isUnlocked ? nivel.color : '#d1d5db',
                            borderWidth: '3px',
                            borderStyle: 'solid',
                            opacity: isUnlocked ? 1 : 0.5
                          }}
                        >
                          {nivel.icono}
                          {isCurrentLevel && (
                            <span className="absolute -top-1 -right-1 text-sm">⭐</span>
                          )}
                          {!isUnlocked && (
                            <div className="absolute inset-0 rounded-full bg-white/60 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Nombre */}
                        <span
                          className={`text-xs font-semibold mt-2 text-center ${!isUnlocked ? 'text-gray-400' : ''}`}
                          style={{ color: isUnlocked ? nivel.color : undefined }}
                        >
                          {nivel.nombre}
                        </span>

                        {/* XP requerido */}
                        <span className="text-[10px] text-muted-foreground">
                          {nivel.xpRequerido.toLocaleString()} XP
                        </span>

                        {/* Badges */}
                        {isCurrentLevel && (
                          <Badge className="bg-primary text-[10px] px-1.5 py-0 mt-1">TÚ</Badge>
                        )}
                        {isNext && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 border-yellow-400 text-yellow-600">
                            Siguiente
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
                {/* Gradient fade derecho para indicar más contenido */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              </div>

              {/* Detalle del nivel actual */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{progreso.nivel.actual.icono}</span>
                  <div>
                    <h3 className="font-bold" style={{ color: progreso.nivel.actual.color }}>
                      {progreso.nivel.actual.nombre}
                    </h3>
                    <p className="text-sm text-muted-foreground">{progreso.nivel.actual.descripcion}</p>
                  </div>
                </div>
                {progreso.nivel.siguiente && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progreso hacia <strong>{progreso.nivel.siguiente.nombre}</strong></span>
                      <span className="font-semibold">{progreso.nivel.progresoXp}%</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progreso.nivel.progresoXp}%`,
                          backgroundColor: progreso.nivel.actual.color
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial Completo */}
      <Dialog open={showHistorialModal} onOpenChange={setShowHistorialModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Puntos
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select
              value={historialPeriodoId}
              onValueChange={(v) => {
                setHistorialPeriodoId(v);
                setHistorialPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                {periodos?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {loadingHistorial ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : historial && historial.data.length > 0 ? (
              <div className="space-y-2 p-2">
                {historial.data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.descripcion || item.tipoPuntaje}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${CATEGORIAS_COLORES[item.categoria] || CATEGORIAS_COLORES.OTRO}`}>
                          {item.categoria}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-primary">+{item.puntos}</p>
                      <p className="text-xs text-muted-foreground">+{item.xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay registros</p>
              </div>
            )}
          </ScrollArea>

          {historial && historial.meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Página {historial.meta.page} de {historial.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistorialPage((p) => Math.max(1, p - 1))}
                  disabled={historialPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistorialPage((p) => Math.min(historial.meta.totalPages, p + 1))}
                  disabled={historialPage >= historial.meta.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
