import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  ArrowLeft,
  BookOpen,
  Phone,
  MapPin,
  Calendar,
  Award,
  Trash2,
  Check,
  Pencil,
} from 'lucide-react';
import { estudiosBiblicosApi } from '@/services/api';
import { toast } from 'sonner';
import { DatePickerString } from '@/components/ui/date-picker';

export default function EstudianteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bautismoModalOpen, setBautismoModalOpen] = useState(false);
  const [fechaBautismo, setFechaBautismo] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    telefono: '',
    direccion: '',
    estadoCivil: '',
    notas: '',
  });

  // Query
  const { data: estudiante, isLoading } = useQuery({
    queryKey: ['estudiante', id],
    queryFn: () => estudiosBiblicosApi.getEstudiante(parseInt(id!)),
    enabled: !!id,
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: ({ leccion }: { leccion: number }) =>
      estudiosBiblicosApi.toggleLeccion(parseInt(id!), leccion),
    onMutate: async ({ leccion }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['estudiante', id] });
      const previous = queryClient.getQueryData(['estudiante', id]);

      queryClient.setQueryData(['estudiante', id], (old: any) => {
        if (!old?.lecciones) return old;
        return {
          ...old,
          lecciones: old.lecciones.map((l: any) =>
            l.numero === leccion
              ? { ...l, completada: !l.completada, fechaCompletada: new Date().toISOString() }
              : l
          ),
          leccionesCompletadas: old.lecciones.filter((l: any) =>
            l.numero === leccion ? !l.completada : l.completada
          ).length,
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['estudiante', id], context?.previous);
      toast.error('Error al actualizar lección');
    },
    onSuccess: (data) => {
      // Mostrar puntos ganados si hay gamificación
      if (data.gamificacion) {
        toast.success(
          `${data.message} (+${data.gamificacion.puntosAsignados} pts, +${data.gamificacion.xpAsignado} XP)`,
          { icon: '🎮' }
        );
      } else {
        toast.success(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ['mis-estudiantes'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-estudios'] });
      queryClient.invalidateQueries({ queryKey: ['mi-progreso'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof estudiosBiblicosApi.updateEstudiante>[1]) =>
      estudiosBiblicosApi.updateEstudiante(parseInt(id!), data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudiante', id] });
      queryClient.invalidateQueries({ queryKey: ['mis-estudiantes'] });
      queryClient.invalidateQueries({ queryKey: ['mi-progreso'] });

      // Si es un bautismo, mostrar mensaje especial con puntos
      if (variables.fechaBautismo) {
        toast.success('Bautismo registrado (+50 pts, +100 XP)', {
          icon: '🎉',
          duration: 5000,
        });
      } else {
        toast.success('Estudiante actualizado');
      }
      setBautismoModalOpen(false);
      setEditModalOpen(false);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => estudiosBiblicosApi.deleteEstudiante(parseInt(id!)),
    onSuccess: () => {
      toast.success('Estudiante eliminado');
      navigate('/mis-estudiantes');
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });

  const handleToggleLeccion = (leccion: number) => {
    toggleMutation.mutate({ leccion });
  };

  const handleMarcarBautismo = () => {
    if (!fechaBautismo) {
      toast.error('Selecciona la fecha de bautismo');
      return;
    }
    updateMutation.mutate({ fechaBautismo });
  };

  const handleOpenEditModal = () => {
    setEditForm({
      telefono: estudiante?.telefono || '',
      direccion: estudiante?.direccion || '',
      estadoCivil: estudiante?.estadoCivil || '',
      notas: estudiante?.notas || '',
    });
    setEditModalOpen(true);
  };

  const handleGuardarInfo = () => {
    const data: Record<string, string> = {};
    if (editForm.telefono) data.telefono = editForm.telefono;
    if (editForm.direccion) data.direccion = editForm.direccion;
    if (editForm.estadoCivil) data.estadoCivil = editForm.estadoCivil;
    if (editForm.notas) data.notas = editForm.notas;
    updateMutation.mutate(data);
  };

  // Color por sección de lecciones (como en la plantilla física)
  const getLeccionColor = (num: number, completada: boolean) => {
    if (!completada) return 'bg-gray-100 text-gray-400 border-gray-200';
    if (num <= 8) return 'bg-rose-100 text-rose-700 border-rose-300';
    if (num <= 14) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!estudiante) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Estudiante no encontrado</p>
        <Button onClick={() => navigate('/mis-estudiantes')} className="mt-4">
          Volver
        </Button>
      </div>
    );
  }

  const porcentaje = estudiante.lecciones
    ? Math.round(
        (estudiante.lecciones.filter((l) => l.completada).length /
          estudiante.lecciones.length) *
          100
      )
    : 0;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/mis-estudiantes')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {estudiante.nombre}
            </h1>
            {estudiante.fechaBautismo && (
              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
                <Award className="h-3 w-3 mr-1" />
                Bautizado
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{estudiante.curso.nombre}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className="h-5 w-5 text-gray-400" />
        </Button>
      </div>

      {/* Main Content - Two column layout on desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left Column - Lessons (takes 3 cols on desktop) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Progress Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Progreso</span>
                <span className="text-2xl font-bold text-blue-700">{porcentaje}%</span>
              </div>
              <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="text-sm text-blue-600 mt-2">
                {estudiante.leccionesCompletadas || 0} de {estudiante.lecciones?.length || 0} lecciones completadas
              </p>
            </CardContent>
          </Card>

          {/* Lessons Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Lecciones
              </CardTitle>
              <p className="text-sm text-gray-500">Toca una lección para marcarla</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 sm:grid-cols-10 xl:grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5 sm:gap-2">
                {estudiante.lecciones?.map((leccion) => (
                  <button
                    key={leccion.numero}
                    onClick={() => handleToggleLeccion(leccion.numero)}
                    disabled={toggleMutation.isPending}
                    className={`
                      relative h-10 sm:h-11 lg:h-10 w-full rounded-lg border-2 font-bold text-sm
                      transition-all duration-200 active:scale-95
                      flex items-center justify-center
                      ${getLeccionColor(leccion.numero, leccion.completada)}
                      ${toggleMutation.isPending ? 'opacity-50' : 'hover:shadow-md'}
                    `}
                  >
                    {leccion.completada && (
                      <Check className="absolute top-0.5 right-0.5 h-3 w-3" />
                    )}
                    {leccion.numero}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-rose-100 border border-rose-300" />
                  <span className="text-gray-600">1-8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
                  <span className="text-gray-600">9-14</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300" />
                  <span className="text-gray-600">15-20</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200" />
                  <span className="text-gray-600">Pendiente</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info (1 col on desktop) */}
        <div className="space-y-4">
          {/* Student Info */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Información</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenEditModal}>
                <Pencil className="h-4 w-4 text-gray-400" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {estudiante.telefono && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{estudiante.telefono}</span>
                </div>
              )}
              {estudiante.direccion && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{estudiante.direccion}</span>
                </div>
              )}
              {estudiante.estadoCivil && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">Estado civil:</span>
                  <span>{estudiante.estadoCivil}</span>
                </div>
              )}
              {estudiante.notas && (
                <div className="text-sm">
                  <span className="text-gray-500">Notas:</span>
                  <p className="text-gray-700 mt-0.5">{estudiante.notas}</p>
                </div>
              )}
              {estudiante.fechaBautismo && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-green-700">
                    Bautizado el {new Date(estudiante.fechaBautismo).toLocaleDateString('es-PE')}
                  </span>
                </div>
              )}
              {!estudiante.telefono && !estudiante.direccion && !estudiante.estadoCivil && !estudiante.notas && !estudiante.fechaBautismo && (
                <p className="text-sm text-gray-400">Sin información adicional</p>
              )}
            </CardContent>
          </Card>

          {/* Baptism Button */}
          {!estudiante.fechaBautismo && (
            <Button
              onClick={() => {
                setFechaBautismo(new Date().toISOString().split('T')[0]);
                setBautismoModalOpen(true);
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Award className="h-4 w-4 mr-2" />
              Registrar Bautismo
            </Button>
          )}
        </div>
      </div>

      {/* Baptism Modal */}
      <Dialog open={bautismoModalOpen} onOpenChange={setBautismoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Bautismo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Fecha de bautismo</Label>
            <DatePickerString
              value={fechaBautismo}
              onChange={setFechaBautismo}
              placeholder="Seleccionar fecha"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBautismoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMarcarBautismo}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Award className="h-4 w-4 mr-2" />
              Confirmar Bautismo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Info Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Información</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                type="tel"
                value={editForm.telefono}
                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                placeholder="Ej: 999 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={editForm.direccion}
                onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                placeholder="Ej: Av. Principal 123"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado civil</Label>
              <Select
                value={editForm.estadoCivil}
                onValueChange={(value) => setEditForm({ ...editForm, estadoCivil: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Soltero">Soltero(a)</SelectItem>
                  <SelectItem value="Casado">Casado(a)</SelectItem>
                  <SelectItem value="Viudo">Viudo(a)</SelectItem>
                  <SelectItem value="Divorciado">Divorciado(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editForm.notas}
                onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarInfo} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Estudiante</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a {estudiante.nombre}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
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
