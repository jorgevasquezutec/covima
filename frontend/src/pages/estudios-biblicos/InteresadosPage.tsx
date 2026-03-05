import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  UserPlus,
  Users,
  Clock,
  UserCheck,
  Heart,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Pencil,
  Trash2,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { estudiosBiblicosApi } from '@/services/api';
import { toast } from 'sonner';
import type { EstadoInteresado, Interesado } from '@/types';

const estadoConfig: Record<EstadoInteresado, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ASIGNADO: { label: 'Asignado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_CONTACTO: { label: 'En contacto', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  CONVERTIDO: { label: 'Convertido', className: 'bg-green-100 text-green-700 border-green-200' },
  DESCARTADO: { label: 'Descartado', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const estadoFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'EN_CONTACTO', label: 'En contacto' },
  { value: 'CONVERTIDO', label: 'Convertido' },
  { value: 'DESCARTADO', label: 'Descartado' },
];

export default function InteresadosPage() {
  const queryClient = useQueryClient();
  const nombreInputRef = useRef<HTMLInputElement>(null);

  // Quick registration form
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formNotas, setFormNotas] = useState('');

  // Filters and pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const limit = 10;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialogs
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);
  const [assignInstructorId, setAssignInstructorId] = useState('');

  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkInstructorId, setBulkInstructorId] = useState('');

  // Combobox state
  const [assignComboOpen, setAssignComboOpen] = useState(false);
  const [bulkComboOpen, setBulkComboOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Interesado | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editNotas, setEditNotas] = useState('');

  // Queries
  const { data: interesadosData, isLoading } = useQuery({
    queryKey: ['interesados', page, search, estadoFilter],
    queryFn: () =>
      estudiosBiblicosApi.getInteresados({
        page,
        limit,
        search: search || undefined,
        estado: estadoFilter !== 'all' ? (estadoFilter as EstadoInteresado) : undefined,
      }),
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['interesados-estadisticas'],
    queryFn: estudiosBiblicosApi.getEstadisticasInteresados,
  });

  const { data: instructores } = useQuery({
    queryKey: ['interesados-instructores'],
    queryFn: estudiosBiblicosApi.getInstructores,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: estudiosBiblicosApi.createInteresado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interesados'] });
      queryClient.invalidateQueries({ queryKey: ['interesados-estadisticas'] });
      toast.success('Interesado registrado');
      setFormNombre('');
      setFormTelefono('');
      setFormDireccion('');
      setFormNotas('');
      nombreInputRef.current?.focus();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar interesado');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof estudiosBiblicosApi.updateInteresado>[1] }) =>
      estudiosBiblicosApi.updateInteresado(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interesados'] });
      toast.success('Interesado actualizado');
      handleCloseEditDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: estudiosBiblicosApi.deleteInteresado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interesados'] });
      queryClient.invalidateQueries({ queryKey: ['interesados-estadisticas'] });
      toast.success('Interesado eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, instructorId }: { id: number; instructorId: number }) =>
      estudiosBiblicosApi.asignarInteresado(id, instructorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interesados'] });
      queryClient.invalidateQueries({ queryKey: ['interesados-estadisticas'] });
      toast.success('Instructor asignado');
      handleCloseAssignDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar');
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: ({ ids, instructorId }: { ids: number[]; instructorId: number }) =>
      estudiosBiblicosApi.asignarMasivo(ids, instructorId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interesados'] });
      queryClient.invalidateQueries({ queryKey: ['interesados-estadisticas'] });
      toast.success(`${data.actualizados} interesados asignados`);
      setSelectedIds(new Set());
      handleCloseBulkAssignDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar masivamente');
    },
  });

  // Handlers
  const handleCreate = () => {
    if (!formNombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    createMutation.mutate({
      nombre: formNombre.trim(),
      telefono: formTelefono.trim() || undefined,
      direccion: formDireccion.trim() || undefined,
      notas: formNotas.trim() || undefined,
    });
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleEstadoFilter = (value: string) => {
    setEstadoFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenAssignDialog = (id: number) => {
    setAssignTargetId(id);
    setAssignInstructorId('');
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setAssignTargetId(null);
    setAssignInstructorId('');
  };

  const handleAssign = () => {
    if (!assignTargetId || !assignInstructorId) return;
    assignMutation.mutate({ id: assignTargetId, instructorId: parseInt(assignInstructorId) });
  };

  const handleOpenBulkAssignDialog = () => {
    setBulkInstructorId('');
    setBulkAssignDialogOpen(true);
  };

  const handleCloseBulkAssignDialog = () => {
    setBulkAssignDialogOpen(false);
    setBulkInstructorId('');
  };

  const handleBulkAssign = () => {
    if (!bulkInstructorId || selectedIds.size === 0) return;
    bulkAssignMutation.mutate({
      ids: Array.from(selectedIds),
      instructorId: parseInt(bulkInstructorId),
    });
  };

  const handleOpenEditDialog = (interesado: Interesado) => {
    setEditTarget(interesado);
    setEditNombre(interesado.nombre);
    setEditTelefono(interesado.telefono || '');
    setEditDireccion(interesado.direccion || '');
    setEditNotas(interesado.notas || '');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditTarget(null);
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    if (!editNombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        nombre: editNombre.trim(),
        telefono: editTelefono.trim(),
        direccion: editDireccion.trim() || undefined,
        notas: editNotas.trim() || undefined,
      },
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este interesado?')) return;
    deleteMutation.mutate(id);
  };

  // Derived data
  const interesados = interesadosData?.data || [];
  const meta = interesadosData?.meta;
  const totalPages = meta?.totalPages || 1;

  const getEstadoCount = (estado: EstadoInteresado): number => {
    if (!estadisticas) return 0;
    const found = estadisticas.porEstado.find((e) => e.estado === estado);
    return found?.cantidad || 0;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" />
          Interesados
        </h1>
        <p className="text-gray-500 mt-1">
          Registro y gestión de personas interesadas
        </p>
      </div>

      {/* Quick Registration Form */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
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
            <div className="space-y-1">
              <Label htmlFor="reg-notas">Notas</Label>
              <Textarea
                id="reg-notas"
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                placeholder="Opcional"
                rows={1}
                className="min-h-[36px] resize-none"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">
                  {estadisticas.total}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">Total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-700">
                  {getEstadoCount('PENDIENTE')}
                </span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-700">
                  {getEstadoCount('ASIGNADO')}
                </span>
              </div>
              <p className="text-sm text-purple-600 mt-1">Asignados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-700">
                  {getEstadoCount('CONVERTIDO')}
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">Convertidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Estado filter tabs */}
        <div className="flex flex-wrap gap-2">
          {estadoFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={estadoFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleEstadoFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-8"
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={handleOpenBulkAssignDialog}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Asignar seleccionados
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Deseleccionar
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : interesados.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {search || estadoFilter !== 'all' ? (
              <>
                <p className="text-lg font-medium">No se encontraron interesados</p>
                <p className="mt-1">Intenta con otros filtros</p>
                <Button
                  onClick={() => {
                    handleClearSearch();
                    setEstadoFilter('all');
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No hay interesados registrados</p>
                <p className="mt-1">Usa el formulario de arriba para registrar al primero</p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {interesados.map((interesado) => {
            const config = estadoConfig[interesado.estado];
            return (
              <Card key={interesado.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedIds.has(interesado.id)}
                        onCheckedChange={() => handleToggleSelect(interesado.id)}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {interesado.nombre}
                        </h3>
                        <Badge className={`${config.className} shrink-0`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {interesado.telefono}
                      </p>
                      {interesado.instructor && (
                        <p className="text-sm text-blue-600 mt-0.5">
                          Instructor: {interesado.instructor.nombre}
                        </p>
                      )}
                    </div>

                    {/* Actions - desktop */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(interesado.id)}
                      >
                        Asignar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditDialog(interesado)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(interesado.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Actions - mobile */}
                  <div className="flex sm:hidden flex-wrap gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssignDialog(interesado.id)}
                    >
                      Asignar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDialog(interesado)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(interesado.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Mostrando {interesados.length} de {meta.total} interesados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Instructor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Popover open={assignComboOpen} onOpenChange={setAssignComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assignComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {assignInstructorId
                      ? instructores?.find((i) => i.id.toString() === assignInstructorId)?.nombre
                      : 'Buscar instructor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró.</CommandEmpty>
                      <CommandGroup>
                        {instructores?.map((instructor) => (
                          <CommandItem
                            key={instructor.id}
                            value={instructor.nombre}
                            onSelect={() => {
                              setAssignInstructorId(instructor.id.toString());
                              setAssignComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                assignInstructorId === instructor.id.toString() ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {instructor.nombre}
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
            <Button variant="outline" onClick={handleCloseAssignDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignInstructorId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Asignando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Asignar {selectedIds.size} interesado{selectedIds.size > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instructor</Label>
              <Popover open={bulkComboOpen} onOpenChange={setBulkComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bulkComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {bulkInstructorId
                      ? instructores?.find((i) => i.id.toString() === bulkInstructorId)?.nombre
                      : 'Buscar instructor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Buscar por nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró.</CommandEmpty>
                      <CommandGroup>
                        {instructores?.map((instructor) => (
                          <CommandItem
                            key={instructor.id}
                            value={instructor.nombre}
                            onSelect={() => {
                              setBulkInstructorId(instructor.id.toString());
                              setBulkComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                bulkInstructorId === instructor.id.toString() ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {instructor.nombre}
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
            <Button variant="outline" onClick={handleCloseBulkAssignDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!bulkInstructorId || bulkAssignMutation.isPending}
            >
              {bulkAssignMutation.isPending ? 'Asignando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Interesado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value.replace(/[^\d\s+()-]/g, ''))}
                placeholder="999 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={editDireccion}
                onChange={(e) => setEditDireccion(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
                placeholder="Opcional"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
