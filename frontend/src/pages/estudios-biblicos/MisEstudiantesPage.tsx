import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Users,
  Award,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react';
import { estudiosBiblicosApi } from '@/services/api';
import { toast } from 'sonner';

export default function MisEstudiantesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    cursoId: '',
    telefono: '',
    estadoCivil: '',
  });

  // Filtros y paginación
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterCursoId, setFilterCursoId] = useState<string>('');
  const limit = 10;

  // Queries
  const { data: estudiantesData, isLoading } = useQuery({
    queryKey: ['mis-estudiantes', page, search, filterCursoId],
    queryFn: () =>
      estudiosBiblicosApi.getMisEstudiantes({
        page,
        limit,
        search: search || undefined,
        cursoId: filterCursoId ? parseInt(filterCursoId) : undefined,
      }),
  });

  const { data: cursos } = useQuery({
    queryKey: ['cursos-biblicos'],
    queryFn: estudiosBiblicosApi.getCursos,
  });

  const { data: estadisticas } = useQuery({
    queryKey: ['estadisticas-estudios'],
    queryFn: estudiosBiblicosApi.getEstadisticas,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: estudiosBiblicosApi.createEstudiante,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-estudiantes'] });
      queryClient.invalidateQueries({ queryKey: ['estadisticas-estudios'] });
      toast.success('Estudiante agregado');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear estudiante');
    },
  });

  const handleOpenModal = () => {
    setFormData({ nombre: '', cursoId: '', telefono: '', estadoCivil: '' });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setFormData({ nombre: '', cursoId: '', telefono: '', estadoCivil: '' });
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!formData.cursoId) {
      toast.error('Selecciona un curso');
      return;
    }

    createMutation.mutate({
      nombre: formData.nombre,
      cursoId: parseInt(formData.cursoId),
      telefono: formData.telefono || undefined,
      estadoCivil: formData.estadoCivil || undefined,
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

  const handleFilterCurso = (value: string) => {
    setFilterCursoId(value === 'all' ? '' : value);
    setPage(1);
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 80) return 'bg-green-500';
    if (porcentaje >= 50) return 'bg-yellow-500';
    if (porcentaje >= 25) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const estudiantes = estudiantesData?.data || [];
  const meta = estudiantesData?.meta;
  const totalPages = meta?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Estudiantes</h1>
            <p className="text-gray-500">Control de estudios bíblicos</p>
          </div>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </div>

      {/* Stats Cards */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">
                  {estadisticas.totalEstudiantes}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">Estudiantes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-700">
                  {estadisticas.bautizados}
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">Bautizados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-700">
                  {estadisticas.enProgreso}
                </span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">En progreso</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-700">
                  {estadisticas.promedioProgreso}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Progreso prom.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por nombre..."
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
        <Select value={filterCursoId || 'all'} onValueChange={handleFilterCurso}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los cursos</SelectItem>
            {cursos?.map((curso) => (
              <SelectItem key={curso.id} value={curso.id.toString()}>
                {curso.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Students List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : estudiantes.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            {search || filterCursoId ? (
              <>
                <p className="text-lg font-medium">No se encontraron estudiantes</p>
                <p className="mt-1">Intenta con otros filtros</p>
                <Button
                  onClick={() => {
                    handleClearSearch();
                    setFilterCursoId('');
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No tienes estudiantes</p>
                <p className="mt-1">Agrega tu primer estudiante bíblico</p>
                <Button onClick={handleOpenModal} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Estudiante
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {estudiantes.map((estudiante) => {
            const porcentaje = estudiante.totalLecciones
              ? Math.round(
                  ((estudiante.leccionesCompletadas || 0) / estudiante.totalLecciones) * 100
                )
              : 0;

            return (
              <Card
                key={estudiante.id}
                className="cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50"
                onClick={() => navigate(`/mis-estudiantes/${estudiante.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {estudiante.nombre}
                        </h3>
                        {estudiante.fechaBautismo && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
                            Bautizado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {estudiante.curso.nombre}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            {estudiante.leccionesCompletadas || 0}/{estudiante.totalLecciones} lecciones
                          </span>
                          <span className="font-medium text-gray-700">{porcentaje}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(porcentaje)} transition-all`}
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 ml-2" />
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
            Mostrando {estudiantes.length} de {meta.total} estudiantes
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

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Estudiante</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: María García"
              />
            </div>

            <div className="space-y-2">
              <Label>Curso bíblico *</Label>
              <Select
                value={formData.cursoId}
                onValueChange={(value) => setFormData({ ...formData, cursoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {cursos?.map((curso) => (
                    <SelectItem key={curso.id} value={curso.id.toString()}>
                      {curso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej: 999 123 456"
              />
            </div>

            <div className="space-y-2">
              <Label>Estado civil (opcional)</Label>
              <Select
                value={formData.estadoCivil}
                onValueChange={(value) => setFormData({ ...formData, estadoCivil: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Soltero">Soltero(a)</SelectItem>
                  <SelectItem value="Casado">Casado(a)</SelectItem>
                  <SelectItem value="Viudo">Viudo(a)</SelectItem>
                  <SelectItem value="Divorciado">Divorciado(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
