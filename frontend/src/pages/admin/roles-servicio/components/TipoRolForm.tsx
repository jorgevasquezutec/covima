import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi, usuariosApi } from '@/services/api';
import { toast } from 'sonner';
import type { TipoRolServicio } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Check, ChevronsUpDown, SmilePlus } from 'lucide-react';

const EMOJI_OPTIONS = [
  '🧹', '🌸', '🎵', '🎤', '🙏', '📖', '🍞', '☕',
  '🪴', '🕯️', '🎹', '📋', '🔑', '🚗', '👶', '🎨',
  '📷', '🔊', '💡', '🪑', '🧴', '🧽', '🗑️', '✨',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTipo: TipoRolServicio | null;
}

export function TipoRolForm({ open, onOpenChange, editingTipo }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!editingTipo;
  const [coordComboOpen, setCoordComboOpen] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    icono: '',
    color: '#3B82F6',
    personasPorTurno: 1,
    opcionesTexto: '',
    coordinadorId: undefined as number | undefined,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-simple'],
    queryFn: () => usuariosApi.getAll({ activo: true, limit: 200 }),
    select: (data) => data.data,
  });

  useEffect(() => {
    if (editingTipo) {
      setFormData({
        nombre: editingTipo.nombre,
        descripcion: editingTipo.descripcion || '',
        icono: editingTipo.icono || '',
        color: editingTipo.color || '#3B82F6',
        personasPorTurno: editingTipo.personasPorTurno,
        opcionesTexto: editingTipo.opcionesTexto || '',
        coordinadorId: editingTipo.coordinadorId || undefined,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        icono: '',
        color: '#3B82F6',
        personasPorTurno: 1,
        opcionesTexto: '',
        coordinadorId: undefined,
      });
    }
  }, [editingTipo, open]);

  const createMutation = useMutation({
    mutationFn: rolesServicioApi.createTipo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
      toast.success('Tipo de rol creado');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al crear'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      rolesServicioApi.updateTipo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-tipos'] });
      toast.success('Tipo de rol actualizado');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const data = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      icono: formData.icono.trim() || undefined,
      color: formData.color || undefined,
      personasPorTurno: formData.personasPorTurno,
      opcionesTexto: formData.opcionesTexto.trim() || undefined,
      coordinadorId: formData.coordinadorId || undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: editingTipo.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedCoordinador = usuarios.find((u) => u.id === formData.coordinadorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Nuevo'} Tipo de Rol</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Limpieza de Iglesia"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripcion</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripcion del rol..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Icono (emoji)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {formData.icono ? (
                      <span className="text-lg">{formData.icono}</span>
                    ) : (
                      <>
                        <SmilePlus className="w-4 h-4 mr-2 text-gray-400" />
                        Elegir...
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-2" align="start">
                  <div className="grid grid-cols-6 gap-1">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={cn(
                          'text-xl p-1.5 rounded hover:bg-gray-100 transition-colors',
                          formData.icono === emoji && 'bg-gray-200 ring-1 ring-gray-400',
                        )}
                        onClick={() => setFormData({ ...formData, icono: emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <Input
                      value={formData.icono}
                      onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                      placeholder="O escribe uno..."
                      maxLength={10}
                      className="h-8 text-sm"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-9 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Personas por turno</Label>
            <Input
              type="number"
              min={1}
              value={formData.personasPorTurno}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1) setFormData({ ...formData, personasPorTurno: val });
              }}
              onBlur={() => {
                if (!formData.personasPorTurno || formData.personasPorTurno < 1) {
                  setFormData({ ...formData, personasPorTurno: 1 });
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Opciones / Materiales</Label>
            <Textarea
              value={formData.opcionesTexto}
              onChange={(e) => setFormData({ ...formData, opcionesTexto: e.target.value })}
              placeholder="Ej: Escoba, trapeador, desinfectante..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Coordinador</Label>
            <Popover open={coordComboOpen} onOpenChange={setCoordComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={coordComboOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedCoordinador?.nombre || 'Sin coordinador'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput placeholder="Buscar persona..." />
                  <CommandList>
                    <CommandEmpty>No se encontró usuario.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="sin-coordinador"
                        onSelect={() => {
                          setFormData({ ...formData, coordinadorId: undefined });
                          setCoordComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            !formData.coordinadorId ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        Sin coordinador
                      </CommandItem>
                      {usuarios.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.nombre}
                          onSelect={() => {
                            setFormData({ ...formData, coordinadorId: u.id });
                            setCoordComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              formData.coordinadorId === u.id ? 'opacity-100' : 'opacity-0',
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
