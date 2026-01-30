import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Plus, Edit2, Trash2, UserPlus, Crown, Search, Eye } from 'lucide-react';
import { gamificacionApi, usuariosApi } from '@/services/api';
import type { GrupoRanking, CrearGrupoRankingRequest } from '@/types';
import { toast } from 'sonner';

const ICONOS_DISPONIBLES = ['📊', '👑', '🎵', '📖', '⛺', '🏆', '🔥', '⭐', '💪', '🎯', '🏔️', '🎉', '✨', '🌟'];
const COLORES_DISPONIBLES = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#6366F1'];

export default function GruposRankingPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState<GrupoRanking | null>(null);
  // Comentado: Convertir a personalizado ya no es necesario
  // const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  // const [grupoToConvert, setGrupoToConvert] = useState<GrupoRanking | null>(null);
  const [grupoToEdit, setGrupoToEdit] = useState<GrupoRanking | null>(null);
  const [grupoForMembers, setGrupoForMembers] = useState<GrupoRanking | null>(null);
  const [viewMembersModalOpen, setViewMembersModalOpen] = useState(false);
  const [grupoToView, setGrupoToView] = useState<GrupoRanking | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [formData, setFormData] = useState<CrearGrupoRankingRequest>({
    codigo: '',
    nombre: '',
    descripcion: '',
    icono: '🏆',
    color: '#6366F1',
    esPublico: true,
    soloMiembros: false,
    miembrosIds: [],
  });

  // Obtener todos los grupos (admin)
  const { data: grupos, isLoading } = useQuery({
    queryKey: ['grupos-ranking-admin'],
    queryFn: gamificacionApi.getAllGruposRanking,
  });

  // Obtener usuarios activos para agregar a grupos
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-lista-activos'],
    queryFn: () => usuariosApi.getAll({ limit: 200, activo: true }),
  });

  // Obtener detalles del grupo seleccionado (para gestionar miembros de grupos personalizados)
  const { data: grupoDetalle, refetch: refetchGrupoDetalle } = useQuery({
    queryKey: ['grupo-ranking-detalle', grupoForMembers?.id],
    queryFn: () => gamificacionApi.getGrupoRanking(grupoForMembers!.id),
    enabled: !!grupoForMembers,
  });

  // Obtener miembros para ver (cualquier grupo, incluyendo sistema)
  // Usa el endpoint dedicado del backend que aplica la misma lógica que el conteo
  const { data: miembrosVista, isLoading: loadingMiembrosVista } = useQuery({
    queryKey: ['grupo-ranking-miembros-vista', grupoToView?.id],
    queryFn: () => gamificacionApi.getMiembrosGrupo(grupoToView!.id),
    enabled: !!grupoToView && viewMembersModalOpen,
  });

  const crearMutation = useMutation({
    mutationFn: gamificacionApi.crearGrupoRanking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking'] });
      toast.success('Grupo creado exitosamente');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear grupo');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      gamificacionApi.actualizarGrupoRanking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking'] });
      toast.success('Grupo actualizado');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al actualizar grupo');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: gamificacionApi.eliminarGrupoRanking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking'] });
      toast.success('Grupo eliminado');
      setDeleteDialogOpen(false);
      setGrupoToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar grupo');
    },
  });

  const agregarMiembrosMutation = useMutation({
    mutationFn: ({ grupoId, usuariosIds }: { grupoId: number; usuariosIds: number[] }) =>
      gamificacionApi.agregarMiembrosGrupo(grupoId, usuariosIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
      queryClient.invalidateQueries({ queryKey: ['grupo-ranking-detalle'] });
      toast.success('Miembros agregados');
      setSelectedUsers([]);
      refetchGrupoDetalle();
    },
    onError: () => {
      toast.error('Error al agregar miembros');
    },
  });

  const quitarMiembroMutation = useMutation({
    mutationFn: ({ grupoId, usuarioId }: { grupoId: number; usuarioId: number }) =>
      gamificacionApi.quitarMiembroGrupo(grupoId, usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
      queryClient.invalidateQueries({ queryKey: ['grupo-ranking-detalle'] });
      toast.success('Miembro eliminado del grupo');
      refetchGrupoDetalle();
    },
    onError: () => {
      toast.error('Error al quitar miembro');
    },
  });

  // Comentado: Convertir a personalizado ya no es necesario
  // const convertirMutation = useMutation({
  //   mutationFn: gamificacionApi.convertirGrupoAPersonalizado,
  //   onSuccess: (data) => {
  //     queryClient.invalidateQueries({ queryKey: ['grupos-ranking-admin'] });
  //     queryClient.invalidateQueries({ queryKey: ['grupos-ranking'] });
  //     toast.success(data.mensaje);
  //     setConvertDialogOpen(false);
  //     setGrupoToConvert(null);
  //   },
  //   onError: (error: any) => {
  //     toast.error(error.response?.data?.message || 'Error al convertir grupo');
  //   },
  // });

  const handleOpenCreate = () => {
    setGrupoToEdit(null);
    setSearchTerm('');
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      icono: '🏆',
      color: '#6366F1',
      esPublico: true,
      soloMiembros: false,
      miembrosIds: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (grupo: GrupoRanking) => {
    setGrupoToEdit(grupo);
    setFormData({
      codigo: grupo.codigo,
      nombre: grupo.nombre,
      descripcion: grupo.descripcion || '',
      icono: grupo.icono || '🏆',
      color: grupo.color || '#6366F1',
      esPublico: grupo.esPublico,
      soloMiembros: grupo.soloMiembros,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setGrupoToEdit(null);
  };

  const handleOpenMembers = (grupo: GrupoRanking) => {
    setGrupoForMembers(grupo);
    setSelectedUsers([]);
    setSearchTerm('');
    setMembersModalOpen(true);
  };

  const handleViewMembers = (grupo: GrupoRanking) => {
    setGrupoToView(grupo);
    setViewMembersModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.codigo || !formData.nombre) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (grupoToEdit) {
      actualizarMutation.mutate({
        id: grupoToEdit.id,
        data: {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          icono: formData.icono,
          color: formData.color,
          esPublico: formData.esPublico,
          soloMiembros: formData.soloMiembros,
        },
      });
    } else {
      crearMutation.mutate(formData);
    }
  };

  const handleDelete = (grupo: GrupoRanking) => {
    setGrupoToDelete(grupo);
    setDeleteDialogOpen(true);
  };

  const handleAddMembers = () => {
    if (grupoForMembers && selectedUsers.length > 0) {
      agregarMiembrosMutation.mutate({
        grupoId: grupoForMembers.id,
        usuariosIds: selectedUsers,
      });
    }
  };

  const handleRemoveMember = (usuarioId: number) => {
    if (grupoForMembers) {
      quitarMiembroMutation.mutate({
        grupoId: grupoForMembers.id,
        usuarioId,
      });
    }
  };

  // Filtrar usuarios para agregar (que no estén ya en el grupo)
  const miembrosActualesIds = new Set(grupoDetalle?.miembros?.map((m: any) => m.usuarioId) || []);
  const usuariosFiltrados = usuarios?.data
    ?.filter((u) => !miembrosActualesIds.has(u.id))
    ?.filter((u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.telefono.includes(searchTerm)
    ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Grupos de Ranking
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra los grupos para rankings personalizados
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Grupo
        </Button>
      </div>

      {/* Lista de grupos */}
      <div className="space-y-4">
        {grupos?.map((grupo) => (
          <Card key={grupo.id} className={!grupo.activo ? 'opacity-50' : ''}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${grupo.color}20` }}
                  >
                    {grupo.icono}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{grupo.nombre}</h3>
                      {grupo.tipo === 'SISTEMA' && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Sistema
                        </Badge>
                      )}
                      {!grupo.esPublico && (
                        <Badge variant="outline" className="text-xs">Privado</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{grupo.codigo}</p>
                    {grupo.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">{grupo.descripcion}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{grupo.totalMiembros || 0}</p>
                    <p className="text-xs text-muted-foreground">miembros</p>
                  </div>

                  <div className="flex gap-1">
                    {/* Ver miembros - disponible para todos los grupos */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleViewMembers(grupo)}
                      title="Ver miembros"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {/* Gestionar miembros - solo grupos personalizados */}
                    {grupo.tipo === 'PERSONALIZADO' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenMembers(grupo)}
                        title="Gestionar miembros"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Comentado: Convertir a personalizado ya no es necesario */}
                    {/* {grupo.tipo === 'SISTEMA' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setGrupoToConvert(grupo);
                          setConvertDialogOpen(true);
                        }}
                        title="Convertir a personalizado"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )} */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenEdit(grupo)}
                      title="Editar grupo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {grupo.tipo === 'PERSONALIZADO' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(grupo)}
                        className="text-red-600 hover:text-red-700"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {grupos?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay grupos de ranking</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Crear/Editar Grupo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={`${grupoToEdit ? "sm:max-w-md" : "sm:max-w-lg"} max-h-[90vh] flex flex-col`}>
          <DialogHeader>
            <DialogTitle>{grupoToEdit ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {!grupoToEdit && (
              <div className="space-y-2">
                <Label>Código único *</Label>
                <Input
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s/g, '_') })
                  }
                  placeholder="ej: equipo_musica"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único, sin espacios
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="ej: Equipo de Música"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del grupo..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONOS_DISPONIBLES.map((icono) => (
                  <button
                    key={icono}
                    type="button"
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                      formData.icono === icono
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setFormData({ ...formData, icono })}
                  >
                    {icono}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES_DISPONIBLES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Público</Label>
                <p className="text-xs text-muted-foreground">Todos pueden ver este ranking</p>
              </div>
              <Switch
                checked={formData.esPublico}
                onCheckedChange={(checked) => setFormData({ ...formData, esPublico: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Solo miembros</Label>
                <p className="text-xs text-muted-foreground">Solo miembros ven el ranking</p>
              </div>
              <Switch
                checked={formData.soloMiembros}
                onCheckedChange={(checked) => setFormData({ ...formData, soloMiembros: checked })}
              />
            </div>

            {/* Selección de miembros al crear */}
            {!grupoToEdit && (
              <div className="space-y-2">
                <Label>Miembros iniciales</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="pl-9"
                  />
                </div>
                <div className="h-32 border rounded-md p-2 overflow-y-auto">
                  {usuarios?.data
                    ?.filter((u) =>
                      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.telefono.includes(searchTerm)
                    )
                    .slice(0, 20)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          const current = formData.miembrosIds || [];
                          if (current.includes(u.id)) {
                            setFormData({ ...formData, miembrosIds: current.filter((id) => id !== u.id) });
                          } else {
                            setFormData({ ...formData, miembrosIds: [...current, u.id] });
                          }
                        }}
                      >
                        <Checkbox checked={(formData.miembrosIds || []).includes(u.id)} />
                        {u.fotoUrl ? (
                          <img src={u.fotoUrl} alt={u.nombre} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">{u.nombre.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-sm">{u.nombre}</span>
                      </div>
                    ))}
                </div>
                {(formData.miembrosIds?.length || 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formData.miembrosIds?.length} miembro(s) seleccionado(s)
                  </p>
                )}
              </div>
            )}
          </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              {grupoToEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gestionar Miembros */}
      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{grupoForMembers?.icono}</span>
              Miembros de {grupoForMembers?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Miembros actuales */}
            <div>
              <Label className="mb-2 block">Miembros actuales ({grupoDetalle?.miembros?.length || 0})</Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {grupoDetalle?.miembros && grupoDetalle.miembros.length > 0 ? (
                  <div className="space-y-2">
                    {grupoDetalle.miembros.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          {m.usuario.fotoUrl ? (
                            <img
                              src={m.usuario.fotoUrl}
                              alt={m.usuario.nombre}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {m.usuario.nombre.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm">{m.usuario.nombre}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(m.usuarioId)}
                          className="text-red-600 hover:text-red-700 h-7 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay miembros en este grupo
                  </p>
                )}
              </ScrollArea>
            </div>

            {/* Agregar miembros */}
            <div>
              <Label className="mb-2 block">Agregar miembros</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-48 border rounded-md p-2">
                {usuariosFiltrados.length > 0 ? (
                  <div className="space-y-1">
                    {usuariosFiltrados.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => {
                          if (selectedUsers.includes(u.id)) {
                            setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                          } else {
                            setSelectedUsers([...selectedUsers, u.id]);
                          }
                        }}
                      >
                        <Checkbox checked={selectedUsers.includes(u.id)} />
                        {u.fotoUrl ? (
                          <img
                            src={u.fotoUrl}
                            alt={u.nombre}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium">{u.nombre.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-sm">{u.nombre}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'No se encontraron usuarios' : 'Todos los usuarios ya están en el grupo'}
                  </p>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersModalOpen(false)}>
              Cerrar
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0 || agregarMiembrosMutation.isPending}
            >
              Agregar {selectedUsers.length > 0 && `(${selectedUsers.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ver Miembros */}
      <Dialog open={viewMembersModalOpen} onOpenChange={setViewMembersModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{grupoToView?.icono}</span>
              Miembros de {grupoToView?.nombre}
            </DialogTitle>
            {grupoToView?.tipo === 'SISTEMA' && (
              <p className="text-sm text-muted-foreground">
                {grupoToView.criterio === 'TODOS_ACTIVOS'
                  ? 'Miembros JA activos'
                  : 'Usuarios con rol admin o líder'}
              </p>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {loadingMiembrosVista ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : miembrosVista && miembrosVista.length > 0 ? (
              <div className="space-y-2 py-2">
                {miembrosVista.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted">
                    {u.fotoUrl ? (
                      <img
                        src={u.fotoUrl}
                        alt={u.nombre}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{u.nombre?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{u.nombre}</p>
                      {u.roles && (
                        <div className="flex gap-1 mt-0.5">
                          {u.roles.map((rol: string) => (
                            <Badge key={rol} variant="secondary" className="text-xs px-1.5 py-0">
                              {rol}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay miembros en este grupo</p>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {miembrosVista?.length || 0} miembro(s)
              </span>
              <Button variant="outline" onClick={() => setViewMembersModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              El grupo "{grupoToDelete?.nombre}" será eliminado permanentemente.
              Los miembros perderán acceso a este ranking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => grupoToDelete && eliminarMutation.mutate(grupoToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comentado: Convertir a personalizado ya no es necesario */}
      {/* <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Convertir a grupo personalizado?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                El grupo "{grupoToConvert?.nombre}" dejará de ser automático y podrás
                agregar o quitar miembros manualmente.
              </p>
              <p className="font-medium text-foreground">
                Se copiarán los {grupoToConvert?.totalMiembros || 0} miembros actuales al grupo.
              </p>
              <p className="text-yellow-600">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => grupoToConvert && convertirMutation.mutate(grupoToConvert.id)}
              disabled={convertirMutation.isPending}
            >
              {convertirMutation.isPending ? 'Convirtiendo...' : 'Convertir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </div>
  );
}
