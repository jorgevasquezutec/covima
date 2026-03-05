import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { UserPlus, Phone, MapPin, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { estudiosBiblicosApi } from '@/services/api';
import { toast } from 'sonner';
import type { Interesado, EstadoInteresado, CursoBiblico } from '@/types';

const estadoConfig: Record<EstadoInteresado, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ASIGNADO: { label: 'Asignado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_CONTACTO: { label: 'En contacto', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  CONVERTIDO: { label: 'Convertido', className: 'bg-green-100 text-green-700 border-green-200' },
  DESCARTADO: { label: 'Descartado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function MisInteresadosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nombreInputRef = useRef<HTMLInputElement>(null);

  // Quick registration form
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formDireccion, setFormDireccion] = useState('');

  const [convertirDialogOpen, setConvertirDialogOpen] = useState(false);
  const [selectedInteresado, setSelectedInteresado] = useState<Interesado | null>(null);
  const [selectedCursoId, setSelectedCursoId] = useState('');
  const [cursoComboOpen, setCursoComboOpen] = useState(false);

  // Queries
  const { data: interesados, isLoading } = useQuery({
    queryKey: ['mis-interesados'],
    queryFn: estudiosBiblicosApi.getMisInteresados,
  });

  const { data: cursos, isLoading: cursosLoading } = useQuery({
    queryKey: ['cursos-biblicos'],
    queryFn: estudiosBiblicosApi.getCursos,
    enabled: convertirDialogOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: estudiosBiblicosApi.createInteresado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-interesados'] });
      toast.success('Interesado registrado');
      setFormNombre('');
      setFormTelefono('');
      setFormDireccion('');
      nombreInputRef.current?.focus();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar');
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoInteresado }) =>
      estudiosBiblicosApi.updateEstadoInteresado(id, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-interesados'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    },
  });

  const convertirMutation = useMutation({
    mutationFn: ({ id, cursoId }: { id: number; cursoId: number }) =>
      estudiosBiblicosApi.convertirInteresado(id, cursoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-interesados'] });
      queryClient.invalidateQueries({ queryKey: ['mis-estudiantes'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-estudios'] });
      toast.success('Interesado convertido a estudiante');
      handleCloseConvertirDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al convertir interesado');
    },
  });

  const handleCreate = () => {
    if (!formNombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    createMutation.mutate({
      nombre: formNombre.trim(),
      telefono: formTelefono.trim() || undefined,
      direccion: formDireccion.trim() || undefined,
    });
  };

  const handleMarcarContactado = (interesado: Interesado) => {
    updateEstadoMutation.mutate(
      { id: interesado.id, estado: 'EN_CONTACTO' },
      { onSuccess: () => toast.success('Marcado como contactado') },
    );
  };

  const handleDescartar = (interesado: Interesado) => {
    updateEstadoMutation.mutate(
      { id: interesado.id, estado: 'DESCARTADO' },
      { onSuccess: () => toast.success('Interesado descartado') },
    );
  };

  const handleOpenConvertirDialog = (interesado: Interesado) => {
    setSelectedInteresado(interesado);
    setSelectedCursoId('');
    setConvertirDialogOpen(true);
  };

  const handleCloseConvertirDialog = () => {
    setConvertirDialogOpen(false);
    setSelectedInteresado(null);
    setSelectedCursoId('');
    setCursoComboOpen(false);
  };

  const handleConvertir = () => {
    if (!selectedInteresado || !selectedCursoId) {
      toast.error('Selecciona un curso');
      return;
    }
    convertirMutation.mutate({
      id: selectedInteresado.id,
      cursoId: parseInt(selectedCursoId),
    });
  };

  // Actions available based on estado
  const canActOnEstado = (estado: EstadoInteresado) =>
    estado === 'PENDIENTE' || estado === 'ASIGNADO' || estado === 'EN_CONTACTO';

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" />
          Mis Interesados
        </h1>
        <p className="text-gray-500 mt-1">
          Registra y da seguimiento a personas interesadas
        </p>
      </div>

      {/* Quick Registration Form */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="reg-nombre">Nombre *</Label>
              <Input
                id="reg-nombre"
                ref={nombreInputRef}
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Nombre completo"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-telefono">Teléfono</Label>
              <Input
                id="reg-telefono"
                type="tel"
                inputMode="numeric"
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value.replace(/[^\d\s+()-]/g, ''))}
                placeholder="999 123 456"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reg-direccion">Dirección</Label>
              <Input
                id="reg-direccion"
                value={formDireccion}
                onChange={(e) => setFormDireccion(e.target.value)}
                placeholder="Opcional"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !interesados?.length ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No tienes interesados</p>
            <p className="mt-1">Usa el formulario de arriba para registrar al primero</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {interesados.map((interesado) => {
            const config = estadoConfig[interesado.estado];
            const isDescartado = interesado.estado === 'DESCARTADO';

            return (
              <Card
                key={interesado.id}
                className={isDescartado ? 'opacity-60' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {interesado.nombre}
                        </h3>
                        <Badge className={config.className}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1">
                        <a
                          href={`tel:${interesado.telefono}`}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {interesado.telefono}
                        </a>

                        {interesado.direccion && (
                          <p className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {interesado.direccion}
                          </p>
                        )}
                      </div>

                      {interesado.notas && (
                        <p className="text-sm text-gray-400 mt-2">
                          {interesado.notas}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {canActOnEstado(interesado.estado) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      {(interesado.estado === 'PENDIENTE' || interesado.estado === 'ASIGNADO') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarcarContactado(interesado)}
                          disabled={updateEstadoMutation.isPending}
                        >
                          Marcar contactado
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleOpenConvertirDialog(interesado)}
                      >
                        Iniciar estudio
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => handleDescartar(interesado)}
                        disabled={updateEstadoMutation.isPending}
                      >
                        Descartar
                      </Button>
                    </div>
                  )}

                  {interesado.estado === 'CONVERTIDO' && interesado.estudianteId && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/mis-estudiantes/${interesado.estudianteId}`)}
                      >
                        Ver estudiante
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Convertir Dialog */}
      <Dialog open={convertirDialogOpen} onOpenChange={setConvertirDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar estudio bíblico</DialogTitle>
          </DialogHeader>

          {selectedInteresado && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Nombre</p>
                <p className="text-gray-900">{selectedInteresado.nombre}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Teléfono</p>
                <p className="text-gray-900">{selectedInteresado.telefono}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Curso bíblico *</p>
                {cursosLoading ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : !cursos?.length ? (
                  <p className="text-sm text-muted-foreground">
                    No hay cursos disponibles.
                  </p>
                ) : (
                  <Popover open={cursoComboOpen} onOpenChange={setCursoComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={cursoComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedCursoId
                          ? cursos.find((c: CursoBiblico) => c.id.toString() === selectedCursoId)?.nombre
                          : 'Seleccionar curso...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Buscar curso..." />
                        <CommandList>
                          <CommandEmpty>No se encontró curso.</CommandEmpty>
                          <CommandGroup>
                            {cursos.map((curso: CursoBiblico) => (
                              <CommandItem
                                key={curso.id}
                                value={curso.nombre}
                                onSelect={() => {
                                  setSelectedCursoId(curso.id.toString());
                                  setCursoComboOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedCursoId === curso.id.toString() ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {curso.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConvertirDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleConvertir}
              disabled={convertirMutation.isPending || !selectedCursoId}
            >
              {convertirMutation.isPending ? 'Convirtiendo...' : 'Convertir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
