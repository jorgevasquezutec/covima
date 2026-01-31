import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  AlertCircle,
  Users,
  Phone,
  Calendar,
  Flame,
  Download,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Clock,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import { usuariosApi, gamificacionApi } from '@/services/api';
import type { NivelInactividad } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SeguimientoPage() {
  const [filtroNivel, setFiltroNivel] = useState<'critico' | 'en_riesgo' | 'activo' | 'todos'>('todos');
  const [filtroNivelGam, setFiltroNivelGam] = useState<string>('all');
  const [ordenarPor, setOrdenarPor] = useState<'ultimaAsistencia' | 'ultimaActividad' | 'nombre'>('ultimaAsistencia');
  const [page, setPage] = useState(1);

  const { data: niveles } = useQuery({
    queryKey: ['niveles-gam'],
    queryFn: () => gamificacionApi.getNiveles(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios-inactivos', filtroNivel, filtroNivelGam, ordenarPor, page],
    queryFn: () =>
      usuariosApi.getUsuariosInactivos({
        nivel: filtroNivel,
        nivelGamificacionId: filtroNivelGam !== 'all' ? parseInt(filtroNivelGam) : undefined,
        ordenarPor,
        orden: 'asc',
        page,
        limit: 20,
      }),
  });

  const getNivelColor = (nivel: NivelInactividad) => {
    switch (nivel) {
      case 'critico':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'en_riesgo':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getNivelIcon = (nivel: NivelInactividad) => {
    switch (nivel) {
      case 'critico':
        return <AlertTriangle className="w-4 h-4" />;
      case 'en_riesgo':
        return <AlertCircle className="w-4 h-4" />;
      case 'activo':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'Nunca';
    return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es });
  };

  const getWhatsAppLink = (codigoPais: string, telefono: string) => {
    const numero = `${codigoPais}${telefono}`.replace(/\D/g, '');
    return `https://wa.me/${numero}`;
  };

  const exportarCSV = () => {
    if (!data?.data) return;

    const headers = ['Nombre', 'Teléfono', 'Nivel', 'Última Asistencia', 'Última Actividad', 'Días Sin Asistir', 'Días Sin Actividad', 'Racha', 'Estado'];
    const rows = data.data.map((u) => [
      u.nombre,
      `+${u.codigoPais}${u.telefono}`,
      u.nivel.nombre,
      u.ultimaAsistencia ? new Date(u.ultimaAsistencia).toLocaleDateString() : 'Nunca',
      u.ultimaActividad ? new Date(u.ultimaActividad).toLocaleDateString() : 'Nunca',
      u.diasSinAsistencia ?? 'N/A',
      u.diasSinActividad ?? 'N/A',
      u.rachaActual,
      u.nivelInactividad === 'critico' ? 'Crítico' : u.nivelInactividad === 'en_riesgo' ? 'En Riesgo' : 'Activo',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-inactivos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-orange-500" />
            Seguimiento de Miembros
          </h1>
          <p className="text-muted-foreground text-sm">
            Miembros JA que necesitan atención y seguimiento
          </p>
        </div>
        <Button variant="outline" onClick={exportarCSV} disabled={!data?.data?.length}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumen Cards */}
      {data?.conteo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all ${filtroNivel === 'critico' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => {
              setFiltroNivel('critico');
              setPage(1);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Críticos</p>
                  <p className="text-3xl font-bold text-red-600">{data.conteo.critico}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">+4 sem sin actividad</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${filtroNivel === 'en_riesgo' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => {
              setFiltroNivel('en_riesgo');
              setPage(1);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Riesgo</p>
                  <p className="text-3xl font-bold text-yellow-600">{data.conteo.enRiesgo}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">2-4 sem sin actividad</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${filtroNivel === 'activo' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => {
              setFiltroNivel('activo');
              setPage(1);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-3xl font-bold text-green-600">{data.conteo.activos}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Participando</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${filtroNivel === 'todos' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => {
              setFiltroNivel('todos');
              setPage(1);
            }}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Todos</p>
                  <p className="text-3xl font-bold text-primary">
                    {data.conteo.critico + data.conteo.enRiesgo + data.conteo.activos}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total miembros JA</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filtroNivelGam} onValueChange={(v) => { setFiltroNivelGam(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {niveles?.map((n) => (
              <SelectItem key={n.id} value={n.id.toString()}>
                <span className="flex items-center gap-2">
                  <span>{n.icono}</span>
                  <span>{n.nombre}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ordenarPor} onValueChange={(v: any) => setOrdenarPor(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ultimaAsistencia">Última asistencia</SelectItem>
            <SelectItem value="ultimaActividad">Última actividad</SelectItem>
            <SelectItem value="nombre">Nombre</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {data?.meta.total || 0} usuario(s)
        </span>
      </div>

      {/* Lista de usuarios */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="space-y-4">
          {data.data.map((usuario) => (
            <Card key={usuario.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar y nombre */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={usuario.fotoUrl} />
                    <AvatarFallback>
                      {usuario.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getNivelColor(usuario.nivelInactividad)}>
                        {getNivelIcon(usuario.nivelInactividad)}
                        <span className="ml-1">
                          {usuario.nivelInactividad === 'critico' ? 'Crítico' :
                           usuario.nivelInactividad === 'en_riesgo' ? 'En riesgo' : 'Activo'}
                        </span>
                      </Badge>
                      <h3 className="font-semibold">{usuario.nombre}</h3>
                      <Badge variant="outline" className="text-xs">
                        <span className="mr-1">{usuario.nivel.icono}</span>
                        {usuario.nivel.nombre}
                      </Badge>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Asistencia: {formatFecha(usuario.ultimaAsistencia)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span>Actividad: {formatFecha(usuario.ultimaActividad)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>
                          Racha: {usuario.rachaActual}
                          {usuario.rachaPerdida && (
                            <span className="text-red-500 ml-1">(perdió {usuario.rachaMejor})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-4 h-4 text-green-500" />
                        <span>Total asist: {usuario.asistenciasTotales}</span>
                      </div>
                    </div>

                    {/* Días específicos - solo mostrar para inactivos */}
                    {usuario.nivelInactividad !== 'activo' && (usuario.diasSinAsistencia !== null || usuario.diasSinActividad !== null) && (
                      <div className="mt-2 flex gap-4 text-xs">
                        {usuario.diasSinAsistencia !== null && (
                          <span className="text-red-600 font-medium">
                            {usuario.diasSinAsistencia} días sin asistir
                          </span>
                        )}
                        {usuario.diasSinActividad !== null && (
                          <span className="text-orange-600 font-medium">
                            {usuario.diasSinActividad} días sin generar puntos
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2">
                    <a
                      href={getWhatsAppLink(usuario.codigoPais, usuario.telefono)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                    </a>
                    <a href={`tel:+${usuario.codigoPais}${usuario.telefono}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        <Phone className="w-4 h-4 mr-1" />
                        Llamar
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay miembros en esta categoría</h3>
            <p className="text-muted-foreground mt-2">
              {filtroNivel === 'critico' && 'No hay miembros en estado crítico'}
              {filtroNivel === 'en_riesgo' && 'No hay miembros en riesgo'}
              {filtroNivel === 'activo' && 'No hay miembros activos registrados'}
              {filtroNivel === 'todos' && 'No hay miembros JA registrados'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Paginación */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {data.meta.page} de {data.meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
              disabled={page >= data.meta.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
