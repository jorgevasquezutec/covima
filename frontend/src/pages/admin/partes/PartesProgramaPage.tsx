import { useQuery } from '@tanstack/react-query';
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
import { LayoutList, Plus, Edit2, Trash2, Star, Lock, MoreVertical, Camera, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { programasApi } from '@/services/api';
import type { Parte, CreateParteRequest } from '@/types';
import { toast } from 'sonner';
import { useCrudDialog } from '@/hooks/useCrudDialog';
import { useCrudMutations } from '@/hooks/useCrudMutations';

const initialFormData: CreateParteRequest = {
  nombre: '',
  descripcion: '',
  orden: 1,
  esFija: false,
  esObligatoria: false,
  textoFijo: '',
  permiteFotos: false,
  permitirMultiples: false,
  puntos: 0,
  xp: 0,
};

export default function PartesProgramaPage() {
  const { data: partes, isLoading } = useQuery({
    queryKey: ['partes-all'],
    queryFn: programasApi.getAllPartes,
  });

  const dialog = useCrudDialog<CreateParteRequest>({
    initialFormData,
    mapItemToForm: (parte: Parte) => ({
      nombre: parte.nombre,
      descripcion: parte.descripcion || '',
      orden: parte.orden,
      esFija: parte.esFija,
      esObligatoria: parte.esObligatoria,
      textoFijo: parte.textoFijo || '',
      permiteFotos: parte.permiteFotos || false,
      permitirMultiples: parte.permitirMultiples || false,
      puntos: parte.puntos,
      xp: parte.xp,
    }),
  });

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<CreateParteRequest, Partial<Parte>>({
    createFn: programasApi.createParte,
    updateFn: programasApi.updateParte,
    deleteFn: programasApi.deleteParte,
    queryKeys: ['partes-all'],
    onSuccess: dialog.closeModal,
    entityName: 'Parte',
  });

  const handleOpenCreate = () => {
    const maxOrden = partes?.reduce((max, p) => Math.max(max, p.orden), 0) || 0;
    dialog.openCreate({ orden: maxOrden + 1 });
  };

  const handleSubmit = () => {
    if (!dialog.formData.nombre) {
      toast.error('El nombre es requerido');
      return;
    }

    if (dialog.editingItem) {
      updateMutation!.mutate({
        id: dialog.editingItem.id,
        data: dialog.formData,
      });
    } else {
      createMutation!.mutate(dialog.formData);
    }
  };

  const handleToggleActivo = (parte: Parte) => {
    updateMutation!.mutate({
      id: parte.id,
      data: { activo: !parte.activo },
    });
  };

  const confirmDelete = () => {
    if (dialog.itemToDelete) {
      deleteMutation!.mutate(dialog.itemToDelete.id);
      dialog.closeDelete();
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutList className="w-6 h-6 text-blue-600" />
            Partes del Programa
          </h1>
          <p className="text-gray-500 mt-1">
            Configura las partes disponibles para los programas y sus puntos de gamificación
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Parte
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 px-0 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm pl-3 sm:pl-4">Parte</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell w-16">Pts</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden md:table-cell w-16">XP</TableHead>
                <TableHead className="text-center text-xs sm:text-sm w-14">
                  <span className="hidden sm:inline">Estado</span>
                  <span className="sm:hidden">Act.</span>
                </TableHead>
                <TableHead className="w-10 pr-2 sm:pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partes?.map((parte) => (
                <TableRow key={parte.id} className={!parte.activo ? 'opacity-50' : ''}>
                  {/* Parte: # + Name + Icons + Description + Pts/XP on mobile */}
                  <TableCell className="pl-3 sm:pl-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-4 shrink-0">{parte.orden}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="font-medium text-sm">{parte.nombre}</p>
                          {parte.esObligatoria && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
                          )}
                          {parte.esFija && (
                            <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                          )}
                          {parte.permiteFotos && (
                            <Camera className="w-3 h-3 text-blue-500 shrink-0" />
                          )}
                          {parte.permitirMultiples && (
                            <Copy className="w-3 h-3 text-purple-500 shrink-0" />
                          )}
                        </div>
                        {parte.esFija && parte.textoFijo && (
                          <p className="text-[11px] text-blue-600 truncate max-w-[140px] sm:max-w-[250px]">{parte.textoFijo}</p>
                        )}
                        {/* Pts, XP and badges on mobile */}
                        <div className="flex items-center gap-1.5 mt-0.5 sm:hidden flex-wrap">
                          {parte.esObligatoria && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Oblig.</Badge>
                          )}
                          {parte.esFija && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Fija</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{parte.puntos} pts · {parte.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Puntos - hidden on mobile */}
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">{parte.puntos}</Badge>
                  </TableCell>

                  {/* XP - hidden on mobile/tablet */}
                  <TableCell className="text-center hidden md:table-cell">
                    <span className="text-muted-foreground text-sm">{parte.xp}</span>
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Switch
                      checked={parte.activo}
                      onCheckedChange={() => handleToggleActivo(parte)}
                    />
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="pr-2 sm:pr-4">
                    {/* Desktop */}
                    <div className="hidden sm:flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => dialog.openEdit(parte)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => dialog.openDelete(parte)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
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
                          <DropdownMenuItem onClick={() => dialog.openEdit(parte)}>
                            <Edit2 className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => dialog.openDelete(parte)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {partes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay partes configuradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={dialog.modalOpen} onOpenChange={dialog.setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.editingItem ? 'Editar Parte' : 'Nueva Parte'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={dialog.formData.nombre}
                onChange={(e) => dialog.setFormData({ ...dialog.formData, nombre: e.target.value })}
                placeholder="ej: Tema Central"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={dialog.formData.descripcion}
                onChange={(e) => dialog.setFormData({ ...dialog.formData, descripcion: e.target.value })}
                placeholder="Descripción de la parte..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={dialog.formData.orden}
                  onChange={(e) => dialog.setFormData({ ...dialog.formData, orden: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Puntos</Label>
                <Input
                  type="number"
                  value={dialog.formData.puntos}
                  onChange={(e) => dialog.setFormData({ ...dialog.formData, puntos: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>XP</Label>
                <Input
                  type="number"
                  value={dialog.formData.xp}
                  onChange={(e) => dialog.setFormData({ ...dialog.formData, xp: Number(e.target.value) })}
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
                  checked={dialog.formData.esObligatoria}
                  onCheckedChange={(checked) => dialog.setFormData({ ...dialog.formData, esObligatoria: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Parte fija</Label>
                  <p className="text-xs text-muted-foreground">Tiene texto fijo (ej: himno)</p>
                </div>
                <Switch
                  checked={dialog.formData.esFija}
                  onCheckedChange={(checked) => dialog.setFormData({ ...dialog.formData, esFija: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite fotos/videos</Label>
                  <p className="text-xs text-muted-foreground">Se pueden subir fotos y videos en esta parte</p>
                </div>
                <Switch
                  checked={dialog.formData.permiteFotos}
                  onCheckedChange={(checked) => dialog.setFormData({ ...dialog.formData, permiteFotos: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir múltiples</Label>
                  <p className="text-xs text-muted-foreground">Puede aparecer más de una vez en un programa</p>
                </div>
                <Switch
                  checked={dialog.formData.permitirMultiples}
                  onCheckedChange={(checked) => dialog.setFormData({ ...dialog.formData, permitirMultiples: checked })}
                />
              </div>
            </div>

            {dialog.formData.esFija && (
              <div className="space-y-2">
                <Label>Texto fijo</Label>
                <Input
                  value={dialog.formData.textoFijo}
                  onChange={(e) => dialog.setFormData({ ...dialog.formData, textoFijo: e.target.value })}
                  placeholder="ej: Himno Adventista #XXX"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dialog.closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation!.isPending || updateMutation!.isPending}
            >
              {dialog.editingItem ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={dialog.deleteDialogOpen} onOpenChange={dialog.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar parte?</AlertDialogTitle>
            <AlertDialogDescription>
              La parte "{dialog.itemToDelete?.nombre}" será desactivada y no aparecerá en la lista de
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
