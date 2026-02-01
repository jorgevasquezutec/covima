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
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { gamificacionApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import type { EventoEspecialConfig, CrearEventoRequest, ActualizarEventoRequest } from '@/types';
import { toast } from 'sonner';

const ICONOS_DISPONIBLES = ['📅', '📖', '🙏', '⛺', '🏔️', '📢', '🤝', '🎉', '✨', '🌟', '🔥', '💪', '🎯', '🏆'];
const COLORES_DISPONIBLES = ['#DC2626', '#2563EB', '#7C3AED', '#059669', '#0891B2', '#EA580C', '#65A30D', '#DB2777'];

export default function EventosPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('admin');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<EventoEspecialConfig | null>(null);
  const [editingEvento, setEditingEvento] = useState<EventoEspecialConfig | null>(null);
  const [formData, setFormData] = useState<CrearEventoRequest>({
    codigo: '',
    nombre: '',
    descripcion: '',
    puntos: 10,
    xp: 20,
    icono: '📅',
    color: '#2563EB',
  });

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

  const crearMutation = useMutation({
    mutationFn: gamificacionApi.crearEvento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-especiales-admin'] });
      toast.success('Evento creado exitosamente');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear evento');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ActualizarEventoRequest }) =>
      gamificacionApi.actualizarEvento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-especiales-admin'] });
      toast.success('Evento actualizado');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al actualizar evento');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: gamificacionApi.eliminarEvento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-especiales-admin'] });
      toast.success('Evento desactivado');
      setDeleteDialogOpen(false);
      setEventoToDelete(null);
    },
    onError: () => {
      toast.error('Error al eliminar evento');
    },
  });

  const handleOpenCreate = () => {
    setEditingEvento(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      puntos: 10,
      xp: 20,
      icono: '📅',
      color: '#2563EB',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (evento: EventoEspecialConfig) => {
    setEditingEvento(evento);
    setFormData({
      codigo: evento.codigo,
      nombre: evento.nombre,
      descripcion: evento.descripcion || '',
      puntos: evento.puntos,
      xp: evento.xp,
      icono: evento.icono || '📅',
      color: evento.color || '#2563EB',
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEvento(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      puntos: 10,
      xp: 20,
      icono: '📅',
      color: '#2563EB',
    });
  };

  const handleSubmit = () => {
    if (!formData.codigo || !formData.nombre || formData.puntos < 0) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    if (editingEvento) {
      actualizarMutation.mutate({
        id: editingEvento.id,
        data: {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          puntos: formData.puntos,
          xp: formData.xp,
          icono: formData.icono,
          color: formData.color,
        },
      });
    } else {
      crearMutation.mutate(formData);
    }
  };

  const handleToggleActivo = (evento: EventoEspecialConfig) => {
    actualizarMutation.mutate({
      id: evento.id,
      data: { activo: !evento.activo },
    });
  };

  const handleDelete = (evento: EventoEspecialConfig) => {
    setEventoToDelete(evento);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (eventoToDelete) {
      eliminarMutation.mutate(eventoToDelete.id);
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
          <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Icono</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">XP</TableHead>
                {isAdmin && <TableHead className="text-center">Estado</TableHead>}
                {isAdmin && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEventos?.map((evento) => (
                <TableRow key={evento.id} className={!evento.activo ? 'opacity-50' : ''}>
                  <TableCell>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${evento.color}20` }}
                    >
                      {evento.icono}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{evento.nombre}</p>
                      <p className="text-xs text-muted-foreground">{evento.codigo}</p>
                      {evento.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1">{evento.descripcion}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{evento.puntos} pts</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">{evento.xp} XP</span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      <Switch
                        checked={evento.activo}
                        onCheckedChange={() => handleToggleActivo(evento)}
                      />
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(evento)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(evento)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {eventos?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8 text-muted-foreground">
                    No hay eventos configurados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvento ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingEvento && (
              <div className="space-y-2">
                <Label>Código único *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s/g, '_') })}
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
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Semana de Oración"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del evento..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntos *</Label>
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

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONOS_DISPONIBLES.map((icono) => (
                  <button
                    key={icono}
                    type="button"
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      formData.icono === icono
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setFormData({ ...formData, icono })}
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
                      formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              {editingEvento ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              El evento "{eventoToDelete?.nombre}" será desactivado y no aparecerá en la lista de
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
