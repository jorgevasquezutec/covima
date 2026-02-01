import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import {
    Calendar,
    Save,
    ArrowLeft,
    Loader2,
    Users,
    Link as LinkIcon,
    Plus,
    Trash2,
    Music,
    BookOpen,
    ExternalLink,
    GripVertical,
    ChevronDown,
    LayoutTemplate,
    FileText,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import UserAutocomplete from '@/components/UserAutocomplete';
import { programasApi } from '@/services/api';
import { DatePickerString } from '@/components/ui/date-picker';
import type { Parte, UsuarioSimple, ParteOrdenDto, AsignacionDto, LinkDto, PlantillaPrograma } from '@/types';

interface ParteEnPrograma {
    id: string; // Unique ID for drag & drop
    parteId: number;
    parte: Parte;
    usuarioIds: number[];
    nombresLibres: string[];
    links: { nombre: string; url: string }[];
}

// Sortable Part Item Component
function SortableParteItem({
    item,
    usuarios,
    onRemove,
    onUpdateUsuarios,
    onAddFreeText,
    onRemoveFreeText,
    onAddLink,
    onUpdateLink,
    onRemoveLink,
}: {
    item: ParteEnPrograma;
    usuarios: UsuarioSimple[];
    onRemove?: () => void;
    onUpdateUsuarios: (usuarioId: number, action: 'add' | 'remove') => void;
    onAddFreeText: (nombre: string) => void;
    onRemoveFreeText: (nombre: string) => void;
    onAddLink: () => void;
    onUpdateLink: (index: number, field: 'nombre' | 'url', value: string) => void;
    onRemoveLink: (index: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getParteIcon = (nombre: string) => {
        if (nombre.includes('Cantos') || nombre.includes('Himno')) return <Music className="h-4 w-4" />;
        if (nombre.includes('Revivados')) return <BookOpen className="h-4 w-4" />;
        return <Users className="h-4 w-4" />;
    };

    // Mostrar texto fijo solo si tiene textoFijo (como "Diáconos")
    const tieneTextoFijo = item.parte.esFija && item.parte.textoFijo;

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className="bg-white border-gray-200 shadow-sm"
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Drag Handle - available for ALL parts */}
                        <button
                            type="button"
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                        >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                {getParteIcon(item.parte.nombre)}
                            </div>
                            <div>
                                <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                                    {item.parte.nombre}
                                    {tieneTextoFijo && (
                                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                                            {item.parte.textoFijo}
                                        </Badge>
                                    )}
                                </CardTitle>
                                {item.parte.descripcion && (
                                    <p className="text-xs text-gray-500">{item.parte.descripcion}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Remove button - available for ALL parts */}
                    {onRemove && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onRemove}
                            className="hover:bg-red-50 hover:text-red-600"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            {/* Siempre mostrar contenido para asignar usuarios */}
            {(
                <CardContent className="space-y-4">
                    {/* Asignación de usuarios */}
                    <div className="space-y-3">
                        <Label className="text-gray-700 text-sm flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Participantes asignados
                        </Label>

                        {/* Usuarios seleccionados y nombres libres */}
                        {(item.usuarioIds.length > 0 || item.nombresLibres.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                                {/* Usuarios registrados */}
                                {item.usuarioIds.map((uid) => {
                                    const usuario = usuarios.find(u => u.id === uid);
                                    return (
                                        <Badge
                                            key={uid}
                                            className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 pr-1"
                                        >
                                            {usuario?.nombre || 'Usuario'}
                                            <button
                                                type="button"
                                                onClick={() => onUpdateUsuarios(uid, 'remove')}
                                                className="ml-1 p-0.5 hover:bg-green-200 rounded"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                                {/* Nombres libres (no registrados) */}
                                {item.nombresLibres.map((nombre) => (
                                    <Badge
                                        key={`libre-${nombre}`}
                                        className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 pr-1"
                                    >
                                        {nombre}
                                        <span className="text-xs opacity-60 ml-1">(externo)</span>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveFreeText(nombre)}
                                            className="ml-1 p-0.5 hover:bg-amber-200 rounded"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Selector de usuarios con autocomplete */}
                        <UserAutocomplete
                            usuarios={usuarios}
                            selectedIds={item.usuarioIds}
                            onSelect={(usuarioId) => onUpdateUsuarios(usuarioId, 'add')}
                            onAddFreeText={onAddFreeText}
                            placeholder="Buscar participante..."
                        />
                    </div>

                    {/* Links */}
                    <div className="space-y-3">
                        <Label className="text-gray-700 text-sm flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Links (YouTube, Kahoot, etc.)
                        </Label>

                        {item.links.map((link, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    value={link.nombre}
                                    onChange={(e) => onUpdateLink(index, 'nombre', e.target.value)}
                                    placeholder="Nombre del link (ej: Himno 366)"
                                    className="bg-white border-gray-300 text-gray-900 flex-1"
                                />
                                <Input
                                    value={link.url}
                                    onChange={(e) => onUpdateLink(index, 'url', e.target.value)}
                                    placeholder="https://..."
                                    className="bg-white border-gray-300 text-gray-900 flex-1"
                                />
                                <div className="flex gap-1">
                                    {link.url && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => window.open(link.url, '_blank')}
                                            className="hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemoveLink(index)}
                                        className="hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddLink}
                            className="border-gray-300 hover:bg-gray-50 text-gray-700"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Link
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default function ProgramaForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id && id !== 'nuevo';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
    const [todasLasPartes, setTodasLasPartes] = useState<Parte[]>([]);

    // Template selector state (only for new programs)
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [plantillas, setPlantillas] = useState<PlantillaPrograma[]>([]);

    // Form state
    const [fecha, setFecha] = useState('');
    const [titulo, setTitulo] = useState('Programa Maranatha Adoración');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [codigo, setCodigo] = useState('');
    const [partesEnPrograma, setPartesEnPrograma] = useState<ParteEnPrograma[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [obligatorias, opcionales, usuariosData, plantillasData] = await Promise.all([
                programasApi.getPartesObligatorias(),
                programasApi.getPartesOpcionales(),
                programasApi.getUsuarios(),
                !isEditing ? programasApi.getPlantillas() : Promise.resolve([]),
            ]);

            // Combinar todas las partes
            const todas = [...obligatorias, ...opcionales];
            setTodasLasPartes(todas);
            setUsuarios(usuariosData);
            setPlantillas(plantillasData);

            if (isEditing) {
                const programaData = await programasApi.getOne(parseInt(id!));
                setFecha(programaData.fecha.split('T')[0]);
                setTitulo(programaData.titulo);
                setCodigo(programaData.codigo);
                setHoraInicio(programaData.horaInicio || '');
                setHoraFin(programaData.horaFin || '');

                // Rebuild partes from programa data
                const programaPartes: ParteEnPrograma[] = [];

                // Add parts from programa.partes (saved order)
                if (programaData.partes && programaData.partes.length > 0) {
                    for (const pp of programaData.partes) {
                        const asigs = programaData.asignaciones.filter(a => a.parte.id === pp.parteId);
                        const links = programaData.links.filter(l => l.parte.id === pp.parteId);

                        programaPartes.push({
                            id: `parte-${pp.parteId}`,
                            parteId: pp.parteId,
                            parte: pp.parte,
                            usuarioIds: asigs.filter(a => a.usuario).map(a => a.usuario!.id),
                            nombresLibres: asigs.filter(a => !a.usuario && a.nombreLibre).map(a => a.nombreLibre!),
                            links: links.map(l => ({ nombre: l.nombre, url: l.url })),
                        });
                    }
                } else {
                    // Fallback: use todas las partes que tengan asignaciones
                    for (const parte of todas) {
                        const asigs = programaData.asignaciones.filter(a => a.parte.id === parte.id);
                        const links = programaData.links.filter(l => l.parte.id === parte.id);

                        if (asigs.length > 0 || links.length > 0) {
                            programaPartes.push({
                                id: `parte-${parte.id}`,
                                parteId: parte.id,
                                parte,
                                usuarioIds: asigs.filter(a => a.usuario).map(a => a.usuario!.id),
                                nombresLibres: asigs.filter(a => !a.usuario && a.nombreLibre).map(a => a.nombreLibre!),
                                links: links.map(l => ({ nombre: l.nombre, url: l.url })),
                            });
                        }
                    }
                }

                setPartesEnPrograma(programaPartes);
            } else {
                // New program: show template selector
                setFecha(getFechaActual());

                // If there are plantillas available, show selector
                if (plantillasData.length > 0) {
                    setShowTemplateSelector(true);

                    // Auto-select default template if exists
                    const defaultPlantilla = plantillasData.find(p => p.esDefault);
                    if (defaultPlantilla) {
                        loadPlantillaPartes(defaultPlantilla, todas);
                    }
                } else {
                    // Fallback: empty program
                    setPartesEnPrograma([]);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al cargar datos');
            navigate('/programas');
        } finally {
            setLoading(false);
        }
    };

    const getFechaActual = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    /**
     * Load partes from a selected plantilla
     */
    const loadPlantillaPartes = (plantilla: PlantillaPrograma, allPartes?: Parte[]) => {
        const partesDisponibles = allPartes || todasLasPartes;

        const initialPartes: ParteEnPrograma[] = plantilla.partes
            .sort((a, b) => a.orden - b.orden)
            .map((pp) => {
                // Find the full parte data
                const parteCompleta = partesDisponibles.find(p => p.id === pp.parteId) || pp.parte;
                return {
                    id: `parte-${pp.parteId}`,
                    parteId: pp.parteId,
                    parte: parteCompleta,
                    usuarioIds: [],
                    nombresLibres: [],
                    links: [],
                };
            });

        setPartesEnPrograma(initialPartes);
    };

    /**
     * Handle template selection
     */
    const handleSelectPlantilla = (plantilla: PlantillaPrograma) => {
        loadPlantillaPartes(plantilla);
        setShowTemplateSelector(false);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setPartesEnPrograma((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddParte = (parteId: number) => {
        const parte = todasLasPartes.find((p: Parte) => p.id === parteId);
        if (!parte) return;

        // Check if already added
        if (partesEnPrograma.some(p => p.parteId === parteId)) {
            toast.error('Esta parte ya está en el programa');
            return;
        }

        setPartesEnPrograma(prev => [
            ...prev,
            {
                id: `parte-${parte.id}`,
                parteId: parte.id,
                parte,
                usuarioIds: [],
                nombresLibres: [],
                links: [],
            },
        ]);
    };

    const handleRemoveParte = (parteId: number) => {
        setPartesEnPrograma(prev => prev.filter(p => p.parteId !== parteId));
    };

    // Helper function to find a part by name
    const findParteByName = (partes: ParteEnPrograma[], name: string) => {
        return partes.find(p => p.parte.nombre === name);
    };

    const handleUpdateUsuarios = (parteId: number, usuarioId: number, action: 'add' | 'remove') => {
        setPartesEnPrograma(prev => {
            // Find the current part being modified
            const currentParte = prev.find(p => p.parteId === parteId);
            if (!currentParte) return prev;

            let newPartes = prev.map(p => {
                if (p.parteId === parteId) {
                    if (action === 'add' && !p.usuarioIds.includes(usuarioId)) {
                        return { ...p, usuarioIds: [...p.usuarioIds, usuarioId] };
                    } else if (action === 'remove') {
                        return { ...p, usuarioIds: p.usuarioIds.filter(id => id !== usuarioId) };
                    }
                }
                return p;
            });

            // Auto-assignment logic for BIENVENIDA
            if (currentParte.parte.nombre === 'Bienvenida') {
                const bienvenidaParte = findParteByName(newPartes, 'Bienvenida');
                const bienvenidaUsuarios = bienvenidaParte?.usuarioIds || [];

                // Sincronizar Oración Inicial con la primera persona de Bienvenida
                newPartes = newPartes.map(p => {
                    if (p.parte.nombre === 'Oración Inicial') {
                        if (bienvenidaUsuarios.length >= 1) {
                            return { ...p, usuarioIds: [bienvenidaUsuarios[0]] };
                        } else {
                            return { ...p, usuarioIds: [] };
                        }
                    }
                    return p;
                });

                // Sincronizar Oración Final con la segunda persona de Bienvenida
                newPartes = newPartes.map(p => {
                    if (p.parte.nombre === 'Oración Final') {
                        if (bienvenidaUsuarios.length >= 2) {
                            return { ...p, usuarioIds: [bienvenidaUsuarios[1]] };
                        } else {
                            return { ...p, usuarioIds: [] };
                        }
                    }
                    return p;
                });
            }

            // Auto-assignment logic for ESPACIO DE CANTOS -> HIMNO FINAL
            if (currentParte.parte.nombre === 'Espacio de Cantos') {
                const cantosParte = findParteByName(newPartes, 'Espacio de Cantos');
                const cantosUsuarios = cantosParte?.usuarioIds || [];

                // Sincronizar Himno Final con todos los usuarios de Espacio de Cantos
                newPartes = newPartes.map(p => {
                    if (p.parte.nombre === 'Himno Final') {
                        return { ...p, usuarioIds: [...cantosUsuarios] };
                    }
                    return p;
                });
            }

            return newPartes;
        });
    };

    const handleAddLink = (parteId: number) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, links: [...p.links, { nombre: '', url: '' }] };
                }
                return p;
            })
        );
    };

    const handleUpdateLink = (parteId: number, index: number, field: 'nombre' | 'url', value: string) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    const newLinks = [...p.links];
                    newLinks[index] = { ...newLinks[index], [field]: value };
                    return { ...p, links: newLinks };
                }
                return p;
            })
        );
    };

    const handleRemoveLink = (parteId: number, index: number) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, links: p.links.filter((_, i) => i !== index) };
                }
                return p;
            })
        );
    };

    const handleAddFreeText = (parteId: number, nombre: string) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId && !p.nombresLibres.includes(nombre)) {
                    return { ...p, nombresLibres: [...p.nombresLibres, nombre] };
                }
                return p;
            })
        );
    };

    const handleRemoveFreeText = (parteId: number, nombre: string) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, nombresLibres: p.nombresLibres.filter(n => n !== nombre) };
                }
                return p;
            })
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fecha) {
            toast.error('Selecciona una fecha');
            return;
        }

        try {
            setSaving(true);

            // Build partes with order
            const partes: ParteOrdenDto[] = partesEnPrograma.map((p, index) => ({
                parteId: p.parteId,
                orden: index + 1,
            }));

            // Build asignaciones (incluye usuarios registrados y nombres libres)
            const asignaciones: AsignacionDto[] = partesEnPrograma
                .filter(p => p.usuarioIds.length > 0 || p.nombresLibres.length > 0)
                .map(p => ({
                    parteId: p.parteId,
                    usuarioIds: p.usuarioIds.length > 0 ? p.usuarioIds : undefined,
                    nombresLibres: p.nombresLibres.length > 0 ? p.nombresLibres : undefined,
                }));

            // Build links
            const links: LinkDto[] = partesEnPrograma
                .filter(p => p.links.length > 0)
                .flatMap(p =>
                    p.links
                        .filter(l => l.nombre && l.url)
                        .map(l => ({
                            parteId: p.parteId,
                            nombre: l.nombre,
                            url: l.url,
                        }))
                );

            if (isEditing) {
                await programasApi.update(parseInt(id!), {
                    fecha,
                    titulo,
                    horaInicio: horaInicio || undefined,
                    horaFin: horaFin || undefined,
                    partes,
                    asignaciones,
                    links,
                });
                toast.success('Programa actualizado');
            } else {
                await programasApi.create({
                    fecha,
                    titulo,
                    horaInicio: horaInicio || undefined,
                    horaFin: horaFin || undefined,
                    partes,
                    asignaciones,
                    links,
                });
                toast.success('Programa creado');
            }

            navigate('/programas');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // Get available parts (not already in program)
    const availablePartes = todasLasPartes.filter(
        (p: Parte) => !partesEnPrograma.some(ep => ep.parteId === p.id)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Template selector for new programs
    if (showTemplateSelector && !isEditing && plantillas.length > 0) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/programas')}
                        className="hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <LayoutTemplate className="h-6 w-6 text-blue-600" />
                            Seleccionar Plantilla
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Elige una plantilla para tu nuevo programa
                        </p>
                    </div>
                </div>

                {/* Template Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {plantillas.map((plantilla) => (
                        <Card
                            key={plantilla.id}
                            className={`cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
                                plantilla.esDefault ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'
                            }`}
                            onClick={() => handleSelectPlantilla(plantilla)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg text-gray-900">
                                                {plantilla.nombre}
                                            </CardTitle>
                                            {plantilla.esDefault && (
                                                <Badge className="mt-1 bg-blue-100 text-blue-700 border-blue-200">
                                                    Recomendado
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {plantilla.esDefault && (
                                        <Check className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {plantilla.descripcion && (
                                    <p className="text-sm text-gray-500 mb-3">
                                        {plantilla.descripcion}
                                    </p>
                                )}
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">{plantilla.partes.length}</span> partes incluidas
                                </div>
                                {plantilla.partes.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {plantilla.partes.slice(0, 4).map((pp) => (
                                            <Badge
                                                key={pp.id}
                                                variant="outline"
                                                className="text-xs bg-gray-50"
                                            >
                                                {pp.parte.nombre}
                                            </Badge>
                                        ))}
                                        {plantilla.partes.length > 4 && (
                                            <Badge variant="outline" className="text-xs bg-gray-50">
                                                +{plantilla.partes.length - 4} más
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/programas')}
                        className="hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-6 w-6 text-blue-600" />
                            {isEditing ? 'Editar Programa' : 'Nuevo Programa'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {isEditing ? 'Modifica las asignaciones y links' : 'Crea un nuevo programa semanal'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isEditing && plantillas.length > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowTemplateSelector(true)}
                            className="border-gray-300"
                        >
                            <LayoutTemplate className="h-4 w-4 mr-2" />
                            Cambiar Plantilla
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Guardar Programa
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Datos básicos */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-gray-900">Información del Programa</CardTitle>
                    <CardDescription className="text-gray-500">
                        Define la fecha y título del programa
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-gray-700">Fecha del Programa</Label>
                        <DatePickerString
                            value={fecha}
                            onChange={setFecha}
                            placeholder="Seleccionar fecha"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700">Título</Label>
                        <Input
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                            placeholder="Programa Maranatha Adoración"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700">Hora Inicio (opcional)</Label>
                        <Input
                            type="time"
                            value={horaInicio}
                            onChange={(e) => setHoraInicio(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700">Hora Fin (opcional)</Label>
                        <Input
                            type="time"
                            value={horaFin}
                            onChange={(e) => setHoraFin(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                        />
                    </div>
                    {isEditing && codigo && (
                        <div className="space-y-2 md:col-span-2 lg:col-span-4">
                            <Label className="text-gray-700">Código del Programa</Label>
                            <Input
                                value={codigo}
                                disabled
                                className="bg-gray-50 border-gray-300 text-gray-500 font-mono"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Partes del programa */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Partes del Programa</h2>
                        <p className="text-sm text-gray-500">
                            Arrastra las partes para reordenarlas. Puedes eliminar cualquier parte.
                        </p>
                    </div>

                    {/* Add Part Button */}
                    {availablePartes.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Agregar Parte
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-gray-200 w-56">
                                {availablePartes.map((parte: Parte) => (
                                    <DropdownMenuItem
                                        key={parte.id}
                                        onClick={() => handleAddParte(parte.id)}
                                        className="cursor-pointer"
                                    >
                                        {parte.nombre}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={partesEnPrograma.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-4">
                            {partesEnPrograma.map((item) => (
                                <SortableParteItem
                                    key={item.id}
                                    item={item}
                                    usuarios={usuarios}
                                    onRemove={() => handleRemoveParte(item.parteId)}
                                    onUpdateUsuarios={(usuarioId, action) => handleUpdateUsuarios(item.parteId, usuarioId, action)}
                                    onAddFreeText={(nombre) => handleAddFreeText(item.parteId, nombre)}
                                    onRemoveFreeText={(nombre) => handleRemoveFreeText(item.parteId, nombre)}
                                    onAddLink={() => handleAddLink(item.parteId)}
                                    onUpdateLink={(index, field, value) => handleUpdateLink(item.parteId, index, field, value)}
                                    onRemoveLink={(index) => handleRemoveLink(item.parteId, index)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </form>
    );
}
