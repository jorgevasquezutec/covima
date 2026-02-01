import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, AlertCircle, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { gamificacionApi } from '@/services/api';
import { RankingTop3, RankingTable } from './components';
import { useAuthStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';

type TabType = 'grupos' | 'niveles';

export default function RankingPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [nivelId, setNivelId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('niveles');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Verificar si es admin o líder
  const isAdminOrLider = user?.roles?.some(r => ['admin', 'lider'].includes(r)) || false;

  // Obtener mi progreso (para saber el nivel del participante)
  const { data: miProgreso, isLoading: loadingMiProgreso } = useQuery({
    queryKey: ['mi-progreso'],
    queryFn: gamificacionApi.getMiProgreso,
    enabled: !isAdminOrLider, // Solo para participantes
  });

  // Obtener grupos de ranking visibles (para todos los usuarios)
  const { data: grupos, isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos-ranking'],
    queryFn: gamificacionApi.getGruposRanking,
  });

  // Obtener lista de períodos
  const { data: periodos, isLoading: loadingPeriodos } = useQuery({
    queryKey: ['periodos-ranking'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  // Obtener niveles disponibles (solo para admin/líder)
  const { data: niveles, isLoading: loadingNiveles } = useQuery({
    queryKey: ['niveles-ranking'],
    queryFn: () => gamificacionApi.getNiveles(),
    enabled: isAdminOrLider,
  });

  // Obtener ranking del nivel seleccionado con paginación
  const { data: rankingNivelData, isLoading: loadingRankingNivel } = useQuery({
    queryKey: ['ranking-nivel', nivelId, periodoId, page],
    queryFn: () => gamificacionApi.getRankingNivel(nivelId!, { periodoId: periodoId || undefined, page, limit }),
    enabled: !!nivelId && activeTab === 'niveles',
  });

  // Seleccionar grupo por defecto o desde query param
  useEffect(() => {
    if (grupos && grupos.length > 0 && !grupoId) {
      const grupoParam = searchParams.get('grupo');
      if (grupoParam) {
        const grupoFromParam = grupos.find((g) => g.id === Number(grupoParam));
        if (grupoFromParam) {
          setGrupoId(grupoFromParam.id);
          setActiveTab('grupos');
          return;
        }
      }
      // Default: grupo general
      const general = grupos.find((g) => g.codigo === 'general');
      setGrupoId(general?.id || grupos[0].id);
      // Para participantes, mostrar grupos primero por defecto
      if (!isAdminOrLider) {
        setActiveTab('grupos');
      }
    }
  }, [grupos, grupoId, searchParams, isAdminOrLider]);

  // Seleccionar período activo por defecto
  useEffect(() => {
    if (periodos && periodos.length > 0 && !periodoId) {
      const activo = periodos.find((p) => p.estado === 'ACTIVO');
      setPeriodoId(activo?.id || periodos[0].id);
    }
  }, [periodos, periodoId]);

  // Seleccionar nivel por defecto o desde query param
  useEffect(() => {
    // Verificar si viene nivel por URL (aplica a todos)
    const nivelParam = searchParams.get('nivel');
    if (nivelParam) {
      const nivelIdParam = Number(nivelParam);
      // Para participantes, validar que sea su nivel
      if (!isAdminOrLider && miProgreso?.nivel?.actual) {
        if (miProgreso.nivel.actual.id === nivelIdParam) {
          setNivelId(nivelIdParam);
          setActiveTab('niveles');
          return;
        }
      }
      // Para admin/líder
      if (isAdminOrLider && niveles) {
        const nivelFromParam = niveles.find((n) => n.id === nivelIdParam);
        if (nivelFromParam) {
          setNivelId(nivelIdParam);
          setActiveTab('niveles');
          return;
        }
      }
    }

    if (nivelId) return; // Ya hay nivel seleccionado

    // Para participantes: usar su nivel actual
    if (!isAdminOrLider && miProgreso?.nivel?.actual) {
      setNivelId(miProgreso.nivel.actual.id);
      return;
    }

    // Para admin/líder: usar primer nivel
    if (isAdminOrLider && niveles && niveles.length > 0) {
      setNivelId(niveles[0].id);
    }
  }, [niveles, nivelId, searchParams, isAdminOrLider, miProgreso]);

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [grupoId, nivelId, periodoId, activeTab]);

  // Obtener ranking del grupo seleccionado con paginación
  const { data: rankingGrupoData, isLoading: loadingRanking } = useQuery({
    queryKey: ['ranking-grupo', grupoId, periodoId, page],
    queryFn: () => gamificacionApi.getRankingGrupo(grupoId!, { periodoId: periodoId || undefined, page, limit }),
    enabled: !!grupoId && activeTab === 'grupos',
  });

  const grupoSeleccionado = grupos?.find((g) => g.id === grupoId);
  const periodoSeleccionado = periodos?.find((p) => p.id === periodoId);
  // Para participantes, usar nivel de miProgreso; para admin, buscar en lista
  const nivelSeleccionado = !isAdminOrLider
    ? miProgreso?.nivel?.actual
    : niveles?.find((n) => n.id === nivelId);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Activo</Badge>;
      case 'PAUSADO':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pausado</Badge>;
      case 'CERRADO':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Cerrado</Badge>;
      default:
        return null;
    }
  };

  // Convertir ranking de grupo a formato esperado por componentes
  const rankingFormateado = rankingGrupoData?.data?.map((r) => ({
    posicion: r.posicion,
    usuarioId: r.usuarioId,
    nombre: r.nombre,
    fotoUrl: r.fotoUrl,
    nivel: {
      id: 0,
      numero: r.nivelNumero,
      nombre: r.nivelNombre,
      color: r.nivelColor,
      xpRequerido: 0,
    },
    puntosPeriodo: r.puntosPeriodo,
    rachaActual: r.rachaActual,
    asistenciasTotales: r.asistenciasTotales || 0,
  }));

  // Convertir ranking de nivel a formato esperado
  const rankingNivelFormateado = rankingNivelData?.data?.map((r) => ({
    posicion: r.posicion,
    usuarioId: r.usuarioId,
    nombre: r.nombre,
    fotoUrl: r.fotoUrl,
    nivel: {
      id: nivelSeleccionado?.id || 0,
      numero: nivelSeleccionado?.numero || 0,
      nombre: nivelSeleccionado?.nombre || '',
      color: nivelSeleccionado?.color || '',
      xpRequerido: 0,
    },
    puntosPeriodo: r.puntosPeriodo,
    rachaActual: r.rachaActual,
    asistenciasTotales: r.asistenciasTotales || 0,
  }));

  // Metadata de paginación
  const currentMeta = activeTab === 'niveles' ? rankingNivelData?.meta : rankingGrupoData?.meta;
  const totalPages = currentMeta?.totalPages || 1;

  const isLoading = loadingPeriodos || loadingGrupos ||
    (!isAdminOrLider && (loadingMiProgreso || loadingRankingNivel)) ||
    (isAdminOrLider && loadingNiveles) ||
    (activeTab === 'grupos' && loadingRanking) ||
    (activeTab === 'niveles' && loadingRankingNivel);

  // Mostrar ranking según el tab activo
  const currentRanking = activeTab === 'niveles'
    ? rankingNivelFormateado
    : rankingFormateado;

  // Si no hay períodos
  if (!loadingPeriodos && (!periodos || periodos.length === 0)) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No hay períodos de ranking</h2>
            <p className="text-muted-foreground">
              Un administrador debe crear un período de ranking para comenzar a acumular puntos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 shrink-0" />
              Ranking
            </h1>
            <p className="text-gray-500 text-sm mt-0.5 hidden sm:block">
              Compite con tu sociedad y alcanza el primer lugar
            </p>
          </div>

          <Select
            value={periodoId?.toString() || ''}
            onValueChange={(v) => setPeriodoId(Number(v))}
          >
            <SelectTrigger className="w-[140px] sm:w-[180px] h-9 text-sm shrink-0">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periodos?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.nombre}</span>
                    {p.estado === 'ACTIVO' && (
                      <span className="text-xs text-green-600">●</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info del período */}
        {periodoSeleccionado && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{formatDate(periodoSeleccionado.fechaInicio)}</span>
              {periodoSeleccionado.fechaFin && (
                <span>- {formatDate(periodoSeleccionado.fechaFin)}</span>
              )}
            </div>
            {getEstadoBadge(periodoSeleccionado.estado)}
          </div>
        )}
      </div>

      {/* Para participantes: tabs con grupos + su nivel */}
      {!isAdminOrLider && (nivelSeleccionado || (grupos && grupos.length > 0)) && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 sm:gap-2 pb-2">
            {/* Tabs de grupos visibles (primero) */}
            {grupos?.map((grupo) => (
              <button
                key={grupo.id}
                onClick={() => {
                  setGrupoId(grupo.id);
                  setActiveTab('grupos');
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all shrink-0
                  ${activeTab === 'grupos' && grupoId === grupo.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-sm sm:text-base">{grupo.icono || '📊'}</span>
                <span>{grupo.nombre}</span>
              </button>
            ))}
            {/* Tab de su nivel (después) */}
            {nivelSeleccionado && (
              <button
                onClick={() => setActiveTab('niveles')}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all shrink-0
                  ${activeTab === 'niveles'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-sm sm:text-base">{nivelSeleccionado.icono || '🏅'}</span>
                <span>{nivelSeleccionado.nombre}</span>
              </button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Tabs principales: Por Nivel / Grupos (solo admin/líder) */}
      {isAdminOrLider && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-2 max-w-[240px] h-9">
            <TabsTrigger value="niveles" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Por Nivel
            </TabsTrigger>
            <TabsTrigger value="grupos" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Grupos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Tabs de niveles (solo admin/líder) */}
      {isAdminOrLider && activeTab === 'niveles' && niveles && niveles.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 sm:gap-2 pb-2">
            {niveles.map((nivel) => (
              <button
                key={nivel.id}
                onClick={() => {
                  setNivelId(nivel.id);
                  setSearchParams({ nivel: nivel.id.toString() });
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all shrink-0
                  ${nivelId === nivel.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-sm sm:text-base">{nivel.icono || '🏅'}</span>
                <span>{nivel.nombre}</span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Tabs de grupos de ranking (solo admin/líder) */}
      {isAdminOrLider && activeTab === 'grupos' && grupos && grupos.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 sm:gap-2 pb-2">
            {grupos.map((grupo) => (
              <button
                key={grupo.id}
                onClick={() => {
                  setGrupoId(grupo.id);
                  setSearchParams({ grupo: grupo.id.toString() });
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all shrink-0
                  ${grupoId === grupo.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-sm sm:text-base">{grupo.icono || '📊'}</span>
                <span>{grupo.nombre}</span>
                {grupo.tipo === 'SISTEMA' && grupo.codigo === 'lideres' && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-1.5 py-0">
                    {grupo.totalMiembros}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Descripción del nivel o grupo seleccionado */}
      {activeTab === 'niveles' && nivelSeleccionado?.descripcion && (
        <p className="text-xs sm:text-sm text-muted-foreground italic">
          {nivelSeleccionado.descripcion}
        </p>
      )}
      {activeTab === 'grupos' && grupoSeleccionado?.descripcion && (
        <p className="text-xs sm:text-sm text-muted-foreground italic">
          {grupoSeleccionado.descripcion}
        </p>
      )}

      {/* Contenido del ranking */}
      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-36 sm:h-40 w-full" />
          <Skeleton className="h-48 sm:h-64 w-full" />
        </div>
      ) : currentRanking && currentRanking.length > 0 ? (
        <>
          {/* Top 3 solo en primera página */}
          {page === 1 && (
            <Card>
              <CardContent className="pt-4 sm:pt-6 pb-4 px-3 sm:px-6">
                <RankingTop3 usuarios={currentRanking} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Clasificación</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-4">
              <RankingTable
                usuarios={page === 1 ? currentRanking.slice(3) : currentRanking}
                usuarioActualId={user?.id}
                startFrom={1}
              />
            </CardContent>
          </Card>

          {/* Paginación */}
          {currentMeta && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Mostrando {currentRanking.length} de {currentMeta.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Aún no hay datos de ranking
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">
              Los puntos se acumulan con cada asistencia y participación
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
