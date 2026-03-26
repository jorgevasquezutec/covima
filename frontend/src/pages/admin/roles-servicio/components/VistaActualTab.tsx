import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesServicioApi } from '@/services/api';
import { toast } from 'sonner';
import type { TipoRolServicio, TurnoRolServicio } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';

// Get current week's Saturday
function getCurrentSaturday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = 6 - day; // Days until Saturday
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + diff);
  return saturday.toISOString().split('T')[0];
}

function TurnoActualCard({ tipo }: { tipo: TipoRolServicio }) {
  const queryClient = useQueryClient();
  const saturday = getCurrentSaturday();

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['roles-servicio-turnos', tipo.id, 'actual'],
    queryFn: () => rolesServicioApi.getTurnos(tipo.id, { desde: saturday, hasta: saturday }),
  });

  const turno: TurnoRolServicio | undefined = turnos[0];

  const notificarMutation = useMutation({
    mutationFn: rolesServicioApi.notificarTurno,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos', tipo.id, 'actual'] });
      toast.success(`${data.totalNotificados} notificacion(es) enviada(s)`);
    },
    onError: () => toast.error('Error al notificar'),
  });

  const completarMutation = useMutation({
    mutationFn: rolesServicioApi.completarTurno,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles-servicio-turnos', tipo.id, 'actual'] });
      toast.success(`Completado. ${data.puntosAsignados} puntos asignados.`);
    },
    onError: () => toast.error('Error al completar'),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const allNotified = turno?.asignaciones.every((a) => a.notificado);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: tipo.color || '#3B82F6' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {tipo.icono && <span className="text-lg">{tipo.icono}</span>}
          {tipo.nombre}
          {turno && (
            <Badge
              variant="secondary"
              className={
                turno.estado === 'COMPLETADO'
                  ? 'bg-green-100 text-green-800'
                  : turno.estado === 'CANCELADO'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
              }
            >
              {turno.estado}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!turno ? (
          <p className="text-sm text-gray-500">No hay turno programado esta semana.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Asignados:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {turno.asignaciones.map((a) => (
                  <Badge key={a.id} variant="outline" className="text-sm">
                    {a.miembro?.usuario?.nombre || a.miembro?.nombreLibre || '?'}
                    {a.notificado && (
                      <CheckCircle className="w-3 h-3 ml-1 text-green-500 inline" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {tipo.opcionesTexto && (
              <div>
                <p className="text-xs font-medium text-gray-500">Materiales/Opciones:</p>
                <p className="text-sm text-gray-600">{tipo.opcionesTexto}</p>
              </div>
            )}

            {tipo.coordinador && (
              <p className="text-xs text-gray-500">
                Coordinador: <span className="font-medium">{tipo.coordinador.nombre}</span>
              </p>
            )}

            {turno.notas && (
              <p className="text-xs text-gray-500 italic">Notas: {turno.notas}</p>
            )}

            {turno.estado === 'PROGRAMADO' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => notificarMutation.mutate(turno.id)}
                  disabled={notificarMutation.isPending}
                >
                  <Bell className="w-4 h-4 mr-1" />
                  {allNotified ? 'Reenviar WhatsApp' : 'Notificar WhatsApp'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => completarMutation.mutate(turno.id)}
                  disabled={completarMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Completar
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VistaActualTab() {
  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['roles-servicio-tipos'],
    queryFn: rolesServicioApi.getTipos,
  });

  const activeTipos = tipos.filter((t) => t.activo);

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  if (activeTipos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No hay tipos de rol activos. Crea uno en la pestana "Tipos de Rol".
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">
        Esta semana — {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {activeTipos.map((tipo) => (
          <TurnoActualCard key={tipo.id} tipo={tipo} />
        ))}
      </div>
    </div>
  );
}
