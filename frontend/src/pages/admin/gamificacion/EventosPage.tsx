import { useState } from 'react';
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
import { Calendar, Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { gamificacionApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import type { EventoEspecialConfig, CrearEventoRequest, ActualizarEventoRequest } from '@/types';
import { toast } from 'sonner';
import { useCrudDialog } from '@/hooks/useCrudDialog';
import { useCrudMutations } from '@/hooks/useCrudMutations';

const ICONOS_DISPONIBLES = ['📅', '📖', '🙏', '⛺', '🏔️', '📢', '🤝', '🎉', '✨', '🌟', '🔥', '💪', '🎯', '🏆'];
const COLORES_DISPONIBLES = ['#DC2626', '#2563EB', '#7C3AED', '#059669', '#0891B2', '#EA580C', '#65A30D', '#DB2777'];

const initialFormData: CrearEventoRequest = {
  codigo: '',
  nombre: '',
  descripcion: '',
  puntos: 10,
  xp: 20,
  icono: '📅',
  color: '#2563EB',
};

export default function EventosPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('admin');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: eventos, isLoading } = useQuery({
    queryKey: ['eventos-especiales-admin'],
    queryFn: () => gamificacionApi.getEventosEspeciales(true),
  });

  // Paginación
  const totalPages = eventos ? Math.ceil(eventos.length / itemsPerPage) : 0;
  const paginatedEventos = eventos?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const dialog = useCrudDialog<CrearEventoRequest>({
    initialFormData,
    mapItemToForm: (evento: EventoEspecialConfig) => ({
      codigo: evento.codigo,
      nombre: evento.nombre,
      descripcion: evento.descripcion || '',
      puntos: evento.puntos,
      xp: evento.xp,
      icono: evento.icono || '📅',
      color: evento.color || '#2563EB',
    }),
  });

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<CrearEventoRequest, ActualizarEventoRequest>({
    createFn: gamificacionApi.crearEvento,
    updateFn: gamificacionApi.actualizarEvento,
    deleteFn: gamificacionApi.eliminarEvento,
    queryKeys: ['eventos-especiales-admin'],
    onSuccess: dialog.closeModal,
    entityName: 'Evento',
  });

  const handleSubmit = () => {
    if (!dialog.formData.codigo || !dialog.formData.nombre || dialog.formData.puntos < 0) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    if (dialog.editingItem) {
      updateMutation!.mutate({
        id: dialog.editingItem.id,
        data: {
          nombre: dialog.formData.nombre,
          descripcion: dialog.formData.descripcion,
          puntos: dialog.formData.puntos,
          xp: dialog.formData.xp,
          icono: dialog.formData.icono,
          color: dialog.formData.color,
        },
      });
    } else {
      createMutation!.mutate(dialog.formData);
    }
  };

  const handleToggleActivo = (evento: EventoEspecialConfig) => {
    updateMutation!.mutate({
      id: evento.id,
      data: { activo: !evento.activo },
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
            <Calendar className="w-6 h-6 text-blue-600" />
            Eventos Especiales
          </h1>
          <p className="text-gray-500 mt-1">
            Administra los tipos de eventos que otorgan puntos
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => dialog.openCreate()} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-6 px-0 sm:px-6">
          <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm pl-3 sm:pl-4 w-auto">Evento</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden sm:table-cell w-16">Pts</TableHead>
                <TableHead className="text-center text-xs sm:text-sm hidden md:table-cell w-14">XP</TableHead>
                {isAdmin && <TableHead className="text-center text-xs sm:text-sm w-12">
                  <span className="hidden sm:inline">Activo</span>
                  <span className="sm:hidden">On</span>
                </TableHead>}
                <TableHead className="w-10 pr-2 sm:pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEventos?.map((evento) => (
                <TableRow key={evento.id} className={!evento.activo ? 'opacity-50' : ''}>
                  {/* Evento: Icon + Name + Code + Pts/XP on mobile */}
                  <TableCell className="pl-2 sm:pl-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg flex items-center justify-center text-base sm:text-lg"
                        style={{ backgroundColor: `${evento.color}20` }}
                      >
                        {evento.icono}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate max-w-[120px] sm:max-w-none">{evento.nombre}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{evento.codigo}</p>
                        {evento.descripcion && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[100px] sm:max-w-[250px] hidden sm:block">{evento.descripcion}</p>
                        )}
                        {/* Pts and XP on mobile */}
                        <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                          {evento.puntos} pts · {evento.xp} XP
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Puntos - hidden on mobile */}
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">{evento.puntos}</Badge>
                  </TableCell>

                  {/* XP - hidden on mobile/tablet */}
                  <TableCell className="text-center hidden md:table-cell">
                    <span className="text-muted-foreground text-sm">{evento.xp}</span>
                  </TableCell>

                  {/* Estado */}
                  {isAdmin && (
                    <TableCell className="text-center">
                      <Switch
                        checked={evento.activo}
                        onCheckedChange={() => handleToggleActivo(evento)}
                      />
                    </TableCell>
                  )}

                  {/* Acciones */}
                  <TableCell className="pr-2 sm:pr-4">
                    {isAdmin ? (
                      <>
                        {/* Desktop */}
                        <div className="hidden sm:flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => dialog.openEdit(evento)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => dialog.openDelete(evento)}
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
                              <DropdownMenuItem onClick={() => dialog.openEdit(evento)}>
                                <Edit2 className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => dialog.openDelete(evento)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {eventos?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 3} className="text-center py-8 text-muted-foreground">
                    No hay eventos configurados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, eventos?.length || 0)} de {eventos?.length || 0} eventos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear/Editar */}
      <Dialog open={dialog.modalOpen} onOpenChange={dialog.setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.editingItem ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!dialog.editingItem && (
              <div className="space-y-2">
                <Label>Código único *</Label>
                <Input
                  value={dialog.formData.codigo}
                  onChange={(e) => dialog.setFormData({ ...dialog.formData, codigo: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="ej: semana_oracion"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único, sin espacios
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={dialog.formData.nombre}
                onChange={(e) => dialog.setFormData({ ...dialog.formData, nombre: e.target.value })}
                placeholder="ej: Semana de Oración"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={dialog.formData.descripcion}
                onChange={(e) => dialog.setFormData({ ...dialog.formData, descripcion: e.target.value })}
                placeholder="Descripción del evento..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntos *</Label>
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

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONOS_DISPONIBLES.map((icono) => (
                  <button
                    key={icono}
                    type="button"
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      dialog.formData.icono === icono
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => dialog.setFormData({ ...dialog.formData, icono })}
                  >
                    {icono}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      dialog.formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => dialog.setFormData({ ...dialog.formData, color })}
                  />
                ))}
              </div>
            </div>
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
            <AlertDialogTitle>¿Desactivar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento "{dialog.itemToDelete?.nombre}" será desactivado y no aparecerá en la lista de
              eventos disponibles para registrar.
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
