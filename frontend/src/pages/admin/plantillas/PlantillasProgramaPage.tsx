import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LayoutTemplate, Plus, Edit2, Trash2, Star, GripVertical } from 'lucide-react';
import { programasApi } from '@/services/api';
import type { PlantillaPrograma, PlantillaParte, Parte } from '@/types';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable parte item for the modal
function SortableParteChip({ parte, onRemove }: { parte: Parte; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: parte.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-blue-400" />
      </button>
      <span className="flex-1">{parte.nombre}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-blue-200 rounded p-0.5"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function PlantillasProgramaPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plantillaToDelete, setPlantillaToDelete] = useState<PlantillaPrograma | null>(null);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaPrograma | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    esDefault: false,
    parteIds: [] as number[],
  });

  // Available partes for selection
  const [selectedPartes, setSelectedPartes] = useState<Parte[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Queries
  const { data: plantillas, isLoading } = useQuery({
    queryKey: ['plantillas'],
    queryFn: programasApi.getPlantillas,
  });

  const { data: todasPartes } = useQuery({
    queryKey: ['partes-all'],
    queryFn: programasApi.getAllPartes,
  });

  // Mutations
  const crearMutation = useMutation({
    mutationFn: programasApi.createPlantilla,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      toast.success('Plantilla creada exitosamente');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear plantilla');
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof programasApi.updatePlantilla>[1] }) =>
      programasApi.updatePlantilla(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      toast.success('Plantilla actualizada');
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al actualizar plantilla');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: programasApi.deletePlantilla,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas'] });
      toast.success('Plantilla eliminada');
      setDeleteDialogOpen(false);
      setPlantillaToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar plantilla');
    },
  });

  const handleOpenCreate = () => {
    setEditingPlantilla(null);
    setFormData({
      nombre: '',
      descripcion: '',
      esDefault: false,
      parteIds: [],
    });
    setSelectedPartes([]);
    setModalOpen(true);
  };

  const handleOpenEdit = (plantilla: PlantillaPrograma) => {
    setEditingPlantilla(plantilla);
    const partes = plantilla.partes
      .sort((a, b) => a.orden - b.orden)
      .map(pp => pp.parte);
    setFormData({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      esDefault: plantilla.esDefault,
      parteIds: partes.map(p => p.id),
    });
    setSelectedPartes(partes);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPlantilla(null);
    setFormData({
      nombre: '',
      descripcion: '',
      esDefault: false,
      parteIds: [],
    });
    setSelectedPartes([]);
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const parteIds = selectedPartes.map(p => p.id);

    if (editingPlantilla) {
      actualizarMutation.mutate({
        id: editingPlantilla.id,
        data: {
          nombre: formData.nombre,
          descripcion: formData.descripcion || undefined,
          esDefault: formData.esDefault,
          parteIds,
        },
      });
    } else {
      crearMutation.mutate({
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        esDefault: formData.esDefault,
        parteIds,
      });
    }
  };

  const handleAddParte = (parte: Parte) => {
    if (!selectedPartes.find(p => p.id === parte.id)) {
      setSelectedPartes([...selectedPartes, parte]);
    }
  };

  const handleRemoveParte = (parteId: number) => {
    setSelectedPartes(selectedPartes.filter(p => p.id !== parteId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedPartes((items) => {
        const oldIndex = items.findIndex((p) => p.id.toString() === active.id);
        const newIndex = items.findIndex((p) => p.id.toString() === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleConfirmDelete = (plantilla: PlantillaPrograma) => {
    setPlantillaToDelete(plantilla);
    setDeleteDialogOpen(true);
  };

  const availablePartes = todasPartes?.filter(
    p => p.activo && !selectedPartes.find(sp => sp.id === p.id)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plantillas de Programa</h1>
            <p className="text-gray-500">Administra las plantillas para crear nuevos programas</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Plantillas Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plantillas?.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay plantillas</p>
            <p className="mt-1">Crea tu primera plantilla de programa</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear Plantilla
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plantillas?.map((plantilla) => (
            <Card
              key={plantilla.id}
              className={`relative ${plantilla.esDefault ? 'border-blue-300 ring-1 ring-blue-100' : ''}`}
            >
              {plantilla.esDefault && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-blue-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-gray-900">{plantilla.nombre}</CardTitle>
                {plantilla.descripcion && (
                  <CardDescription>{plantilla.descripcion}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{plantilla.partes.length}</span> partes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {plantilla.partes.slice(0, 5).map((pp: PlantillaParte) => (
                      <Badge key={pp.id} variant="outline" className="text-xs bg-gray-50">
                        {pp.parte.nombre}
                      </Badge>
                    ))}
                    {plantilla.partes.length > 5 && (
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        +{plantilla.partes.length - 5} más
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(plantilla)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfirmDelete(plantilla)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Programa JA Estándar"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción opcional de la plantilla"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.esDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, esDefault: checked })}
                />
                <Label>Plantilla por defecto</Label>
              </div>
            </div>

            {/* Partes Selection */}
            <div className="space-y-4">
              <Label>Partes del programa</Label>

              {/* Selected partes with drag & drop */}
              {selectedPartes.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedPartes.map(p => p.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedPartes.map((parte) => (
                        <SortableParteChip
                          key={parte.id}
                          parte={parte}
                          onRemove={() => handleRemoveParte(parte.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {selectedPartes.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No hay partes seleccionadas. Agrega partes desde la lista de abajo.
                </p>
              )}

              {/* Available partes */}
              {availablePartes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Agregar partes:</Label>
                  <div className="flex flex-wrap gap-2">
                    {availablePartes.map((parte) => (
                      <Button
                        key={parte.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddParte(parte)}
                        className="text-gray-600"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {parte.nombre}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              {editingPlantilla ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la plantilla "{plantillaToDelete?.nombre}"?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => plantillaToDelete && eliminarMutation.mutate(plantillaToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
