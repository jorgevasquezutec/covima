import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TurnoRolServicio, MiembroRolServicio } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turno: TurnoRolServicio;
}

export function TurnoEditDialog({ open, onOpenChange, turno }: Props) {
  const queryClient = useQueryClient();

  const [selectedMiembroIds, setSelectedMiembroIds] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [search, setSearch] = useState('');

  const { data: miembros = [] } = useQuery({
    queryKey: ['roles-servicio-miembros', turno.tipoRolId],
    queryFn: () => rolesServicioApi.getMiembros(turno.tipoRolId),
    enabled: open,
  });

  useEffect(() => {
    if (turno) {
      setSelectedMiembroIds(turno.asignaciones.map((a) => a.miembroId));
      setNotas(turno.notas || '');
    }
  }, [turno]);

  const mutation = useMutation({
    mutationFn: () =>
      rolesServicioApi.updateTurno(turno.id, {
        miembroIds: selectedMiembroIds,
        notas: notas.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success('Turno actualizado');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al actualizar turno'),
  });

  const toggleMiembro = (miembroId: number) => {
    setSelectedMiembroIds((prev) =>
      prev.includes(miembroId)
        ? prev.filter((id) => id !== miembroId)
        : [...prev, miembroId],
    );
  };

  const getMemberName = (m: MiembroRolServicio) =>
    m.usuario?.nombre || m.nombreLibre || 'Sin nombre';

  const filteredMiembros = useMemo(() => {
    if (!search.trim()) return miembros;
    const q = search.toLowerCase();
    return miembros.filter((m) => getMemberName(m).toLowerCase().includes(q));
  }, [miembros, search]);

  const formatDate = (dateStr: string) => {
    const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(raw + 'T12:00:00');
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Turno — {formatDate(turno.semana)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Miembros asignados</Label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar persona..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {filteredMiembros.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedMiembroIds.includes(m.id)}
                    onCheckedChange={() => toggleMiembro(m.id)}
                  />
                  <span className="text-sm">{getMemberName(m)}</span>
                  {!m.usuario && (
                    <span className="text-xs text-gray-400">(externo)</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedMiembroIds.length} seleccionado(s)
            </p>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas opcionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
