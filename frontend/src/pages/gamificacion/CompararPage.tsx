import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
  Cell,
} from 'recharts';
import { Scale, Search, Users, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { gamificacionApi, usuariosApi } from '@/services/api';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

const RADAR_LABELS: Record<string, string> = {
  asistencia: 'Asistencia',
  participacion: 'Participación',
  puntos: 'Puntos',
  xp: 'XP',
  racha: 'Racha',
  nivel: 'Nivel',
};

const RAW_LABELS: Record<string, string> = {
  asistencia: 'Asistencias Totales',
  participacion: 'Participaciones',
  puntos: 'Puntos Trimestre',
  xp: 'XP Total',
  racha: 'Racha Actual',
  nivel: 'Nivel',
};

const CATEGORIA_LABELS: Record<string, string> = {
  ASISTENCIA: 'Asistencia',
  PARTICIPACION: 'Participación',
  EVENTO_ESPECIAL: 'Eventos',
  BONUS: 'Bonus',
  LOGRO: 'Logros',
};

function RadarTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{data.label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
          {data[`raw_${entry.dataKey}`] !== undefined && (
            <span className="text-gray-400">
              (raw: {data[`raw_${entry.dataKey}`]})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CompararPage() {
  const [selectedUsuarios, setSelectedUsuarios] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shouldCompare, setShouldCompare] = useState(false);

  const { data: usuariosData, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios-gamificacion'],
    queryFn: () => usuariosApi.getAll({ activo: true, limit: 500 }),
  });

  const {
    data: comparacion,
    isLoading: loadingComparacion,
    isFetching,
  } = useQuery({
    queryKey: ['comparar-participantes', selectedUsuarios],
    queryFn: () => gamificacionApi.compararParticipantes(selectedUsuarios),
    enabled: shouldCompare && selectedUsuarios.length >= 2,
  });

  const usuariosFiltrados = usuariosData?.data.filter((u) =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggleUsuario = (usuarioId: number) => {
    setSelectedUsuarios((prev) => {
      if (prev.includes(usuarioId)) {
        return prev.filter((id) => id !== usuarioId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, usuarioId];
    });
    setShouldCompare(false);
  };

  const handleRemoveUsuario = (usuarioId: number) => {
    setSelectedUsuarios((prev) => prev.filter((id) => id !== usuarioId));
    setShouldCompare(false);
  };

  const handleComparar = () => {
    if (selectedUsuarios.length >= 2) {
      setShouldCompare(true);
    }
  };

  // Build radar chart data
  const radarData = comparacion
    ? Object.keys(RADAR_LABELS).map((key) => {
        const point: any = {
          label: RADAR_LABELS[key],
          subject: RADAR_LABELS[key],
        };
        comparacion.usuarios.forEach((u) => {
          const radarKey = `user_${u.usuarioId}`;
          point[radarKey] = u.radar[key as keyof typeof u.radar];
          // Attach raw value for tooltip
          point[`raw_${radarKey}`] =
            u.raw[
              key === 'asistencia'
                ? 'asistenciasTotales'
                : key === 'participacion'
                  ? 'participacionesTotales'
                  : key === 'puntos'
                    ? 'puntosTrimestre'
                    : key === 'xp'
                      ? 'xpTotal'
                      : key === 'racha'
                        ? 'rachaActual'
                        : 'nivelNumero'
            ];
        });
        return point;
      })
    : [];

  // Get selected user names for badges
  const selectedNames = selectedUsuarios
    .map((id) => usuariosData?.data.find((u) => u.id === id))
    .filter(Boolean);

  // Available categories from desglose
  const categorias = comparacion?.desglose.map((d) => d.categoria) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale className="w-7 h-7 text-blue-600" />
          Comparar Participantes
        </h1>
        <p className="text-gray-500 mt-1">
          Selecciona 2-5 participantes para comparar su rendimiento
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Selector de usuarios */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participantes
                </span>
                <Badge variant="outline">
                  {selectedUsuarios.length}/5
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Selected badges */}
              {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedNames.map((u, i) => (
                    <Badge
                      key={u!.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1"
                      style={{ borderLeft: `3px solid ${COLORS[i]}` }}
                    >
                      <span className="text-xs">{u!.nombre.split(' ')[0]}</span>
                      <button
                        onClick={() => handleRemoveUsuario(u!.id)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar participante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* List */}
              <ScrollArea className="h-64 border rounded-lg">
                {loadingUsuarios ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {usuariosFiltrados?.map((usuario) => {
                      const isSelected = selectedUsuarios.includes(usuario.id);
                      const colorIndex = selectedUsuarios.indexOf(usuario.id);
                      return (
                        <div
                          key={usuario.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 ${
                            isSelected ? 'bg-primary/10' : ''
                          } ${!isSelected && selectedUsuarios.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleToggleUsuario(usuario.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleToggleUsuario(usuario.id)
                            }
                            disabled={
                              !isSelected && selectedUsuarios.length >= 5
                            }
                          />
                          {isSelected && colorIndex >= 0 && (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: COLORS[colorIndex],
                              }}
                            />
                          )}
                          <span className="text-sm truncate">
                            {usuario.nombre}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Compare button */}
              <Button
                onClick={handleComparar}
                disabled={selectedUsuarios.length < 2}
                className="w-full"
              >
                <Scale className="w-4 h-4 mr-2" />
                Comparar ({selectedUsuarios.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-6">
          {!shouldCompare && (
            <Card>
              <CardContent className="py-16 text-center text-gray-500">
                <Scale className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  Selecciona participantes y presiona &quot;Comparar&quot;
                </p>
                <p className="text-sm mt-1">
                  Elige entre 2 y 5 participantes para ver su comparación
                </p>
              </CardContent>
            </Card>
          )}

          {shouldCompare && (loadingComparacion || isFetching) && (
            <Card>
              <CardContent className="py-12">
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {comparacion && shouldCompare && !loadingComparacion && (
            <>
              {/* Radar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    Radar de Rendimiento
                  </CardTitle>
                  {comparacion.periodo && (
                    <p className="text-sm text-gray-500">
                      Período: {comparacion.periodo.nombre}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={380}>
                    <RadarChart
                      data={radarData}
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                    >
                      <PolarGrid
                        stroke="#e5e7eb"
                        strokeDasharray="3 3"
                      />
                      <PolarAngleAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickCount={5}
                      />
                      {comparacion.usuarios.map((u, i) => (
                        <Radar
                          key={u.usuarioId}
                          name={u.nombre}
                          dataKey={`user_${u.usuarioId}`}
                          stroke={COLORS[i]}
                          fill={COLORS[i]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <RechartsTooltip content={<RadarTooltipContent />} />
                      <Legend
                        wrapperStyle={{ fontSize: '13px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stats Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 text-gray-500 font-medium">
                            Métrica
                          </th>
                          {comparacion.usuarios.map((u, i) => (
                            <th
                              key={u.usuarioId}
                              className="text-center py-2 px-2 font-medium"
                              style={{ color: COLORS[i] }}
                            >
                              {u.nombre.split(' ')[0]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(RAW_LABELS).map(([key, label]) => (
                          <tr key={key} className="border-b last:border-0">
                            <td className="py-2 px-2 text-gray-600">
                              {label}
                            </td>
                            {comparacion.usuarios.map((u) => {
                              const rawKey =
                                key === 'asistencia'
                                  ? 'asistenciasTotales'
                                  : key === 'participacion'
                                    ? 'participacionesTotales'
                                    : key === 'puntos'
                                      ? 'puntosTrimestre'
                                      : key === 'xp'
                                        ? 'xpTotal'
                                        : key === 'racha'
                                          ? 'rachaActual'
                                          : 'nivelNumero';
                              return (
                                <td
                                  key={u.usuarioId}
                                  className="text-center py-2 px-2 font-mono"
                                >
                                  {u.raw[rawKey as keyof typeof u.raw]}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr>
                          <td className="py-2 px-2 text-gray-600 font-medium">
                            Nivel
                          </td>
                          {comparacion.usuarios.map((u) => (
                            <td
                              key={u.usuarioId}
                              className="text-center py-2 px-2"
                            >
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: u.nivel.color || undefined,
                                  color: u.nivel.color || undefined,
                                }}
                              >
                                {u.nivel.icono} {u.nivel.nombre}
                              </Badge>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Desglose por categoría */}
              {categorias.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Desglose por Categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      defaultValue={categorias[0]}
                      className="w-full"
                    >
                      <TabsList className="w-full flex-wrap h-auto gap-1">
                        {categorias.map((cat) => (
                          <TabsTrigger key={cat} value={cat} className="text-xs">
                            {CATEGORIA_LABELS[cat] || cat}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {comparacion.desglose.map((cat) => (
                        <TabsContent key={cat.categoria} value={cat.categoria}>
                          <div className="space-y-4 mt-4">
                            {cat.acciones.map((accion) => {
                              const barData = comparacion.usuarios.map(
                                (u, i) => ({
                                  nombre: u.nombre.split(' ')[0],
                                  puntos:
                                    accion.valores[u.usuarioId]?.puntos || 0,
                                  cantidad:
                                    accion.valores[u.usuarioId]?.cantidad || 0,
                                  fill: COLORS[i],
                                }),
                              );

                              return (
                                <div key={accion.codigo}>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    {accion.nombre}
                                  </h4>
                                  <ResponsiveContainer
                                    width="100%"
                                    height={
                                      comparacion.usuarios.length * 36 + 40
                                    }
                                  >
                                    <BarChart
                                      data={barData}
                                      layout="vertical"
                                      margin={{
                                        left: 0,
                                        right: 20,
                                        top: 5,
                                        bottom: 5,
                                      }}
                                    >
                                      <CartesianGrid
                                        strokeDasharray="3 3"
                                        horizontal={false}
                                      />
                                      <XAxis type="number" fontSize={11} />
                                      <YAxis
                                        type="category"
                                        dataKey="nombre"
                                        width={80}
                                        fontSize={12}
                                      />
                                      <BarTooltip
                                        formatter={(value: any, _name: any, props: any) => [
                                          `${value} pts (×${props.payload.cantidad})`,
                                          'Puntos',
                                        ]}
                                      />
                                      <Bar
                                        dataKey="puntos"
                                        radius={[0, 4, 4, 0]}
                                        barSize={20}
                                      >
                                        {barData.map((entry, index) => (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={entry.fill}
                                          />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              );
                            })}
                            {cat.acciones.length === 0 && (
                              <p className="text-sm text-gray-400 text-center py-4">
                                Sin datos en esta categoría
                              </p>
                            )}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
