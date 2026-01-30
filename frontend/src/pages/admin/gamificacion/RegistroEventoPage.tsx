import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Gift, Check, Search } from 'lucide-react';
import { gamificacionApi, usuariosApi } from '@/services/api';
import { DatePickerString } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function RegistroEventoPage() {
  const [selectedEvento, setSelectedEvento] = useState<string>('');
  const [fecha, setFecha] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUsuarios, setSelectedUsuarios] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: eventos, isLoading: loadingEventos } = useQuery({
    queryKey: ['eventos-especiales'],
    queryFn: gamificacionApi.getEventosEspeciales,
  });

  const { data: usuariosData, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios-gamificacion'],
    queryFn: () => usuariosApi.getAll({ activo: true, limit: 500 }),
  });

  const registrarMutation = useMutation({
    mutationFn: gamificacionApi.registrarEvento,
    onSuccess: (data) => {
      const registrados = data.resultados.filter((r) => r.status === 'registrado').length;
      const yaRegistrados = data.resultados.filter((r) => r.status === 'ya_registrado').length;

      toast.success(
        `Evento registrado: ${registrados} participantes${yaRegistrados > 0 ? ` (${yaRegistrados} ya registrados)` : ''}`
      );

      // Reset form
      setSelectedUsuarios([]);
      setNotas('');
    },
    onError: () => {
      toast.error('Error al registrar evento');
    },
  });

  const eventoSeleccionado = eventos?.find((e) => e.id.toString() === selectedEvento);

  const usuariosFiltrados = usuariosData?.data.filter((u) =>
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleUsuario = (usuarioId: number) => {
    setSelectedUsuarios((prev) =>
      prev.includes(usuarioId) ? prev.filter((id) => id !== usuarioId) : [...prev, usuarioId]
    );
  };

  const handleSelectAll = () => {
    if (usuariosFiltrados) {
      if (selectedUsuarios.length === usuariosFiltrados.length) {
        setSelectedUsuarios([]);
      } else {
        setSelectedUsuarios(usuariosFiltrados.map((u) => u.id));
      }
    }
  };

  const handleSubmit = () => {
    if (!selectedEvento || selectedUsuarios.length === 0) {
      toast.error('Selecciona un evento y al menos un participante');
      return;
    }

    registrarMutation.mutate({
      eventoConfigId: Number(selectedEvento),
      fecha,
      usuarioIds: selectedUsuarios,
      notas: notas || undefined,
    });
  };

  const totalPuntos = eventoSeleccionado ? eventoSeleccionado.puntos * selectedUsuarios.length : 0;

  if (loadingEventos) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="w-6 h-6" />
          Registrar Evento Especial
        </h1>
        <p className="text-muted-foreground text-sm">
          Otorga puntos a los participantes de eventos especiales
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Configuración del evento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalles del Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={selectedEvento} onValueChange={setSelectedEvento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {eventos?.map((evento) => (
                    <SelectItem key={evento.id} value={evento.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{evento.icono}</span>
                        <span>{evento.nombre}</span>
                        <Badge variant="secondary" className="ml-2">
                          {evento.puntos} pts
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eventoSeleccionado && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{eventoSeleccionado.icono}</span>
                  <div>
                    <p className="font-medium">{eventoSeleccionado.nombre}</p>
                    <p className="text-xs text-muted-foreground">{eventoSeleccionado.descripcion}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span>
                    <strong>{eventoSeleccionado.puntos}</strong> puntos
                  </span>
                  <span>
                    <strong>{eventoSeleccionado.xp}</strong> XP
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Fecha del Evento</Label>
              <DatePickerString
                value={fecha}
                onChange={setFecha}
                placeholder="Seleccionar fecha"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones o detalles del evento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Selección de participantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participantes
              </span>
              <Badge variant="outline">{selectedUsuarios.length} seleccionados</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {usuariosFiltrados && selectedUsuarios.length === usuariosFiltrados.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </Button>
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              {loadingUsuarios ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {usuariosFiltrados?.map((usuario) => (
                    <div
                      key={usuario.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 ${
                        selectedUsuarios.includes(usuario.id) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => handleToggleUsuario(usuario.id)}
                    >
                      <Checkbox
                        checked={selectedUsuarios.includes(usuario.id)}
                        onCheckedChange={() => handleToggleUsuario(usuario.id)}
                      />
                      <span className="text-sm">{usuario.nombre}</span>
                      {selectedUsuarios.includes(usuario.id) && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Resumen y botón de registro */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground">Total a otorgar</p>
              <p className="text-2xl font-bold">
                {totalPuntos.toLocaleString()} puntos
                {eventoSeleccionado && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    ({(eventoSeleccionado.xp * selectedUsuarios.length).toLocaleString()} XP)
                  </span>
                )}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedEvento || selectedUsuarios.length === 0 || registrarMutation.isPending}
            >
              {registrarMutation.isPending ? 'Registrando...' : 'Registrar Evento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
