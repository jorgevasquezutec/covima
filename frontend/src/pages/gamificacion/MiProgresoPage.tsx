import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Flame, Star, Calendar, CheckCircle, History, Lock, ChevronRight, Check, ChevronLeft, Medal, TrendingUp } from 'lucide-react';
import { gamificacionApi } from '@/services/api';
import { NivelBadge, ProgresoXP } from './components';
import { formatDistanceToNow, format } from 'date-fns';
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
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const [historialPeriodoId, setHistorialPeriodoId] = useState<string>('all');

  const { data: progreso, isLoading } = useQuery({
    queryKey: ['mi-progreso'],
    queryFn: gamificacionApi.getMiProgreso,
  });

  const { data: niveles } = useQuery({
    queryKey: ['niveles'],
    queryFn: gamificacionApi.getNiveles,
  });

  const { data: posiciones } = useQuery({
    queryKey: ['mis-posiciones-ranking'],
    queryFn: gamificacionApi.getMisPosicionesRanking,
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
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
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

  const statCards = [
    {
      icon: Star,
      label: 'Puntos Totales',
      value: progreso.perfil.puntosTotal.toLocaleString(),
      color: 'text-blue-500',
    },
    {
      icon: Flame,
      label: 'Racha Actual',
      value: `${progreso.perfil.rachaActual} semanas`,
      color: 'text-orange-500',
    },
    {
      icon: CheckCircle,
      label: 'Asistencias',
      value: progreso.perfil.asistenciasTotales,
      color: 'text-green-500',
    },
  ];

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Progreso</h1>
        <p className="text-muted-foreground text-sm">Tu camino en la fe y participación</p>
      </div>

      {/* Card de Nivel */}
      <Card
        className="bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowNivelesModal(true)}
      >
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <NivelBadge nivel={progreso.nivel.actual} size="lg" />
            <div className="flex-1 w-full">
              <ProgresoXP
                xpActual={progreso.perfil.xpTotal}
                nivelActual={progreso.nivel.actual}
                nivelSiguiente={progreso.nivel.siguiente}
                progresoXp={progreso.nivel.progresoXp}
              />
              {progreso.nivel.siguiente && (
                <p className="text-sm text-muted-foreground mt-2">
                  Te faltan {progreso.nivel.xpParaSiguienteNivel.toLocaleString()} XP para{' '}
                  <span className="font-medium">{progreso.nivel.siguiente.nombre}</span>
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4 md:hidden">
            Toca para ver todos los niveles
          </p>
        </CardContent>
      </Card>

      {/* Modal de Niveles */}
      <Dialog open={showNivelesModal} onOpenChange={setShowNivelesModal}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Niveles Bíblicos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {niveles?.map((nivel) => {
              const isCurrentLevel = nivel.id === progreso.nivel.actual.id;
              const isUnlocked = progreso.perfil.xpTotal >= nivel.xpRequerido;

              return (
                <div
                  key={nivel.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    isCurrentLevel
                      ? 'bg-primary/10 border-primary'
                      : isUnlocked
                        ? 'bg-muted/30 border-transparent'
                        : 'opacity-60 border-transparent'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${nivel.color}20` }}
                  >
                    {nivel.icono}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold" style={{ color: isUnlocked ? nivel.color : undefined }}>
                        {nivel.nombre}
                      </p>
                      {isCurrentLevel && (
                        <Badge variant="default" className="text-xs">
                          Actual
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{nivel.descripcion}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nivel.xpRequerido.toLocaleString()} XP requeridos
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isUnlocked ? (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            Tu XP actual: <span className="font-semibold">{progreso.perfil.xpTotal.toLocaleString()}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mis Posiciones en Rankings */}
      {posiciones && posiciones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Mis Posiciones en Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {posiciones.map((pos) => (
                <Link
                  key={pos.grupoId}
                  to="/ranking"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 hover:shadow-md transition-shadow"
                >
                  <span className="text-2xl">{pos.icono || '📊'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{pos.nombre}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-yellow-600">#{pos.posicion}</span>
                      <span className="text-xs text-muted-foreground">/ {pos.totalMiembros}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Insignias */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5" />
              Mis Insignias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progreso.insignias.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {progreso.insignias.map((insignia) => (
                  <div
                    key={insignia.codigo}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Sigue participando para ganar logros
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial Reciente */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
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
              <div className="space-y-3">
                {progreso.historialReciente.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{item.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        +{item.puntos} pts
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
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

      {/* Modal de Historial Completo */}
      <Dialog open={showHistorialModal} onOpenChange={setShowHistorialModal}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Puntos
            </DialogTitle>
          </DialogHeader>

          {/* Filtro por período */}
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

          {/* Lista de historial */}
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

          {/* Paginación */}
          {historial && historial.meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Página {historial.meta.page} de {historial.meta.totalPages} ({historial.meta.total} registros)
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

      {/* Resumen por Períodos */}
      {misPeriodos && misPeriodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mi Historial por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {misPeriodos.map((resumen) => (
                <div
                  key={resumen.periodo.id}
                  className={`p-4 rounded-lg border ${
                    resumen.periodo.estado === 'ACTIVO'
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{resumen.periodo.nombre}</h4>
                        <Badge
                          variant="outline"
                          className={
                            resumen.periodo.estado === 'ACTIVO'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : resumen.periodo.estado === 'CERRADO'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {resumen.periodo.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(resumen.periodo.fechaInicio), "d MMM yyyy", { locale: es })}
                        {resumen.periodo.fechaFin && (
                          <> - {format(new Date(resumen.periodo.fechaFin), "d MMM yyyy", { locale: es })}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-600">
                        <Medal className="w-4 h-4" />
                        <span className="font-bold">#{resumen.posicionFinal}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">de {resumen.totalParticipantes}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{resumen.puntosTotal}</p>
                      <p className="text-xs text-muted-foreground">Puntos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{resumen.xpTotal}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-700">{resumen.totalRegistros}</p>
                      <p className="text-xs text-muted-foreground">Actividades</p>
                    </div>
                  </div>

                  {/* Desglose por categoría */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(resumen.porCategoria).map(([categoria, data]) => (
                      <Badge
                        key={categoria}
                        variant="outline"
                        className={CATEGORIAS_COLORES[categoria] || CATEGORIAS_COLORES.OTRO}
                      >
                        {categoria}: {data.puntos} pts ({data.cantidad})
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mejores rachas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Estadísticas de Racha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-500">{progreso.perfil.rachaActual}</p>
              <p className="text-sm text-muted-foreground">Racha Actual</p>
              <p className="text-xs text-muted-foreground mt-1">semanas consecutivas</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-500">{progreso.perfil.rachaMejor}</p>
              <p className="text-sm text-muted-foreground">Mejor Racha</p>
              <p className="text-xs text-muted-foreground mt-1">tu récord personal</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
