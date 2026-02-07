import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Star, Plus, Edit2, Trash2, Users, Zap, RefreshCw, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { gamificacionApi } from '@/services/api';
import type { NivelBiblico, ActualizarNivelRequest } from '@/types';
import { toast } from 'sonner';

const ICONOS_SUGERIDOS = ['📖', '🙏', '🎵', '💡', '🏆', '👑', '🦁', '🕊️', '✨', '⭐', '🔥', '💎', '🌟', '👼'];
const COLORES_SUGERIDOS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#6366F1', '#14B8A6', '#F97316'];

// Fórmula de XP: debe coincidir con el backend
// XP = base * (nivel - 1)^2
const calcularXpParaNivel = (numeroNivel: number, base: number = 100): number => {
  if (numeroNivel <= 1) return 0;
  return base * Math.pow(numeroNivel - 1, 2);
};

interface FormData {
  numero: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
}

const initialFormData: FormData = {
  numero: 1,
  nombre: '',
  descripcion: '',
  icono: '📖',
  color: '#3B82F6',
};

export default function NivelesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nivelToDelete, setNivelToDelete] = useState<NivelBiblico | null>(null);
  const [nivelToEdit, setNivelToEdit] = useState<NivelBiblico | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: niveles, isLoading } = useQuery({
    queryKey: ['niveles-admin'],
    queryFn: () => gamificacionApi.getNiveles(true),
  });

  const crearMutation = useMutation({
    mutationFn: gamificacionApi.crearNivel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['niveles'] });
      setModalOpen(false);
      resetForm();
      toast.success('Nivel creado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear nivel');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActualizarNivelRequest }) =>
      gamificacionApi.actualizarNivel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['niveles'] });
      setModalOpen(false);
      resetForm();
      toast.success('Nivel actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar nivel');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: gamificacionApi.eliminarNivel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['niveles'] });
      setDeleteDialogOpen(false);
      setNivelToDelete(null);
      toast.success('Nivel eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar nivel');
    },
  });

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      gamificacionApi.actualizarNivel(id, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['niveles'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    },
  });

  const recalcularXpMutation = useMutation({
    mutationFn: gamificacionApi.recalcularXpNiveles,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['niveles-admin'] });
      queryClient.invalidateQueries({ queryKey: ['niveles'] });
      toast.success(data.mensaje);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al recalcular XP');
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setNivelToEdit(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    // Sugerir el siguiente número
    if (niveles && niveles.length > 0) {
      const maxNumero = Math.max(...niveles.map((n) => n.numero));
      setFormData((prev) => ({ ...prev, numero: maxNumero + 1 }));
    }
    setModalOpen(true);
  };

  const handleOpenEdit = (nivel: NivelBiblico) => {
    setNivelToEdit(nivel);
    setFormData({
      numero: nivel.numero,
      nombre: nivel.nombre,
      descripcion: nivel.descripcion || '',
      icono: nivel.icono || '📖',
      color: nivel.color || '#3B82F6',
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (nivelToEdit) {
      actualizarMutation.mutate({
        id: nivelToEdit.id,
        data: {
          numero: formData.numero,
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          icono: formData.icono || undefined,
          color: formData.color || undefined,
        },
      });
    } else {
      crearMutation.mutate({
        numero: formData.numero,
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        icono: formData.icono || undefined,
        color: formData.color || undefined,
      });
    }
  };

  const handleDelete = (nivel: NivelBiblico) => {
    setNivelToDelete(nivel);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const nivelesSorted = niveles ? [...niveles].sort((a, b) => a.numero - b.numero) : [];
  const xpCalculado = calcularXpParaNivel(formData.numero);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Niveles Bíblicos
          </h1>
          <p className="text-gray-500 mt-1">
            Configura los niveles de progresión del sistema de gamificación
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Nivel
        </Button>
      </div>

      {/* Info de fórmula */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2 text-sm text-blue-700">
              <Zap className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>XP Automático:</strong>{' '}
                <span className="hidden sm:inline">El XP se calcula con la fórmula </span>
                <code className="bg-blue-100 px-1 rounded text-xs">100 × (nivel - 1)²</code>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalcularXpMutation.mutate()}
              disabled={recalcularXpMutation.isPending}
              className="text-blue-700 border-blue-300 hover:bg-blue-100 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${recalcularXpMutation.isPending ? 'animate-spin' : ''}`} />
              {recalcularXpMutation.isPending ? 'Recalculando...' : 'Recalcular XP'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview de la ruta de niveles */}
      <Card className="hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vista Previa - Ruta de Niveles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {nivelesSorted.filter(n => n.activo).map((nivel, idx, arr) => (
              <div key={nivel.id} className="flex items-center">
                <div
                  className="flex flex-col items-center p-2 rounded-lg min-w-[80px]"
                  style={{ backgroundColor: `${nivel.color}15` }}
                >
                  <span className="text-2xl">{nivel.icono}</span>
                  <span className="text-xs font-medium mt-1" style={{ color: nivel.color }}>
                    {nivel.nombre}
                  </span>
                  <span className="text-xs text-muted-foreground">{nivel.xpRequerido.toLocaleString()} XP</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="w-8 h-0.5 bg-muted mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de niveles */}
      <Card>
        <CardContent className="pt-6 px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm pl-3 sm:pl-4">Nivel</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell w-24">XP</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden md:table-cell w-20">
                  <Users className="w-4 h-4 mx-auto" />
                </TableHead>
                <TableHead className="text-center text-xs sm:text-sm w-14">
                  <span className="hidden sm:inline">Estado</span>
                  <span className="sm:hidden">Act.</span>
                </TableHead>
                <TableHead className="w-10 pr-2 sm:pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nivelesSorted.map((nivel) => (
                <TableRow key={nivel.id} className={!nivel.activo ? 'opacity-50' : ''}>
                  {/* Nivel: # + Icon + Name + Description + XP/Users on mobile */}
                  <TableCell className="pl-3 sm:pl-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${nivel.color}20` }}
                      >
                        {nivel.icono}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">#{nivel.numero}</span>
                          <p className="font-medium text-sm truncate" style={{ color: nivel.color }}>
                            {nivel.nombre}
                          </p>
                        </div>
                        {nivel.descripcion && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                            {nivel.descripcion}
                          </p>
                        )}
                        {/* XP and Users on mobile */}
                        <div className="sm:hidden flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono font-medium">{nivel.xpRequerido.toLocaleString()} XP</span>
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {nivel._count?.usuariosEnNivel || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* XP - hidden on mobile */}
                  <TableCell className="text-center font-mono text-sm hidden sm:table-cell">
                    {nivel.xpRequerido.toLocaleString()}
                  </TableCell>

                  {/* Usuarios - hidden on mobile/tablet */}
                  <TableCell className="text-center hidden md:table-cell">
                    <Badge variant="outline" className="gap-1">
                      <Users className="w-3 h-3" />
                      {nivel._count?.usuariosEnNivel || 0}
                    </Badge>
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Switch
                      checked={nivel.activo}
                      onCheckedChange={(checked) =>
                        toggleActivoMutation.mutate({ id: nivel.id, activo: checked })
                      }
                    />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="pr-2 sm:pr-4">
                    {/* Desktop */}
                    <div className="hidden sm:flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(nivel)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(nivel)}
                        disabled={(nivel._count?.usuariosEnNivel || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* Mobile dropdown */}
                    <div className="sm:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(nivel)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(nivel)}
                            disabled={(nivel._count?.usuariosEnNivel || 0) > 0}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {nivelesSorted.length === 0 && (
            <div className="text-center py-12">
              <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay niveles configurados</p>
              <Button className="mt-4" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer nivel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {nivelToEdit ? 'Editar Nivel' : 'Nuevo Nivel'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview del nivel */}
            <div className="flex justify-center">
              <div
                className="flex flex-col items-center p-4 rounded-xl"
                style={{ backgroundColor: `${formData.color}15` }}
              >
                <span className="text-4xl">{formData.icono}</span>
                <span className="font-semibold mt-2" style={{ color: formData.color }}>
                  {formData.nombre || 'Nombre'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Nivel {formData.numero}
                </span>
                <Badge variant="secondary" className="mt-2 gap-1">
                  <Zap className="w-3 h-3" />
                  {xpCalculado.toLocaleString()} XP
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Número de Nivel</Label>
              <Input
                type="number"
                min={1}
                value={formData.numero}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, numero: parseInt(e.target.value) || 1 }))
                }
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-muted-foreground">
                XP requerido: <strong>{xpCalculado.toLocaleString()}</strong> (calculado automáticamente)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nombre del Nivel</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Discípulo, Creyente, Pastor..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción breve del nivel..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONOS_SUGERIDOS.map((icono) => (
                  <button
                    key={icono}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icono }))}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      formData.icono === icono
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {icono}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES_SUGERIDOS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              onClick={handleSubmit}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
              className="w-full sm:w-auto"
            >
              {crearMutation.isPending || actualizarMutation.isPending
                ? 'Guardando...'
                : nivelToEdit
                  ? 'Actualizar'
                  : 'Crear'}
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nivel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el nivel "{nivelToDelete?.nombre}" permanentemente.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nivelToDelete && eliminarMutation.mutate(nivelToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {eliminarMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
