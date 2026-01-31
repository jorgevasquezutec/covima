import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, AlertCircle, Users } from 'lucide-react';
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

  // Obtener grupos de ranking visibles
  const { data: grupos, isLoading: loadingGrupos } = useQuery({
    queryKey: ['grupos-ranking'],
    queryFn: gamificacionApi.getGruposRanking,
  });

  // Obtener lista de períodos
  const { data: periodos, isLoading: loadingPeriodos } = useQuery({
    queryKey: ['periodos-ranking'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  // Obtener niveles disponibles
  const { data: niveles, isLoading: loadingNiveles } = useQuery({
    queryKey: ['niveles-ranking'],
    queryFn: () => gamificacionApi.getNiveles(),
  });

  // Obtener ranking del nivel seleccionado
  const { data: rankingNivel, isLoading: loadingRankingNivel } = useQuery({
    queryKey: ['ranking-nivel', nivelId, periodoId],
    queryFn: () => gamificacionApi.getRankingNivel(nivelId!, periodoId || undefined, 50),
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
          return;
        }
      }
      // Default: grupo general
      const general = grupos.find((g) => g.codigo === 'general');
      setGrupoId(general?.id || grupos[0].id);
    }
  }, [grupos, grupoId, searchParams]);

  // Seleccionar período activo por defecto
  useEffect(() => {
    if (periodos && periodos.length > 0 && !periodoId) {
      const activo = periodos.find((p) => p.estado === 'ACTIVO');
      setPeriodoId(activo?.id || periodos[0].id);
    }
  }, [periodos, periodoId]);

  // Seleccionar nivel por defecto o desde query param
  useEffect(() => {
    if (niveles && niveles.length > 0 && !nivelId) {
      const nivelParam = searchParams.get('nivel');
      if (nivelParam) {
        const nivelFromParam = niveles.find((n) => n.id === Number(nivelParam));
        if (nivelFromParam) {
          setNivelId(nivelFromParam.id);
          setActiveTab('niveles');
          return;
        }
      }
      // Default: primer nivel
      setNivelId(niveles[0].id);
    }
  }, [niveles, nivelId, searchParams]);

  // Obtener ranking del grupo seleccionado
  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ['ranking-grupo', grupoId, periodoId],
    queryFn: () => gamificacionApi.getRankingGrupo(grupoId!, periodoId || undefined, 50),
    enabled: !!grupoId && activeTab === 'grupos',
  });

  const grupoSeleccionado = grupos?.find((g) => g.id === grupoId);
  const periodoSeleccionado = periodos?.find((p) => p.id === periodoId);
  const nivelSeleccionado = niveles?.find((n) => n.id === nivelId);

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
  const rankingFormateado = ranking?.map((r) => ({
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
  const rankingNivelFormateado = rankingNivel?.map((r) => ({
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

  const isLoading = loadingGrupos || loadingPeriodos || loadingNiveles ||
    (activeTab === 'grupos' && loadingRanking) ||
    (activeTab === 'niveles' && loadingRankingNivel);

  const currentRanking = activeTab === 'niveles' ? rankingNivelFormateado : rankingFormateado;

  // Si no hay períodos
  if (!loadingPeriodos && (!periodos || periodos.length === 0)) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
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
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Ranking
          </h1>
          <p className="text-muted-foreground text-sm">
            Compite con tu sociedad y alcanza el primer lugar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={periodoId?.toString() || ''}
            onValueChange={(v) => setPeriodoId(Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {periodos?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{p.nombre}</span>
                    {p.estado === 'ACTIVO' && (
                      <span className="text-xs text-green-600">●</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info del período */}
      {periodoSeleccionado && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(periodoSeleccionado.fechaInicio)}</span>
            {periodoSeleccionado.fechaFin && (
              <span>- {formatDate(periodoSeleccionado.fechaFin)}</span>
            )}
          </div>
          {getEstadoBadge(periodoSeleccionado.estado)}
        </div>
      )}

      {/* Tabs principales: Por Nivel / Grupos */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="niveles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Por Nivel
          </TabsTrigger>
          <TabsTrigger value="grupos" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Grupos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tabs de niveles */}
      {activeTab === 'niveles' && niveles && niveles.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {niveles.map((nivel) => (
              <button
                key={nivel.id}
                onClick={() => {
                  setNivelId(nivel.id);
                  setSearchParams({ nivel: nivel.id.toString() });
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${nivelId === nivel.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-base">{nivel.icono || '🏅'}</span>
                <span>{nivel.nombre}</span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Tabs de grupos de ranking */}
      {activeTab === 'grupos' && grupos && grupos.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {grupos.map((grupo) => (
              <button
                key={grupo.id}
                onClick={() => {
                  setGrupoId(grupo.id);
                  setSearchParams({ grupo: grupo.id.toString() });
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${grupoId === grupo.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }
                `}
              >
                <span className="text-base">{grupo.icono || '📊'}</span>
                <span>{grupo.nombre}</span>
                {grupo.tipo === 'SISTEMA' && grupo.codigo === 'lideres' && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
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
        <p className="text-sm text-muted-foreground italic">
          {nivelSeleccionado.descripcion}
        </p>
      )}
      {activeTab === 'grupos' && grupoSeleccionado?.descripcion && (
        <p className="text-sm text-muted-foreground italic">
          {grupoSeleccionado.descripcion}
        </p>
      )}

      {/* Contenido del ranking */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : currentRanking && currentRanking.length > 0 ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <RankingTop3 usuarios={currentRanking} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Clasificación completa
                {activeTab === 'niveles' && nivelSeleccionado && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({nivelSeleccionado.nombre})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingTable
                usuarios={currentRanking}
                usuarioActualId={user?.id}
                startFrom={4}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay datos de ranking para {activeTab === 'niveles' ? 'este nivel' : 'este grupo'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Los puntos se acumulan con cada asistencia y participación
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
