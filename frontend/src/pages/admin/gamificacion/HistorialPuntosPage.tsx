import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { History, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Filter, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gamificacionApi, usuariosApi } from '@/services/api';
import type { HistorialAdminItem, PeriodoRanking } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIAS = [
  { value: '_all', label: 'Todas las categorías' },
  { value: 'ASISTENCIA', label: 'Asistencia' },
  { value: 'PARTICIPACION', label: 'Participación' },
  { value: 'EVENTO_ESPECIAL', label: 'Evento Especial' },
  { value: 'LOGRO', label: 'Logro' },
  { value: 'BONUS', label: 'Bonus' },
];

const CATEGORIA_COLORES: Record<string, string> = {
  ASISTENCIA: 'bg-green-100 text-green-700',
  PARTICIPACION: 'bg-blue-100 text-blue-700',
  EVENTO_ESPECIAL: 'bg-purple-100 text-purple-700',
  LOGRO: 'bg-yellow-100 text-yellow-700',
  BONUS: 'bg-orange-100 text-orange-700',
  OTRO: 'bg-gray-100 text-gray-700',
};

export default function HistorialPuntosPage() {
  const queryClient = useQueryClient();

  // Filtros
  const [filtros, setFiltros] = useState({
    usuarioId: '_all',
    periodoId: '_all',
    categoria: '_all',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [userComboOpen, setUserComboOpen] = useState(false);

  // Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistorialAdminItem | null>(null);
  const [editForm, setEditForm] = useState({ puntos: 0, xp: 0, descripcion: '' });

  // Queries
  const { data: historial, isLoading } = useQuery({
    queryKey: ['admin-historial', filtros],
    queryFn: () =>
      gamificacionApi.getHistorialAdmin({
        usuarioId: filtros.usuarioId !== '_all' ? parseInt(filtros.usuarioId) : undefined,
        periodoId: filtros.periodoId !== '_all' ? parseInt(filtros.periodoId) : undefined,
        categoria: filtros.categoria !== '_all' ? filtros.categoria : undefined,
        page: filtros.page,
        limit: 15,
      }),
  });

  const { data: periodos } = useQuery({
    queryKey: ['periodos-all'],
    queryFn: () => gamificacionApi.getPeriodos(true),
  });

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-simple'],
    queryFn: () => usuariosApi.getAll(),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { puntos?: number; xp?: number; descripcion?: string } }) =>
      gamificacionApi.updateHistorialEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-historial'] });
      setEditModalOpen(false);
      setSelectedEntry(null);
      toast.success('Registro actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: gamificacionApi.deleteHistorialEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-historial'] });
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      toast.success('Registro eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const handleOpenEdit = (entry: HistorialAdminItem) => {
    setSelectedEntry(entry);
    setEditForm({
      puntos: entry.puntos,
      xp: entry.xp,
      descripcion: entry.descripcion || '',
    });
    setEditModalOpen(true);
  };

  const handleOpenDelete = (entry: HistorialAdminItem) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedEntry) return;
    updateMutation.mutate({
      id: selectedEntry.id,
      data: editForm,
    });
  };

  const handleDelete = () => {
    if (!selectedEntry) return;
    deleteMutation.mutate(selectedEntry.id);
  };

  const handlePageChange = (newPage: number) => {
    setFiltros((prev) => ({ ...prev, page: newPage }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-blue-500" />
            Historial de Puntos
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra y corrige los puntos asignados a los usuarios
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userComboOpen}
                      className="w-full justify-between font-normal"
                    >
                      {filtros.usuarioId === '_all'
                        ? 'Todos los usuarios'
                        : usuarios?.data?.find((u) => u.id.toString() === filtros.usuarioId)?.nombre || 'Seleccionar...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar usuario..." />
                      <CommandList>
                        <CommandEmpty>No se encontró usuario.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="_all"
                            onSelect={() => {
                              setFiltros((prev) => ({ ...prev, usuarioId: '_all', page: 1 }));
                              setUserComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                filtros.usuarioId === '_all' ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            Todos los usuarios
                          </CommandItem>
                          {usuarios?.data?.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.nombre}
                              onSelect={() => {
                                setFiltros((prev) => ({ ...prev, usuarioId: user.id.toString(), page: 1 }));
                                setUserComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  filtros.usuarioId === user.id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {user.nombre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={filtros.periodoId}
                  onValueChange={(value) => setFiltros((prev) => ({ ...prev, periodoId: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los períodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos los períodos</SelectItem>
                    {periodos?.map((periodo: PeriodoRanking) => (
                      <SelectItem key={periodo.id} value={periodo.id.toString()}>
                        {periodo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={filtros.categoria}
                  onValueChange={(value) => setFiltros((prev) => ({ ...prev, categoria: value, page: 1 }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => setFiltros({ usuarioId: '_all', periodoId: '_all', categoria: '_all', page: 1 })}
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de historial */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead className="text-center">Puntos</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial?.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={entry.usuario.fotoUrl} />
                        <AvatarFallback>
                          {entry.usuario.nombre.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{entry.usuario.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={CATEGORIA_COLORES[entry.categoria] || CATEGORIA_COLORES.OTRO}>
                        {entry.categoria}
                      </Badge>
                      <span className="text-sm">{entry.accion}</span>
                      {entry.descripcion && (
                        <span className="text-xs text-muted-foreground">{entry.descripcion}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono font-medium ${entry.puntos > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.puntos > 0 ? '+' : ''}{entry.puntos}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono font-medium ${entry.xp > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {entry.xp > 0 ? '+' : ''}{entry.xp}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.fecha), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {entry.periodo ? (
                      <Badge variant="outline">{entry.periodo.nombre}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(entry)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(entry)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!historial?.items || historial.items.length === 0) && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron registros</p>
            </div>
          )}

          {/* Paginación */}
          {historial && historial.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((historial.page - 1) * historial.limit) + 1} -{' '}
                {Math.min(historial.page * historial.limit, historial.total)} de {historial.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(historial.page - 1)}
                  disabled={historial.page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Página {historial.page} de {historial.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(historial.page + 1)}
                  disabled={historial.page >= historial.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Usuario</p>
                <p className="font-medium">{selectedEntry.usuario.nombre}</p>
                <p className="text-sm text-muted-foreground mt-2">Acción</p>
                <p className="font-medium">{selectedEntry.accion}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puntos</Label>
                  <Input
                    type="number"
                    value={editForm.puntos}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, puntos: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>XP</Label>
                  <Input
                    type="number"
                    value={editForm.xp}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional..."
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Los totales del usuario se actualizarán automáticamente y su nivel puede cambiar.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEntry && (
                <>
                  Se eliminarán <strong>{selectedEntry.puntos} puntos</strong> y{' '}
                  <strong>{selectedEntry.xp} XP</strong> del usuario{' '}
                  <strong>{selectedEntry.usuario.nombre}</strong>.
                  <br />
                  <br />
                  Esta acción actualizará los totales del usuario y puede afectar su nivel.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
