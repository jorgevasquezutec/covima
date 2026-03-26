import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi, usuariosApi } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TipoRolServicio, MiembroRolServicio } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { GripVertical, Trash2, UserPlus, Plus, Check, ChevronsUpDown } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoRol: TipoRolServicio;
}

export function MiembrosPoolDialog({ open, onOpenChange, tipoRol }: Props) {
  const queryClient = useQueryClient();
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [nombreLibre, setNombreLibre] = useState('');
  const [addMode, setAddMode] = useState<'usuario' | 'libre'>('usuario');
  const [comboOpen, setComboOpen] = useState(false);

  const { data: miembros = [], isLoading } = useQuery({
    queryKey: ['roles-servicio-miembros', tipoRol.id],
    queryFn: () => rolesServicioApi.getMiembros(tipoRol.id),
    enabled: open,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-simple'],
    queryFn: () => usuariosApi.getAll({ activo: true, limit: 200 }),
    select: (data) => data.data,
    enabled: open,
  });

  // Filter out users already in pool
  const miembroUserIds = new Set(miembros.map((m) => m.usuarioId).filter(Boolean));
  const availableUsuarios = usuarios.filter((u) => !miembroUserIds.has(u.id));

  const agregarMutation = useMutation({
    mutationFn: (data: { usuarioId?: number; nombreLibre?: string }) =>
      rolesServicioApi.agregarMiembros(tipoRol.id, [data]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-miembros', tipoRol.id] });
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
      setSelectedUsuarioId(null);
      setNombreLibre('');
      toast.success('Miembro agregado');
    },
    onError: () => toast.error('Error al agregar miembro'),
  });

  const removeMutation = useMutation({
    mutationFn: rolesServicioApi.removeMiembro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-miembros', tipoRol.id] });
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
      toast.success('Miembro removido');
    },
    onError: () => toast.error('Error al remover'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orden: number[]) =>
      rolesServicioApi.reorderMiembros(tipoRol.id, orden),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-miembros', tipoRol.id] });
    },
  });

  const handleAdd = () => {
    if (addMode === 'usuario' && selectedUsuarioId) {
      agregarMutation.mutate({ usuarioId: selectedUsuarioId });
    } else if (addMode === 'libre' && nombreLibre.trim()) {
      agregarMutation.mutate({ nombreLibre: nombreLibre.trim() });
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = miembros.map((m) => m.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === miembros.length - 1) return;
    const newOrder = miembros.map((m) => m.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate(newOrder);
  };

  const getMemberName = (m: MiembroRolServicio) =>
    m.usuario?.nombre || m.nombreLibre || 'Sin nombre';

  const selectedUsuario = usuarios.find((u) => u.id === selectedUsuarioId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tipoRol.icono} Miembros — {tipoRol.nombre}
          </DialogTitle>
        </DialogHeader>

        {/* Add member section */}
        <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
          <div className="flex gap-2">
            <Button
              variant={addMode === 'usuario' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('usuario')}
            >
              <UserPlus className="w-4 h-4 mr-1" /> Usuario
            </Button>
            <Button
              variant={addMode === 'libre' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddMode('libre')}
            >
              <Plus className="w-4 h-4 mr-1" /> Nombre libre
            </Button>
          </div>

          <div className="flex gap-2">
            {addMode === 'usuario' ? (
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="flex-1 justify-between font-normal"
                  >
                    {selectedUsuario?.nombre || 'Buscar persona...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Buscar persona..." />
                    <CommandList>
                      <CommandEmpty>No se encontró usuario.</CommandEmpty>
                      <CommandGroup>
                        {availableUsuarios.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.nombre}
                            onSelect={() => {
                              setSelectedUsuarioId(u.id);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUsuarioId === u.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {u.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                placeholder="Nombre de la persona..."
                value={nombreLibre}
                onChange={(e) => setNombreLibre(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            )}
            <Button
              onClick={handleAdd}
              disabled={agregarMutation.isPending}
              size="sm"
            >
              Agregar
            </Button>
          </div>
        </div>

        {/* Members list */}
        {isLoading ? (
          <p className="text-center text-gray-500 py-4">Cargando...</p>
        ) : miembros.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No hay miembros en el pool. Agrega el primero.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 mb-2">
              {miembros.length} miembros — El orden determina la rotación
            </p>
            {miembros.map((miembro, index) => (
              <div
                key={miembro.id}
                className="flex items-center gap-2 p-2 rounded border bg-white hover:bg-gray-50"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === miembros.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  >
                    ▼
                  </button>
                </div>
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-medium text-gray-500 w-6">
                  {index + 1}.
                </span>
                <span className="flex-1 text-sm">{getMemberName(miembro)}</span>
                {!miembro.usuario && (
                  <span className="text-xs text-gray-400">(externo)</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMutation.mutate(miembro.id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
