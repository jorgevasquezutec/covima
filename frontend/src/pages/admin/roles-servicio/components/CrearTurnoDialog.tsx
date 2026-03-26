import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TipoRolServicio, MiembroRolServicio } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoRol: TipoRolServicio;
}

function getNextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().split('T')[0];
}

export function CrearTurnoDialog({ open, onOpenChange, tipoRol }: Props) {
  const queryClient = useQueryClient();
  const [semana, setSemana] = useState(getNextSaturday());
  const [selectedMiembroIds, setSelectedMiembroIds] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const { data: miembros = [] } = useQuery({
    queryKey: ['roles-servicio-miembros', tipoRol.id],
    queryFn: () => rolesServicioApi.getMiembros(tipoRol.id),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      rolesServicioApi.createTurno(tipoRol.id, {
        semana,
        miembroIds: selectedMiembroIds,
        notas: notas.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success('Turno creado');
      onOpenChange(false);
      setSelectedMiembroIds([]);
      setNotas('');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Error al crear turno'),
  });

  const toggleMiembro = (id: number) => {
    setSelectedMiembroIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const getMemberName = (m: MiembroRolServicio) =>
    m.usuario?.nombre || m.nombreLibre || 'Sin nombre';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Turno Manual</DialogTitle>
          <DialogDescription>
            {tipoRol.icono} {tipoRol.nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Semana (fecha)</Label>
            <Input
              type="date"
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Personas asignadas</Label>
            {miembros.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay miembros en el pool. Agrega miembros primero desde "Tipos de Rol".
              </p>
            ) : (
              <>
                <Input
                  placeholder="Buscar miembro..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {miembros
                    .filter((m) =>
                      getMemberName(m).toLowerCase().includes(busqueda.toLowerCase()),
                    )
                    .map((m) => (
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
              </>
            )}
            <p className="text-xs text-gray-500">
              {selectedMiembroIds.length} seleccionado(s)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas del turno..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || selectedMiembroIds.length === 0}
          >
            {mutation.isPending ? 'Creando...' : 'Crear Turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
