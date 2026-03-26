import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TipoRolServicio, TurnoRolServicio } from '@/types';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoRol: TipoRolServicio;
  turnos: TurnoRolServicio[];
}

export function GenerarRotacionDialog({ open, onOpenChange, tipoRol, turnos }: Props) {
  const queryClient = useQueryClient();

  const { ultimoTurno, fechaDesdeAuto, ultimosAsignados } = useMemo(() => {
    if (turnos.length === 0) {
      // No turns exist: start from next Saturday
      const d = new Date();
      d.setDate(d.getDate() + (6 - d.getDay() + (d.getDay() === 6 ? 7 : 0)));
      return {
        ultimoTurno: null,
        fechaDesdeAuto: d.toISOString().split('T')[0],
        ultimosAsignados: '',
      };
    }
    // turnos come sorted by semana asc from API
    const ultimo = turnos[turnos.length - 1];
    const nextSat = new Date(ultimo.semana);
    nextSat.setDate(nextSat.getDate() + 7);
    const nombres = ultimo.asignaciones
      ?.map((a) => a.miembro?.usuario?.nombre || a.miembro?.nombreLibre || 'Sin nombre')
      .join(', ') || '';
    return {
      ultimoTurno: ultimo,
      fechaDesdeAuto: nextSat.toISOString().split('T')[0],
      ultimosAsignados: nombres,
    };
  }, [turnos]);

  const getDefaultEndDate = () => {
    const d = new Date(fechaDesdeAuto);
    d.setDate(d.getDate() + 7 * 7); // 8 weeks
    return d.toISOString().split('T')[0];
  };

  const [fechaHasta, setFechaHasta] = useState(getDefaultEndDate());

  const mutation = useMutation({
    mutationFn: () =>
      rolesServicioApi.generarRotacion(tipoRol.id, {
        fechaHasta,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos'] });
      toast.success(`${data.turnosCreados} turnos generados`);
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Error al generar rotacion'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generar Rotacion</DialogTitle>
          <DialogDescription>
            {tipoRol.icono} {tipoRol.nombre} — {tipoRol.personasPorTurno} persona(s)/turno
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm">Desde (auto)</Label>
            <p className="text-sm font-medium mt-1">{fechaDesdeAuto}</p>
            {ultimoTurno && ultimosAsignados && (
              <p className="text-xs text-muted-foreground mt-1">
                Continuara despues de: {ultimosAsignados}
              </p>
            )}
            {!ultimoTurno && (
              <p className="text-xs text-muted-foreground mt-1">
                No hay turnos previos — empezara desde el primer miembro
              </p>
            )}
          </div>

          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Generando...' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
