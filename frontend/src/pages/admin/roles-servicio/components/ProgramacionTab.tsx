import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TurnoRolServicio } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Calendar, MoreVertical, CheckCircle, Bell, Wand2, Plus, Trash2, Download } from 'lucide-react';
import { GenerarRotacionDialog } from './GenerarRotacionDialog';
import { TurnoEditDialog } from './TurnoEditDialog';
import { CrearTurnoDialog } from './CrearTurnoDialog';
import { generarImagenTurno } from '../utils/generarImagenTurno';

const estadoColors: Record<string, string> = {
  PROGRAMADO: 'bg-blue-100 text-blue-800',
  COMPLETADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
};

export function ProgramacionTab() {
  const queryClient = useQueryClient();
  const [selectedTipoId, setSelectedTipoId] = useState<string>('');
  const [generarOpen, setGenerarOpen] = useState(false);
  const [crearTurnoOpen, setCrearTurnoOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<TurnoRolServicio | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    turnoId: number;
    action: 'completar' | 'eliminar';
  } | null>(null);

  const { data: tipos = [] } = useQuery({
    queryKey: ['roles-servicio-tipos'],
    queryFn: rolesServicioApi.getTipos,
  });

  const tipoId = selectedTipoId ? parseInt(selectedTipoId) : null;
  const selectedTipo = tipos.find((t) => t.id === tipoId);

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['roles-servicio-turnos', tipoId],
    queryFn: () => rolesServicioApi.getTurnos(tipoId!),
    enabled: !!tipoId,
  });

  const completarMutation = useMutation({
    mutationFn: rolesServicioApi.completarTurno,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success(`Turno completado. ${data.puntosAsignados} persona(s) recibieron puntos.`);
      setConfirmAction(null);
    },
    onError: () => toast.error('Error al completar turno'),
  });

  const eliminarMutation = useMutation({
    mutationFn: rolesServicioApi.eliminarTurno,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success('Turno eliminado');
      setConfirmAction(null);
    },
    onError: () => toast.error('Error al eliminar turno'),
  });

  const notificarMutation = useMutation({
    mutationFn: rolesServicioApi.notificarTurno,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success(
        `Notificaciones enviadas: ${data.totalNotificados} OK, ${data.totalErrores} errores`,
      );
    },
    onError: () => toast.error('Error al notificar'),
  });

  const formatDate = (dateStr: string) => {
    const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(raw + 'T12:00:00');
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getMemberNames = (turno: TurnoRolServicio) =>
    turno.asignaciones
      .map((a) => a.miembro?.usuario?.nombre || a.miembro?.nombreLibre || '?')
      .join(', ');

  const getNotifStatus = (turno: TurnoRolServicio) => {
    const total = turno.asignaciones.length;
    const notified = turno.asignaciones.filter((a) => a.notificado).length;
    if (notified === 0) return null;
    if (notified === total) return 'all';
    return 'partial';
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-gray-500" />
              <Select value={selectedTipoId} onValueChange={setSelectedTipoId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Seleccionar tipo de rol..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos
                    .filter((t) => t.activo)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.icono} {t.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {tipoId && (
              <div className="flex gap-2">
                <Button onClick={() => setCrearTurnoOpen(true)} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Turno
                </Button>
                <Button onClick={() => setGenerarOpen(true)} size="sm">
                  <Wand2 className="w-4 h-4 mr-1" /> Generar Rotacion
                </Button>
              </div>
            )}
          </div>

          {!tipoId ? (
            <p className="text-center text-gray-500 py-8">
              Selecciona un tipo de rol para ver los turnos programados.
            </p>
          ) : isLoading ? (
            <p className="text-center text-gray-500 py-8">Cargando turnos...</p>
          ) : turnos.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-gray-500">No hay turnos programados.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setCrearTurnoOpen(true)} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Crear turno manual
                </Button>
                <Button onClick={() => setGenerarOpen(true)} size="sm">
                  <Wand2 className="w-4 h-4 mr-1" /> Generar rotacion automatica
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Asignados</TableHead>
                    <TableHead className="hidden sm:table-cell">Estado</TableHead>
                    <TableHead className="hidden sm:table-cell">Notif.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turnos.map((turno) => {
                    const notifStatus = getNotifStatus(turno);
                    return (
                      <TableRow key={turno.id} className="cursor-pointer" onClick={() => setEditingTurno(turno)}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDate(turno.semana)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{getMemberNames(turno)}</div>
                          {turno.notas && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {turno.notas}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={estadoColors[turno.estado] || ''} variant="secondary">
                            {turno.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {notifStatus === 'all' && (
                            <Badge variant="outline" className="text-green-600">
                              Enviado
                            </Badge>
                          )}
                          {notifStatus === 'partial' && (
                            <Badge variant="outline" className="text-yellow-600">
                              Parcial
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end items-center">
                            {turno.estado === 'PROGRAMADO' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-700 border-green-300 hover:bg-green-50 hidden sm:inline-flex"
                                onClick={() =>
                                  setConfirmAction({
                                    turnoId: turno.id,
                                    action: 'completar',
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Completar
                              </Button>
                            )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTurno(turno)}>
                                Editar asignados
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  generarImagenTurno({
                                    turno,
                                    tipoNombre: selectedTipo?.nombre || '',
                                    tipoIcono: selectedTipo?.icono || undefined,
                                    opcionesTexto: selectedTipo?.opcionesTexto || undefined,
                                    coordinadorNombre: selectedTipo?.coordinador?.nombre || undefined,
                                  })
                                }
                              >
                                <Download className="w-4 h-4 mr-2 text-amber-600" />
                                Descargar imagen
                              </DropdownMenuItem>
                              {turno.estado === 'PROGRAMADO' && (
                                <>
                                  <DropdownMenuItem
                                    className="sm:hidden"
                                    onClick={() =>
                                      setConfirmAction({
                                        turnoId: turno.id,
                                        action: 'completar',
                                      })
                                    }
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    Completar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => notificarMutation.mutate(turno.id)}
                                    disabled={notificarMutation.isPending}
                                  >
                                    <Bell className="w-4 h-4 mr-2 text-blue-500" />
                                    Notificar WhatsApp
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({
                                    turnoId: turno.id,
                                    action: 'eliminar',
                                  })
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {tipoId && selectedTipo && (
        <>
          <GenerarRotacionDialog
            open={generarOpen}
            onOpenChange={setGenerarOpen}
            tipoRol={selectedTipo}
            turnos={turnos}
          />
          <CrearTurnoDialog
            open={crearTurnoOpen}
            onOpenChange={setCrearTurnoOpen}
            tipoRol={selectedTipo}
          />
        </>
      )}

      {editingTurno && (
        <TurnoEditDialog
          open={!!editingTurno}
          onOpenChange={(open) => !open && setEditingTurno(null)}
          turno={editingTurno}
        />
      )}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'completar'
                ? 'Completar turno'
                : 'Eliminar turno'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'completar'
                ? 'Se asignarán puntos de gamificación a los miembros con cuenta registrada.'
                : 'Se eliminará el turno y sus asignaciones. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.action === 'completar') {
                  completarMutation.mutate(confirmAction.turnoId);
                } else {
                  eliminarMutation.mutate(confirmAction.turnoId);
                }
              }}
              className={
                confirmAction?.action === 'eliminar'
                  ? 'bg-red-600 hover:bg-red-700'
                  : undefined
              }
            >
              {confirmAction?.action === 'completar' ? 'Completar' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
