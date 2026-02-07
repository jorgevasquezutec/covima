import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Trophy,
  Plus,
  Calendar,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Edit,
  Users,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { gamificacionApi } from '@/services/api';
import type { PeriodoRanking, EstadoRanking } from '@/types';
import { DatePickerString } from '@/components/ui/date-picker';
import { formatDate } from '@/lib/utils';

const estadoConfig: Record<EstadoRanking, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVO: { label: 'Activo', color: 'bg-green-100 text-green-700 border-green-200', icon: <Play className="w-3 h-3" /> },
  PAUSADO: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Pause className="w-3 h-3" /> },
  CERRADO: { label: 'Cerrado', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Square className="w-3 h-3" /> },
};

export default function PeriodosRankingPage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<PeriodoRanking | null>(null);
  const [showCerrarDialog, setShowCerrarDialog] = useState<PeriodoRanking | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<PeriodoRanking | null>(null);
  const [cerrarResult, setCerrarResult] = useState<{
    mensaje: string;
    top3: Array<{ posicion: number; nombre: string; puntosPeriodo: number }>;
  } | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: '',
  });

  const { data: periodos, isLoading } = useQuery({
    queryKey: ['periodos-ranking'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  const createMutation = useMutation({
    mutationFn: gamificacionApi.crearPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      setShowCreateDialog(false);
      setFormData({ nombre: '', descripcion: '', fechaInicio: new Date().toISOString().split('T')[0], fechaFin: '' });
      toast.success('Período creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear período');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => gamificacionApi.actualizarPeriodo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      setShowEditDialog(null);
      toast.success('Período actualizado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const cerrarMutation = useMutation({
    mutationFn: gamificacionApi.cerrarPeriodo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      setShowCerrarDialog(null);
      setCerrarResult({ mensaje: data.mensaje, top3: data.top3 });
      toast.success(data.mensaje);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cerrar período');
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: gamificacionApi.reactivarPeriodo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      toast.success(data.mensaje);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reactivar');
    },
  });

  const pausarMutation = useMutation({
    mutationFn: gamificacionApi.pausarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      toast.success('Período pausado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al pausar');
    },
  });

  const reanudarMutation = useMutation({
    mutationFn: gamificacionApi.reanudarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      toast.success('Período reanudado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reanudar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: gamificacionApi.eliminarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-ranking'] });
      setShowDeleteDialog(null);
      toast.success('Período eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const handleCreate = () => {
    if (!formData.nombre || !formData.fechaInicio) {
      toast.error('El nombre y fecha de inicio son requeridos');
      return;
    }
    createMutation.mutate({
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin || undefined,
    });
  };

  const handleUpdate = () => {
    if (!showEditDialog) return;
    updateMutation.mutate({
      id: showEditDialog.id,
      data: {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        fechaFin: formData.fechaFin || null,
      },
    });
  };

  const periodoActivo = periodos?.find((p) => p.estado === 'ACTIVO');

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-600" />
            Períodos de Ranking
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona los períodos de competencia del sistema de gamificación
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={!!periodoActivo}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Período
        </Button>
      </div>

      {/* Alert si hay período activo */}
      {periodoActivo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Play className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-green-800">
                  Período activo: {periodoActivo.nombre}
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Inicio: {formatDate(periodoActivo.fechaInicio)}
                </p>
                {periodoActivo.fechaFin && (
                  <p className="text-sm text-green-700">
                    Cierre: {formatDate(periodoActivo.fechaFin)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pausarMutation.mutate(periodoActivo.id)}
                disabled={pausarMutation.isPending}
              >
                <Pause className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Pausar</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCerrarDialog(periodoActivo)}
              >
                <Square className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Cerrar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de períodos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Períodos</CardTitle>
          <CardDescription>Todos los períodos de ranking creados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : !periodos?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay períodos de ranking</p>
              <p className="text-sm">Crea el primer período para empezar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {periodos.map((periodo: PeriodoRanking) => (
                <div
                  key={periodo.id}
                  className={`border rounded-lg p-4 ${
                    periodo.estado === 'ACTIVO' ? 'border-green-300 bg-green-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{periodo.nombre}</h3>
                        <Badge className={`${estadoConfig[periodo.estado].color} flex items-center gap-1`}>
                          {estadoConfig[periodo.estado].icon}
                          {estadoConfig[periodo.estado].label}
                        </Badge>
                      </div>
                      {periodo.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2">{periodo.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Inicio: {formatDate(periodo.fechaInicio)}
                        </span>
                        {periodo.fechaFin && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Fin: {formatDate(periodo.fechaFin)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {periodo._count?.historialPuntos || 0} registros
                        </span>
                        {periodo.cerradoAt && (
                          <span>Cerrado: {formatDate(periodo.cerradoAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {periodo.estado === 'ACTIVO' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setFormData({
                                nombre: periodo.nombre,
                                descripcion: periodo.descripcion || '',
                                fechaInicio: periodo.fechaInicio.split('T')[0],
                                fechaFin: periodo.fechaFin?.split('T')[0] || '',
                              });
                              setShowEditDialog(periodo);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {periodo.estado === 'PAUSADO' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reanudarMutation.mutate(periodo.id)}
                          disabled={reanudarMutation.isPending || !!periodoActivo}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Reanudar
                        </Button>
                      )}
                      {periodo.estado === 'CERRADO' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reactivarMutation.mutate(periodo.id)}
                          disabled={reactivarMutation.isPending || !!periodoActivo}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reactivar
                        </Button>
                      )}
                      {(periodo._count?.historialPuntos || 0) === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setShowDeleteDialog(periodo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Mostrar ganadores si está cerrado */}
                  {periodo.estado === 'CERRADO' && periodo.resultadosJson && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Podio Final:</p>
                      <div className="flex gap-4">
                        {(periodo.resultadosJson as any[]).slice(0, 3).map((r: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                            <span className="font-medium">{r.nombre}</span>
                            <span className="text-muted-foreground">({r.puntosPeriodo} pts)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear período */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Período</DialogTitle>
            <DialogDescription>
              Configura un nuevo período de ranking. Solo puede haber un período activo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Ranking Q1 2026"
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional del período"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Inicio *</Label>
                <DatePickerString
                  value={formData.fechaInicio}
                  onChange={(value) => setFormData({ ...formData, fechaInicio: value })}
                  placeholder="Seleccionar fecha"
                />
              </div>
              <div>
                <Label>Fecha Fin (opcional)</Label>
                <DatePickerString
                  value={formData.fechaFin}
                  onChange={(value) => setFormData({ ...formData, fechaFin: value })}
                  placeholder="Seleccionar fecha"
                />
                <p className="text-xs text-muted-foreground mt-1">Para cierre automático</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar período */}
      <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Período</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <DatePickerString
                value={formData.fechaFin}
                onChange={(value) => setFormData({ ...formData, fechaFin: value })}
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar cierre */}
      <AlertDialog open={!!showCerrarDialog} onOpenChange={() => setShowCerrarDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ¿Cerrar período de ranking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará el período <strong>{showCerrarDialog?.nombre}</strong>.
              <br /><br />
              Al cerrar:
              <ul className="list-disc list-inside mt-2">
                <li>Se guardarán los resultados finales (top 10)</li>
                <li>Se resetearán los puntos del período para todos los usuarios</li>
                <li>No se podrán asignar más puntos a este período</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showCerrarDialog && cerrarMutation.mutate(showCerrarDialog.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {cerrarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cerrar Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog resultado cierre */}
      <Dialog open={!!cerrarResult} onOpenChange={() => setCerrarResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Período Cerrado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">{cerrarResult?.mensaje}</p>
            {cerrarResult?.top3 && cerrarResult.top3.length > 0 && (
              <div>
                <p className="font-medium mb-2">Podio Final:</p>
                <div className="space-y-2">
                  {cerrarResult.top3.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <span className="font-medium flex-1">{r.nombre}</span>
                      <span className="font-bold text-purple-600">{r.puntosPeriodo} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setCerrarResult(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminar */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar período?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el período <strong>{showDeleteDialog?.nombre}</strong>.
              Solo se pueden eliminar períodos sin registros de puntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && deleteMutation.mutate(showDeleteDialog.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
