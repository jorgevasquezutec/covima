import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TipoRolServicio } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit2, Trash2, Users, MoreVertical } from 'lucide-react';
import { TipoRolForm } from './TipoRolForm';
import { MiembrosPoolDialog } from './MiembrosPoolDialog';
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

export function TiposRolTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoRolServicio | null>(null);
  const [miembrosDialogTipo, setMiembrosDialogTipo] = useState<TipoRolServicio | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['roles-servicio-tipos'],
    queryFn: rolesServicioApi.getTipos,
  });

  const deleteMutation = useMutation({
    mutationFn: rolesServicioApi.deleteTipo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
      toast.success('Tipo de rol eliminado');
      setDeleteId(null);
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      rolesServicioApi.updateTipo(id, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
    },
  });

  const handleEdit = (tipo: TipoRolServicio) => {
    setEditingTipo(tipo);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTipo(null);
    setFormOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tipos de Rol</h3>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Tipo
            </Button>
          </div>

          {tipos.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay tipos de rol creados. Crea el primero.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Personas/Turno</TableHead>
                    <TableHead className="hidden sm:table-cell">Coordinador</TableHead>
                    <TableHead className="hidden sm:table-cell">Miembros</TableHead>
                    <TableHead className="hidden sm:table-cell">Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {tipo.icono && <span>{tipo.icono}</span>}
                          <div>
                            <div className="font-medium">{tipo.nombre}</div>
                            {tipo.descripcion && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {tipo.descripcion}
                              </div>
                            )}
                          </div>
                          {tipo.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tipo.color }}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{tipo.personasPorTurno}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {tipo.coordinador?.nombre || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Button
                          variant={(tipo._count?.miembros ?? 0) === 0 ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setMiembrosDialogTipo(tipo)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          {(tipo._count?.miembros ?? 0) === 0
                            ? 'Agregar'
                            : tipo._count?.miembros}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Switch
                          checked={tipo.activo}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: tipo.id, activo: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Desktop */}
                        <div className="hidden sm:flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(tipo)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(tipo.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(tipo)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setMiembrosDialogTipo(tipo)}
                              >
                                Miembros ({tipo._count?.miembros ?? 0})
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(tipo.id)}
                                className="text-red-600"
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TipoRolForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingTipo={editingTipo}
      />

      {miembrosDialogTipo && (
        <MiembrosPoolDialog
          open={!!miembrosDialogTipo}
          onOpenChange={(open) => !open && setMiembrosDialogTipo(null)}
          tipoRol={miembrosDialogTipo}
        />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de rol</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los miembros y turnos asociados. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
