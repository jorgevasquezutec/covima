import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Edit2, Save, X } from 'lucide-react';
import { gamificacionApi, programasApi } from '@/services/api';
import type { ConfiguracionPuntaje, Parte } from '@/types';
import { toast } from 'sonner';

export default function ConfigPuntajesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'config' | 'parte' | null>(null);
  const [editData, setEditData] = useState<{
    puntos: number;
    xp: number;
    nombre: string;
    descripcion: string;
  } | null>(null);

  // Cargar configuraciones de puntaje (ASISTENCIA, BONUS, EVENTO_ESPECIAL)
  const { data: configuraciones, isLoading: loadingConfig } = useQuery({
    queryKey: ['config-puntajes'],
    queryFn: gamificacionApi.getConfigPuntajes,
  });

  // Cargar partes para la sección de Participación
  const { data: partes, isLoading: loadingPartes } = useQuery({
    queryKey: ['partes-all'],
    queryFn: programasApi.getAllPartes,
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof editData }) =>
      gamificacionApi.updateConfigPuntaje(id, data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-puntajes'] });
      toast.success('Configuración actualizada');
      handleCancel();
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const updateParteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { puntos: number; xp: number } }) =>
      programasApi.updateParte(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes-all'] });
      toast.success('Puntos de participación actualizados');
      handleCancel();
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const handleEditConfig = (config: ConfiguracionPuntaje) => {
    setEditingId(config.id);
    setEditingType('config');
    setEditData({
      puntos: config.puntos,
      xp: config.xp,
      nombre: config.nombre,
      descripcion: config.descripcion || '',
    });
  };

  const handleEditParte = (parte: Parte) => {
    setEditingId(parte.id);
    setEditingType('parte');
    setEditData({
      puntos: parte.puntos || 0,
      xp: parte.xp || 0,
      nombre: parte.nombre,
      descripcion: parte.descripcion || '',
    });
  };

  const handleSave = () => {
    if (editingId && editData) {
      if (editingType === 'config') {
        updateConfigMutation.mutate({ id: editingId, data: editData });
      } else if (editingType === 'parte') {
        updateParteMutation.mutate({ id: editingId, data: { puntos: editData.puntos, xp: editData.xp } });
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingType(null);
    setEditData(null);
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'ASISTENCIA':
        return 'bg-blue-100 text-blue-800';
      case 'PARTICIPACION':
        return 'bg-green-100 text-green-800';
      case 'EVENTO_ESPECIAL':
        return 'bg-purple-100 text-purple-800';
      case 'BONUS':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case 'ASISTENCIA':
        return 'Asistencia';
      case 'PARTICIPACION':
        return 'Participación';
      case 'EVENTO_ESPECIAL':
        return 'Evento Especial';
      case 'BONUS':
        return 'Bonus';
      default:
        return categoria;
    }
  };

  // Filtrar configuraciones sin PARTICIPACION (ahora viene de Partes)
  const filteredConfigs = configuraciones?.filter(c => c.categoria !== 'PARTICIPACION');

  // Agrupar por categoría
  const groupedConfigs = filteredConfigs?.reduce(
    (acc, config) => {
      if (!acc[config.categoria]) {
        acc[config.categoria] = [];
      }
      acc[config.categoria].push(config);
      return acc;
    },
    {} as Record<string, ConfiguracionPuntaje[]>
  );

  // Filtrar partes activas y con puntos > 0 o que pueden tener puntos
  const participacionPartes = partes?.filter(p => p.activo && !p.esFija) || [];

  const isLoading = loadingConfig || loadingPartes;
  const isSaving = updateConfigMutation.isPending || updateParteMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Configuración de Puntajes
        </h1>
        <p className="text-gray-500 mt-1">
          Ajusta los puntos y XP que se otorgan por cada acción
        </p>
      </div>

      {/* Sección de Participación - desde Partes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge className={getCategoriaColor('PARTICIPACION')}>{getCategoriaLabel('PARTICIPACION')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Acción</TableHead>
                <TableHead className="text-center text-xs sm:text-sm w-16 sm:w-20">Pts</TableHead>
                <TableHead className="text-center text-xs sm:text-sm w-16 sm:w-20 hidden sm:table-cell">XP</TableHead>
                <TableHead className="w-12 sm:w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participacionPartes.map((parte) => (
                <TableRow key={parte.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{parte.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{parte.descripcion || `Participar en ${parte.nombre.toLowerCase()}`}</p>
                      {/* XP on mobile */}
                      <p className="text-xs text-muted-foreground sm:hidden">{parte.xp || 0} XP</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {editingId === parte.id && editingType === 'parte' ? (
                      <Input
                        type="number"
                        value={editData?.puntos || 0}
                        onChange={(e) =>
                          setEditData((prev) => prev && { ...prev, puntos: Number(e.target.value) })
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-14 sm:w-20 text-center text-sm"
                      />
                    ) : (
                      <span className="font-semibold text-sm">{parte.puntos || 0}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {editingId === parte.id && editingType === 'parte' ? (
                      <Input
                        type="number"
                        value={editData?.xp || 0}
                        onChange={(e) =>
                          setEditData((prev) => prev && { ...prev, xp: Number(e.target.value) })
                        }
                        onFocus={(e) => e.target.select()}
                        className="w-20 text-center"
                      />
                    ) : (
                      <span className="text-muted-foreground">{parte.xp || 0}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === parte.id && editingType === 'parte' ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={isSaving}>
                          <Save className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                          <X className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditParte(parte)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Otras categorías - desde ConfiguracionPuntaje */}
      {groupedConfigs &&
        Object.entries(groupedConfigs).map(([categoria, configs]) => (
          <Card key={categoria}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className={getCategoriaColor(categoria)}>{getCategoriaLabel(categoria)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Acción</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm w-16 sm:w-20">Pts</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm w-16 sm:w-20 hidden sm:table-cell">XP</TableHead>
                    <TableHead className="w-12 sm:w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{config.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{config.descripcion}</p>
                          {/* XP on mobile */}
                          <p className="text-xs text-muted-foreground sm:hidden">{config.xp} XP</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === config.id && editingType === 'config' ? (
                          <Input
                            type="number"
                            value={editData?.puntos || 0}
                            onChange={(e) =>
                              setEditData((prev) => prev && { ...prev, puntos: Number(e.target.value) })
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-14 sm:w-20 text-center text-sm"
                          />
                        ) : (
                          <span className="font-semibold text-sm">{config.puntos}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {editingId === config.id && editingType === 'config' ? (
                          <Input
                            type="number"
                            value={editData?.xp || 0}
                            onChange={(e) =>
                              setEditData((prev) => prev && { ...prev, xp: Number(e.target.value) })
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-20 text-center"
                          />
                        ) : (
                          <span className="text-muted-foreground">{config.xp}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === config.id && editingType === 'config' ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={isSaving}>
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditConfig(config)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
