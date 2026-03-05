import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { UserPlus, Trash2, MapPin, Loader2, CalendarX, Phone, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { programasApi } from '@/services/api';

interface VisitaForm {
  nombre: string;
  procedencia: string;
  telefono?: string;
  direccion?: string;
}

export default function RegistroVisitasPage() {
  const queryClient = useQueryClient();
  const nombreRef = useRef<HTMLInputElement>(null);
  const [selectedProgramaId, setSelectedProgramaId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VisitaForm>();

  const { data: programasHoy, isLoading } = useQuery({
    queryKey: ['programas-hoy-visitas'],
    queryFn: () => programasApi.getProgramasHoyVisitas(),
    refetchInterval: 30000,
  });

  // Auto-seleccionar: preferir "Culto Divino", si no el primero
  useEffect(() => {
    if (!programasHoy || programasHoy.length === 0) {
      setSelectedProgramaId(null);
      return;
    }
    // Si ya hay uno seleccionado y sigue existiendo, mantenerlo
    if (selectedProgramaId && programasHoy.some((p) => p.id === selectedProgramaId)) {
      return;
    }
    // Buscar "Culto Divino" por defecto
    const cultoDivino = programasHoy.find((p) =>
      p.titulo.toLowerCase().includes('culto divino')
    );
    setSelectedProgramaId(cultoDivino?.id ?? programasHoy[0].id);
  }, [programasHoy, selectedProgramaId]);

  const programaActivo = programasHoy?.find((p) => p.id === selectedProgramaId) ?? null;

  const createMutation = useMutation({
    mutationFn: (data: VisitaForm) =>
      programasApi.createVisita(selectedProgramaId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas-hoy-visitas'] });
      reset();
      toast.success('Visita registrada');
      setTimeout(() => nombreRef.current?.focus(), 100);
    },
    onError: () => {
      toast.error('Error al registrar visita');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (visitaId: number) => programasApi.deleteVisita(visitaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programas-hoy-visitas'] });
      toast.success('Visita eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar visita');
    },
  });

  const onSubmit = (data: VisitaForm) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!programasHoy || programasHoy.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No hay programas hoy</h2>
            <p className="text-sm text-gray-500">
              No se encontraron programas para la fecha de hoy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visitas = programaActivo?.visitas || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Registro de Visitas
          </h1>
          {programasHoy.length === 1 && (
            <p className="text-sm text-gray-500 mt-1">{programasHoy[0].titulo}</p>
          )}
        </div>
        {programasHoy.length > 1 && (
          <Select
            value={selectedProgramaId?.toString() ?? ''}
            onValueChange={(val) => setSelectedProgramaId(Number(val))}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecciona un programa" />
            </SelectTrigger>
            <SelectContent>
              {programasHoy.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Formulario + Lista */}
      {selectedProgramaId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nueva Visita</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Nombre del visitante"
                    className="h-12 text-base mt-1"
                    {...register('nombre', { required: 'El nombre es obligatorio' })}
                    ref={(e) => {
                      register('nombre').ref(e);
                      (nombreRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }}
                  />
                  {errors.nombre && (
                    <p className="text-sm text-red-500 mt-1">{errors.nombre.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="procedencia">De donde nos visita?</Label>
                  <Input
                    id="procedencia"
                    placeholder="Iglesia, ciudad, etc."
                    className="h-12 text-base mt-1"
                    {...register('procedencia', { required: 'La procedencia es obligatoria' })}
                  />
                  {errors.procedencia && (
                    <p className="text-sm text-red-500 mt-1">{errors.procedencia.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefono">Telefono <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <Input
                      id="telefono"
                      type="tel"
                      inputMode="numeric"
                      placeholder="987 654 321"
                      className="h-12 text-base mt-1"
                      {...register('telefono')}
                      onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d\s+()-]/g, ''); }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="direccion">Direccion <span className="text-gray-400 font-normal">(opcional)</span></Label>
                    <Input
                      id="direccion"
                      placeholder="Av. Los Olivos 123"
                      className="h-12 text-base mt-1"
                      {...register('direccion')}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Registrar Visita
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de visitas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Visitas registradas</span>
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {visitas.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visitas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No hay visitas registradas aun.
                </p>
              ) : (
                <div className="space-y-2">
                  {visitas.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.nombre}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {v.procedencia}
                          </span>
                          {v.telefono && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 shrink-0" />
                              {v.telefono}
                            </span>
                          )}
                          {v.direccion && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Home className="w-3 h-3 shrink-0" />
                              {v.direccion}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={() => deleteMutation.mutate(v.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
