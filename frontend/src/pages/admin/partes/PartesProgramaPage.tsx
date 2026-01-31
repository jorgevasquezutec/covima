import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LayoutList, Plus, Edit2, Trash2, GripVertical, Star, Lock } from 'lucide-react';
import { programasApi } from '@/services/api';
import type { Parte, CreateParteRequest } from '@/types';
import { toast } from 'sonner';

export default function PartesProgramaPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [parteToDelete, setParteToDelete] = useState<Parte | null>(null);
  const [editingParte, setEditingParte] = useState<Parte | null>(null);
  const [formData, setFormData] = useState<CreateParteRequest>({
    nombre: '',
    descripcion: '',
    orden: 1,
    esFija: false,
    esObligatoria: false,
    textoFijo: '',
    puntos: 0,
    xp: 0,
  });

  const { data: partes, isLoading } = useQuery({
    queryKey: ['partes-all'],
    queryFn: programasApi.getAllPartes,
  });

  const crearMutation = useMutation({
    mutationFn: programasApi.createParte,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes-all'] });
      toast.success('Parte creada exitosamente');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear parte');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Parte> }) =>
      programasApi.updateParte(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes-all'] });
      toast.success('Parte actualizada');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al actualizar parte');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: programasApi.deleteParte,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes-all'] });
      toast.success('Parte desactivada');
      setDeleteDialogOpen(false);
      setParteToDelete(null);
    },
    onError: () => {
      toast.error('Error al eliminar parte');
    },
  });

  const handleOpenCreate = () => {
    setEditingParte(null);
    const maxOrden = partes?.reduce((max, p) => Math.max(max, p.orden), 0) || 0;
    setFormData({
      nombre: '',
      descripcion: '',
      orden: maxOrden + 1,
      esFija: false,
      esObligatoria: false,
      textoFijo: '',
      puntos: 0,
      xp: 0,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (parte: Parte) => {
    setEditingParte(parte);
    setFormData({
      nombre: parte.nombre,
      descripcion: parte.descripcion || '',
      orden: parte.orden,
      esFija: parte.esFija,
      esObligatoria: parte.esObligatoria,
      textoFijo: parte.textoFijo || '',
      puntos: parte.puntos,
      xp: parte.xp,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingParte(null);
  };

  const handleSubmit = () => {
    if (!formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }

    if (editingParte) {
      actualizarMutation.mutate({
        id: editingParte.id,
        data: formData,
      });
    } else {
      crearMutation.mutate(formData);
    }
  };

  const handleToggleActivo = (parte: Parte) => {
    actualizarMutation.mutate({
      id: parte.id,
      data: { activo: !parte.activo },
    });
  };

  const handleDelete = (parte: Parte) => {
    setParteToDelete(parte);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (parteToDelete) {
      eliminarMutation.mutate(parteToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutList className="w-6 h-6" />
            Partes del Programa
          </h1>
          <p className="text-muted-foreground text-sm">
            Configura las partes disponibles para los programas y sus puntos de gamificación
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Parte
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Parte</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partes?.map((parte) => (
                <TableRow key={parte.id} className={!parte.activo ? 'opacity-50' : ''}>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4 text-gray-300" />
                      {parte.orden}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{parte.nombre}</p>
                        {parte.esObligatoria && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                        {parte.esFija && (
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                      {parte.descripcion && (
                        <p className="text-xs text-muted-foreground">{parte.descripcion}</p>
                      )}
                      {parte.esFija && parte.textoFijo && (
                        <p className="text-xs text-blue-600 mt-1">Texto fijo: {parte.textoFijo}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{parte.puntos} pts</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">{parte.xp} XP</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {parte.esObligatoria && (
                        <Badge variant="outline" className="text-xs">Obligatoria</Badge>
                      )}
                      {parte.esFija && (
                        <Badge variant="outline" className="text-xs">Fija</Badge>
                      )}
                      {!parte.esObligatoria && !parte.esFija && (
                        <span className="text-xs text-muted-foreground">Opcional</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={parte.activo}
                      onCheckedChange={() => handleToggleActivo(parte)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(parte)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(parte)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {partes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay partes configuradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingParte ? 'Editar Parte' : 'Nueva Parte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Tema Central"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción de la parte..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Puntos</Label>
                <Input
                  type="number"
                  value={formData.puntos}
                  onChange={(e) => setFormData({ ...formData, puntos: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>XP</Label>
                <Input
                  type="number"
                  value={formData.xp}
                  onChange={(e) => setFormData({ ...formData, xp: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Parte obligatoria</Label>
                  <p className="text-xs text-muted-foreground">Siempre aparece en nuevos programas</p>
                </div>
                <Switch
                  checked={formData.esObligatoria}
                  onCheckedChange={(checked) => setFormData({ ...formData, esObligatoria: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Parte fija</Label>
                  <p className="text-xs text-muted-foreground">Tiene texto fijo (ej: himno)</p>
                </div>
                <Switch
                  checked={formData.esFija}
                  onCheckedChange={(checked) => setFormData({ ...formData, esFija: checked })}
                />
              </div>
            </div>

            {formData.esFija && (
              <div className="space-y-2">
                <Label>Texto fijo</Label>
                <Input
                  value={formData.textoFijo}
                  onChange={(e) => setFormData({ ...formData, textoFijo: e.target.value })}
                  placeholder="ej: Himno Adventista #XXX"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              {editingParte ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar parte?</AlertDialogTitle>
            <AlertDialogDescription>
              La parte "{parteToDelete?.nombre}" será desactivada y no aparecerá en la lista de
              partes disponibles para los programas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
