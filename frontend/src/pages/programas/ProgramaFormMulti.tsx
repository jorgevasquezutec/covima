import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft,
    ArrowRight,
    Loader2,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    LayoutTemplate,
    FileText,
    Calendar,
    Save,
    ArrowLeftRight,
    X,
    Users,
    QrCode,
    ChevronsUpDown,
    Search,
    GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import UserAutocomplete from '@/components/UserAutocomplete';
import { programasApi } from '@/services/api';
import { DatePickerString } from '@/components/ui/date-picker';
import { SortableParteItem } from './ProgramaForm';
import { genKey } from './ProgramaForm';
import type { ParteEnPrograma, PersonaReemplazo } from './ProgramaForm';
import type { Parte, UsuarioSimple, PlantillaPrograma, ParteOrdenDto, AsignacionDto, LinkDto, FotoDto, QRAsistencia, TipoAsistencia } from '@/types';
import { asistenciaApi, tiposAsistenciaApi } from '@/services/api';

// Represents one program column in the wizard
interface WizardProgramData {
    key: string; // Unique key for React
    plantillaId: number | null; // null = empty program
    plantillaNombre: string;
    titulo: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    partes: ParteEnPrograma[];
    qrAsistenciaId?: number;
    tipoAsistenciaId?: number;
}

// Template selection item
interface TemplateSelection {
    id: number | null; // null = empty
    nombre: string;
    plantilla: PlantillaPrograma | null;
}

function SortableProgramColumn({ id, children }: { id: string; children: (dragHandleProps: { listeners: any; attributes: any }) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style}>
            {children({ listeners, attributes })}
        </div>
    );
}

export default function ProgramaFormMulti() {
    const navigate = useNavigate();

    // Shared state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
    const [todasLasPartes, setTodasLasPartes] = useState<Parte[]>([]);
    const [plantillas, setPlantillas] = useState<PlantillaPrograma[]>([]);
    const [qrsDisponibles, setQrsDisponibles] = useState<QRAsistencia[]>([]);
    const [tiposAsistencia, setTiposAsistencia] = useState<TipoAsistencia[]>([]);
    const [qrComboOpenKey, setQrComboOpenKey] = useState<string | null>(null);

    // Step tracking
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 state
    const [selectedTemplates, setSelectedTemplates] = useState<TemplateSelection[]>([]);
    const [fecha, setFecha] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');

    // Step 2 state
    const [programs, setPrograms] = useState<WizardProgramData[]>([]);

    // Replace persona dialog
    const [replaceState, setReplaceState] = useState<{
        programKey: string;
        persona: PersonaReemplazo;
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [obligatorias, opcionales, usuariosData, plantillasData, qrsData, tiposData] = await Promise.all([
                programasApi.getPartesObligatorias(),
                programasApi.getPartesOpcionales(),
                programasApi.getUsuarios(),
                programasApi.getPlantillas(),
                asistenciaApi.getAllQRs({ limit: 100, activo: true }),
                tiposAsistenciaApi.getAll({ activo: true }),
            ]);
            const todas = [...obligatorias, ...opcionales];
            setTodasLasPartes(todas);
            setUsuarios(usuariosData);
            setPlantillas(plantillasData);
            setQrsDisponibles(qrsData.data.filter(qr => qr.activo && !qr.programaId));
            setTiposAsistencia(tiposData);
            setFecha(new Date().toISOString().split('T')[0]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al cargar datos');
            navigate('/programas');
        } finally {
            setLoading(false);
        }
    };

    // --- Step 1: Template selection ---

    const toggleTemplate = (plantilla: PlantillaPrograma) => {
        setSelectedTemplates(prev => {
            const exists = prev.find(t => t.id === plantilla.id);
            if (exists) {
                return prev.filter(t => t.id !== plantilla.id);
            }
            return [...prev, { id: plantilla.id, nombre: plantilla.nombre, plantilla }];
        });
    };

    const addEmptyProgram = () => {
        setSelectedTemplates(prev => [
            ...prev,
            { id: null, nombre: 'Programa vacío', plantilla: null },
        ]);
    };

    const removeSelectedTemplate = (index: number) => {
        setSelectedTemplates(prev => prev.filter((_, i) => i !== index));
    };

    const moveTemplate = (index: number, direction: 'up' | 'down') => {
        setSelectedTemplates(prev => {
            const newArr = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
            [newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
            return newArr;
        });
    };

    const handleContinue = () => {
        if (selectedTemplates.length === 0) {
            toast.error('Selecciona al menos una plantilla');
            return;
        }
        if (!fecha) {
            toast.error('Selecciona una fecha');
            return;
        }

        // Build programs from selected templates
        const newPrograms: WizardProgramData[] = selectedTemplates.map((tmpl, index) => {
            const partes: ParteEnPrograma[] = tmpl.plantilla
                ? tmpl.plantilla.partes
                    .sort((a, b) => a.orden - b.orden)
                    .map((pp) => {
                        const parteCompleta = todasLasPartes.find(p => p.id === pp.parteId) || pp.parte;
                        return {
                            id: `col${index}-parte-${pp.parteId}`,
                            parteId: pp.parteId,
                            parte: parteCompleta,
                            usuarioIds: [],
                            nombresLibres: [],
                            links: [],
                            fotos: [],
                        };
                    })
                : [];

            return {
                key: `prog-${index}-${tmpl.id ?? 'empty'}-${Date.now()}`,
                plantillaId: tmpl.id,
                plantillaNombre: tmpl.nombre,
                titulo: tmpl.nombre,
                fecha,
                horaInicio,
                horaFin,
                partes,
            };
        });

        setPrograms(newPrograms);
        setStep(2);
    };

    // --- Step 2: Multi-column editor ---

    const updateProgram = (key: string, updater: (prog: WizardProgramData) => WizardProgramData) => {
        setPrograms(prev => prev.map(p => p.key === key ? updater(p) : p));
    };

    const removeProgram = (key: string) => {
        setPrograms(prev => prev.filter(p => p.key !== key));
    };

    const handleProgramDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setPrograms(prev => {
                const oldIndex = prev.findIndex(p => p.key === active.id);
                const newIndex = prev.findIndex(p => p.key === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    };

    const handleDragEnd = (programKey: string) => (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            updateProgram(programKey, (prog) => {
                const oldIndex = prog.partes.findIndex(i => i.id === active.id);
                const newIndex = prog.partes.findIndex(i => i.id === over.id);
                return { ...prog, partes: arrayMove(prog.partes, oldIndex, newIndex) };
            });
        }
    };

    const handleAddParte = (programKey: string, parteId: number) => {
        const parte = todasLasPartes.find(p => p.id === parteId);
        if (!parte) return;

        updateProgram(programKey, (prog) => {
            if (prog.partes.some(p => p.parteId === parteId)) {
                toast.error('Esta parte ya está en el programa');
                return prog;
            }
            return {
                ...prog,
                partes: [
                    ...prog.partes,
                    {
                        id: `${programKey}-parte-${parte.id}`,
                        parteId: parte.id,
                        parte,
                        usuarioIds: [],
                        nombresLibres: [],
                        links: [],
                        fotos: [],
                    },
                ],
            };
        });
    };

    const handleRemoveParte = (programKey: string, parteId: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.filter(p => p.parteId !== parteId),
        }));
    };

    const handleUpdateUsuarios = (programKey: string, parteId: number, usuarioId: number, action: 'add' | 'remove') => {
        updateProgram(programKey, (prog) => {
            const currentParte = prog.partes.find(p => p.parteId === parteId);
            if (!currentParte) return prog;

            let newPartes = prog.partes.map(p => {
                if (p.parteId === parteId) {
                    if (action === 'add' && !p.usuarioIds.includes(usuarioId)) {
                        return { ...p, usuarioIds: [...p.usuarioIds, usuarioId] };
                    } else if (action === 'remove') {
                        return { ...p, usuarioIds: p.usuarioIds.filter(id => id !== usuarioId) };
                    }
                }
                return p;
            });

            // Auto-assignment: Bienvenida -> Oración Inicial/Final
            if (currentParte.parte.nombre === 'Bienvenida') {
                const bienvenida = newPartes.find(p => p.parte.nombre === 'Bienvenida');
                const bienvenidaUsuarios = bienvenida?.usuarioIds || [];
                newPartes = newPartes.map(p => {
                    if (p.parte.nombre === 'Oración Inicial') {
                        return { ...p, usuarioIds: bienvenidaUsuarios.length >= 1 ? [bienvenidaUsuarios[0]] : [] };
                    }
                    if (p.parte.nombre === 'Oración Final') {
                        return { ...p, usuarioIds: bienvenidaUsuarios.length >= 2 ? [bienvenidaUsuarios[1]] : [] };
                    }
                    return p;
                });
            }

            // Auto-assignment: Espacio de Cantos -> Himno Final
            if (currentParte.parte.nombre === 'Espacio de Cantos') {
                const cantos = newPartes.find(p => p.parte.nombre === 'Espacio de Cantos');
                const cantosUsuarios = cantos?.usuarioIds || [];
                newPartes = newPartes.map(p => {
                    if (p.parte.nombre === 'Himno Final') {
                        return { ...p, usuarioIds: [...cantosUsuarios] };
                    }
                    return p;
                });
            }

            return { ...prog, partes: newPartes };
        });
    };

    const handleAddLink = (programKey: string, parteId: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, links: [...p.links, { _key: genKey(), nombre: '', url: '' }] }
                    : p
            ),
        }));
    };

    const handleUpdateLink = (programKey: string, parteId: number, index: number, field: 'nombre' | 'url', value: string) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p => {
                if (p.parteId === parteId) {
                    const newLinks = [...p.links];
                    newLinks[index] = { ...newLinks[index], [field]: value };
                    return { ...p, links: newLinks };
                }
                return p;
            }),
        }));
    };

    const handleRemoveLink = (programKey: string, parteId: number, index: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, links: p.links.filter((_, i) => i !== index) }
                    : p
            ),
        }));
    };

    const handleReorderLinks = (programKey: string, parteId: number, fromIndex: number, toIndex: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, links: arrayMove(p.links, fromIndex, toIndex) }
                    : p
            ),
        }));
    };

    const handleAddFreeText = (programKey: string, parteId: number, nombre: string) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId && !p.nombresLibres.includes(nombre)
                    ? { ...p, nombresLibres: [...p.nombresLibres, nombre] }
                    : p
            ),
        }));
    };

    const handleRemoveFreeText = (programKey: string, parteId: number, nombre: string) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, nombresLibres: p.nombresLibres.filter(n => n !== nombre) }
                    : p
            ),
        }));
    };

    const handleAddFoto = async (programKey: string, parteId: number, file: File) => {
        try {
            const result = await programasApi.uploadFotoPrograma(file);
            updateProgram(programKey, (prog) => ({
                ...prog,
                partes: prog.partes.map(p =>
                    p.parteId === parteId
                        ? { ...p, fotos: [...p.fotos, { _key: genKey(), url: result.url, mediaItemId: result.mediaItemId }] }
                        : p
                ),
            }));
        } catch {
            toast.error('Error al subir la foto');
        }
    };

    const handlePickFromLibrary = (programKey: string, parteId: number, item: { url: string; nombre?: string; mediaItemId: number }) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, fotos: [...p.fotos, { _key: genKey(), url: item.url, nombre: item.nombre, mediaItemId: item.mediaItemId }] }
                    : p
            ),
        }));
    };

    const handleUpdateFoto = (programKey: string, parteId: number, index: number, nombre: string) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p => {
                if (p.parteId === parteId) {
                    const newFotos = [...p.fotos];
                    newFotos[index] = { ...newFotos[index], nombre };
                    return { ...p, fotos: newFotos };
                }
                return p;
            }),
        }));
    };

    const handleRemoveFoto = (programKey: string, parteId: number, index: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, fotos: p.fotos.filter((_, i) => i !== index) }
                    : p
            ),
        }));
    };

    const handleReorderFotos = (programKey: string, parteId: number, fromIndex: number, toIndex: number) => {
        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p =>
                p.parteId === parteId
                    ? { ...p, fotos: arrayMove(p.fotos, fromIndex, toIndex) }
                    : p
            ),
        }));
    };

    // Replace persona in a single program column
    const contarApariciones = (programKey: string, persona: PersonaReemplazo): number => {
        const prog = programs.find(p => p.key === programKey);
        if (!prog) return 0;
        return prog.partes.filter(p => {
            if (persona.tipo === 'usuario') return p.usuarioIds.includes(persona.id);
            return p.nombresLibres.includes(persona.nombre);
        }).length;
    };

    const handleReemplazarConUsuario = (usuarioId: number) => {
        if (!replaceState) return;
        const { programKey, persona } = replaceState;

        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p => {
                if (persona.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(persona.id)) return p;
                    const sinAnterior = p.usuarioIds.filter(id => id !== persona.id);
                    const nuevos = sinAnterior.includes(usuarioId) ? sinAnterior : [...sinAnterior, usuarioId];
                    return { ...p, usuarioIds: nuevos };
                } else {
                    if (!p.nombresLibres.includes(persona.nombre)) return p;
                    const sinAnterior = p.nombresLibres.filter(n => n !== persona.nombre);
                    const nuevosUsuarios = p.usuarioIds.includes(usuarioId) ? p.usuarioIds : [...p.usuarioIds, usuarioId];
                    return { ...p, nombresLibres: sinAnterior, usuarioIds: nuevosUsuarios };
                }
            }),
        }));

        const usuario = usuarios.find(u => u.id === usuarioId);
        toast.success(`Reemplazado con ${usuario?.nombre || 'usuario'} en todas las partes`);
        setReplaceState(null);
    };

    const handleReemplazarConTexto = (nuevoNombre: string) => {
        if (!replaceState) return;
        const { programKey, persona } = replaceState;

        updateProgram(programKey, (prog) => ({
            ...prog,
            partes: prog.partes.map(p => {
                if (persona.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(persona.id)) return p;
                    const sinAnterior = p.usuarioIds.filter(id => id !== persona.id);
                    const nuevosLibres = p.nombresLibres.includes(nuevoNombre) ? p.nombresLibres : [...p.nombresLibres, nuevoNombre];
                    return { ...p, usuarioIds: sinAnterior, nombresLibres: nuevosLibres };
                } else {
                    if (!p.nombresLibres.includes(persona.nombre)) return p;
                    const sinAnterior = p.nombresLibres.filter(n => n !== persona.nombre);
                    const nuevos = sinAnterior.includes(nuevoNombre) ? sinAnterior : [...sinAnterior, nuevoNombre];
                    return { ...p, nombresLibres: nuevos };
                }
            }),
        }));

        toast.success(`Reemplazado con "${nuevoNombre}" en todas las partes`);
        setReplaceState(null);
    };

    // --- Submit ---

    const handleSubmit = async () => {
        if (programs.length === 0) {
            toast.error('No hay programas para crear');
            return;
        }

        const sinFecha = programs.find(p => !p.fecha);
        if (sinFecha) {
            toast.error(`El programa "${sinFecha.titulo}" no tiene fecha`);
            return;
        }

        try {
            setSaving(true);

            const programasPayload = programs.map((prog) => {
                const partes: ParteOrdenDto[] = prog.partes.map((p, index) => ({
                    parteId: p.parteId,
                    orden: index + 1,
                }));

                const asignaciones: AsignacionDto[] = prog.partes
                    .filter(p => p.usuarioIds.length > 0 || p.nombresLibres.length > 0)
                    .map(p => ({
                        parteId: p.parteId,
                        usuarioIds: p.usuarioIds.length > 0 ? p.usuarioIds : undefined,
                        nombresLibres: p.nombresLibres.length > 0 ? p.nombresLibres : undefined,
                    }));

                const links: LinkDto[] = prog.partes
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

                const fotos: FotoDto[] = prog.partes
                    .filter(p => p.fotos.length > 0)
                    .flatMap(p =>
                        p.fotos.map(f => ({
                            parteId: p.parteId,
                            url: f.url,
                            nombre: f.nombre,
                            mediaItemId: f.mediaItemId,
                        }))
                    );

                return {
                    fecha: prog.fecha,
                    titulo: prog.titulo,
                    horaInicio: prog.horaInicio || undefined,
                    horaFin: prog.horaFin || undefined,
                    partes,
                    asignaciones,
                    links,
                    fotos,
                    qrAsistenciaId: prog.qrAsistenciaId || undefined,
                    tipoAsistenciaId: !prog.qrAsistenciaId && prog.tipoAsistenciaId ? prog.tipoAsistenciaId : undefined,
                };
            });

            if (programasPayload.length === 1) {
                await programasApi.create(programasPayload[0]);
            } else {
                await programasApi.createBatch({ programas: programasPayload });
            }

            toast.success(`${programs.length} programa${programs.length > 1 ? 's' : ''} creado${programs.length > 1 ? 's' : ''}`);
            navigate('/programas');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al crear programas');
        } finally {
            setSaving(false);
        }
    };

    // --- Render ---

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // === STEP 1: Template selection ===
    if (step === 1) {
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
                            Nuevo Programa
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Selecciona una o más plantillas para crear programas
                        </p>
                    </div>
                </div>

                {/* Date & time */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Fecha</Label>
                                <DatePickerString
                                    value={fecha}
                                    onChange={setFecha}
                                    placeholder="Seleccionar fecha"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Hora inicio (opcional)</Label>
                                <Input
                                    type="time"
                                    value={horaInicio}
                                    onChange={(e) => setHoraInicio(e.target.value)}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Hora fin (opcional)</Label>
                                <Input
                                    type="time"
                                    value={horaFin}
                                    onChange={(e) => setHoraFin(e.target.value)}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Template cards with checkboxes */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Plantillas disponibles</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {plantillas.map((plantilla) => {
                            const isSelected = selectedTemplates.some(t => t.id === plantilla.id);
                            return (
                                <Card
                                    key={plantilla.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                        isSelected
                                            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30'
                                            : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                    onClick={() => toggleTemplate(plantilla)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={isSelected}
                                                className="mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                                onCheckedChange={() => toggleTemplate(plantilla)}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <CardTitle className="text-base text-gray-900">
                                                        {plantilla.nombre}
                                                    </CardTitle>
                                                </div>
                                                {plantilla.descripcion && (
                                                    <p className="text-xs text-gray-500 mt-1 ml-8">
                                                        {plantilla.descripcion}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="text-sm text-gray-600 mb-2">
                                            <span className="font-medium">{plantilla.partes.length}</span> partes
                                        </div>
                                        {plantilla.partes.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
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
                            );
                        })}

                        {/* Empty program card */}
                        <Card
                            className="cursor-pointer transition-all hover:shadow-md border-dashed border-gray-300 hover:border-blue-300"
                            onClick={addEmptyProgram}
                        >
                            <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <Plus className="h-8 w-8 mb-2" />
                                <p className="font-medium">Programa vacío</p>
                                <p className="text-xs">Sin plantilla predefinida</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Selected templates with reorder */}
                {selectedTemplates.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">
                            Orden de programas ({selectedTemplates.length})
                        </h2>
                        <Card className="bg-white border-gray-200 shadow-sm">
                            <CardContent className="pt-4 space-y-2">
                                {selectedTemplates.map((tmpl, index) => (
                                    <div
                                        key={`${tmpl.id}-${index}`}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-200"
                                    >
                                        <span className="text-sm font-mono text-gray-400 w-6 text-center">
                                            {index + 1}
                                        </span>
                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                            {tmpl.id === null ? 'Vacío' : tmpl.nombre}
                                        </Badge>
                                        <div className="flex-1" />
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                disabled={index === 0}
                                                onClick={() => moveTemplate(index, 'up')}
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                disabled={index === selectedTemplates.length - 1}
                                                onClick={() => moveTemplate(index, 'down')}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => removeSelectedTemplate(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Continue button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleContinue}
                        disabled={selectedTemplates.length === 0 || !fecha}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        Continuar
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    }

    // === STEP 2: Multi-column editor ===
    return (
        <div className="space-y-4 overflow-x-hidden">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setStep(1)}
                            className="hover:bg-gray-100"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-500" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                {programs.length} programa{programs.length !== 1 ? 's' : ''}
                            </h1>
                            <p className="text-sm text-gray-500">
                                Cada programa tiene su propia fecha
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving || programs.length === 0}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Crear {programs.length} programa{programs.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Multi-column container with horizontal scroll + drag to reorder */}
            <div className="overflow-x-auto pb-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleProgramDragEnd}
              >
                <SortableContext
                  items={programs.map(p => p.key)}
                  strategy={horizontalListSortingStrategy}
                >
                <div className="flex gap-4" style={{ minWidth: programs.length > 1 ? `${programs.length * 500}px` : undefined }}>
                    {programs.map((prog) => {
                        const availablePartes = todasLasPartes.filter(
                            (p: Parte) => !prog.partes.some(ep => ep.parteId === p.id)
                        );

                        return (
                            <SortableProgramColumn key={prog.key} id={prog.key}>
                              {({ listeners, attributes }) => (
                            <div
                                className="flex-shrink-0 border border-gray-200 rounded-xl bg-white shadow-sm"
                                style={{ width: programs.length > 1 ? '480px' : '100%' }}
                            >
                                {/* Column header */}
                                <div className="sticky top-0 z-[5] bg-white border-b border-gray-200 rounded-t-xl px-4 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {programs.length > 1 && (
                                                <button
                                                    {...listeners}
                                                    {...attributes}
                                                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600 touch-none"
                                                    title="Arrastrar para reordenar"
                                                >
                                                    <GripVertical className="h-4 w-4" />
                                                </button>
                                            )}
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                                {prog.plantillaNombre}
                                            </Badge>
                                        </div>
                                        {programs.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => removeProgram(prog.key)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <Input
                                        value={prog.titulo}
                                        onChange={(e) => updateProgram(prog.key, (p) => ({ ...p, titulo: e.target.value }))}
                                        className="bg-white border-gray-300 text-gray-900 font-medium mb-2"
                                        placeholder="Título del programa"
                                    />
                                    <div className="mb-2">
                                        <Label className="text-xs text-gray-500">Fecha</Label>
                                        <DatePickerString
                                            value={prog.fecha}
                                            onChange={(v) => updateProgram(prog.key, (p) => ({ ...p, fecha: v }))}
                                            placeholder="Seleccionar fecha"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">Hora inicio</Label>
                                            <Input
                                                type="time"
                                                value={prog.horaInicio}
                                                onChange={(e) => updateProgram(prog.key, (p) => ({ ...p, horaInicio: e.target.value }))}
                                                className="bg-white border-gray-300 text-gray-900 text-sm h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-500">Hora fin</Label>
                                            <Input
                                                type="time"
                                                value={prog.horaFin}
                                                onChange={(e) => updateProgram(prog.key, (p) => ({ ...p, horaFin: e.target.value }))}
                                                className="bg-white border-gray-300 text-gray-900 text-sm h-8"
                                            />
                                        </div>
                                    </div>
                                    {(qrsDisponibles.length > 0 || tiposAsistencia.length > 0) && (
                                        <div className="mt-3">
                                            <Label className="text-xs text-gray-500 mb-1.5 block">QR de Asistencia</Label>
                                            {prog.qrAsistenciaId ? (() => {
                                                const qr = qrsDisponibles.find(q => q.id === prog.qrAsistenciaId);
                                                if (!qr) return null;
                                                return (
                                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <QrCode className="h-4 w-4 text-green-600 shrink-0" />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-medium text-gray-900 truncate">
                                                                        {qr.descripcion || qr.codigo}
                                                                    </span>
                                                                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100 text-[10px] px-1.5 py-0">
                                                                        Activo
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    <span className="font-mono">{qr.codigo}</span>
                                                                    {qr.tipoAsistencia && ` · ${qr.tipoAsistencia.label}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                                            onClick={() => updateProgram(prog.key, (p) => ({ ...p, qrAsistenciaId: undefined }))}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })() : prog.tipoAsistenciaId ? (() => {
                                                const tipo = tiposAsistencia.find(t => t.id === prog.tipoAsistenciaId);
                                                if (!tipo) return null;
                                                return (
                                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <QrCode className="h-4 w-4 text-blue-600 shrink-0" />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-medium text-gray-900 truncate">
                                                                        Se creará QR &quot;{prog.titulo || 'Sin título'}&quot;
                                                                    </span>
                                                                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-100 text-[10px] px-1.5 py-0">
                                                                        {tipo.label}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    Se creará al guardar
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                                            onClick={() => updateProgram(prog.key, (p) => ({ ...p, tipoAsistenciaId: undefined }))}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })() : (
                                                <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                                                    <div className="flex items-center gap-2">
                                                        <QrCode className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm text-gray-500">Sin QR vinculado</span>
                                                    </div>
                                                    <Popover open={qrComboOpenKey === prog.key} onOpenChange={(open) => setQrComboOpenKey(open ? prog.key : null)}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className="w-[160px] justify-between bg-white border-gray-300 h-8 text-sm"
                                                            >
                                                                <span className="flex items-center gap-1.5 text-gray-500">
                                                                    <Search className="h-3.5 w-3.5" />
                                                                    Vincular QR...
                                                                </span>
                                                                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[280px] p-0" align="end">
                                                            <Command>
                                                                <CommandInput placeholder="Buscar QR o tipo..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No se encontraron resultados</CommandEmpty>
                                                                    {qrsDisponibles.length > 0 && (
                                                                        <CommandGroup heading="QRs activos">
                                                                            {qrsDisponibles.map((qr) => (
                                                                                <CommandItem
                                                                                    key={`qr-${qr.id}`}
                                                                                    value={`${qr.descripcion || ''} ${qr.codigo} ${qr.tipoAsistencia?.label || ''}`}
                                                                                    onSelect={() => {
                                                                                        updateProgram(prog.key, (p) => ({ ...p, qrAsistenciaId: qr.id, tipoAsistenciaId: undefined }));
                                                                                        setQrComboOpenKey(null);
                                                                                    }}
                                                                                >
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm font-medium">{qr.descripcion || qr.codigo}</span>
                                                                                        <span className="text-xs text-gray-500">
                                                                                            {qr.codigo}
                                                                                            {qr.tipoAsistencia && ` · ${qr.tipoAsistencia.label}`}
                                                                                        </span>
                                                                                    </div>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    )}
                                                                    {tiposAsistencia.length > 0 && (
                                                                        <>
                                                                            {qrsDisponibles.length > 0 && <CommandSeparator />}
                                                                            <CommandGroup heading="Crear nuevo QR">
                                                                                {tiposAsistencia.map((tipo) => (
                                                                                    <CommandItem
                                                                                        key={`tipo-${tipo.id}`}
                                                                                        value={`crear nuevo ${tipo.nombre} ${tipo.label}`}
                                                                                        onSelect={() => {
                                                                                            updateProgram(prog.key, (p) => ({ ...p, tipoAsistenciaId: tipo.id, qrAsistenciaId: undefined }));
                                                                                            setQrComboOpenKey(null);
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-sm font-medium">
                                                                                                <Plus className="h-3 w-3 inline mr-1" />
                                                                                                Crear QR — {tipo.label}
                                                                                            </span>
                                                                                            <span className="text-xs text-gray-500">
                                                                                                Se creará al guardar
                                                                                            </span>
                                                                                        </div>
                                                                                    </CommandItem>
                                                                                ))}
                                                                            </CommandGroup>
                                                                        </>
                                                                    )}
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Parts list with independent vertical scroll */}
                                <div
                                    className="overflow-y-auto p-4 space-y-3"
                                    style={{ maxHeight: 'calc(100vh - 280px)' }}
                                >
                                    {/* Add part button */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {prog.partes.length} parte{prog.partes.length !== 1 ? 's' : ''}
                                        </span>
                                        {availablePartes.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50 h-7 text-xs">
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Agregar
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-white border-gray-200 w-56 max-h-60 overflow-y-auto">
                                                    {availablePartes.map((parte: Parte) => (
                                                        <DropdownMenuItem
                                                            key={parte.id}
                                                            onClick={() => handleAddParte(prog.key, parte.id)}
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
                                        onDragEnd={handleDragEnd(prog.key)}
                                    >
                                        <SortableContext
                                            items={prog.partes.map(p => p.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {prog.partes.map((item) => (
                                                    <SortableParteItem
                                                        key={item.id}
                                                        item={item}
                                                        usuarios={usuarios}
                                                        onRemove={() => handleRemoveParte(prog.key, item.parteId)}
                                                        onUpdateUsuarios={(usuarioId, action) => handleUpdateUsuarios(prog.key, item.parteId, usuarioId, action)}
                                                        onAddFreeText={(nombre) => handleAddFreeText(prog.key, item.parteId, nombre)}
                                                        onRemoveFreeText={(nombre) => handleRemoveFreeText(prog.key, item.parteId, nombre)}
                                                        onReplacePersona={(persona) => setReplaceState({ programKey: prog.key, persona })}
                                                        onAddLink={() => handleAddLink(prog.key, item.parteId)}
                                                        onUpdateLink={(index, field, value) => handleUpdateLink(prog.key, item.parteId, index, field, value)}
                                                        onRemoveLink={(index) => handleRemoveLink(prog.key, item.parteId, index)}
                                                        onReorderLinks={(from, to) => handleReorderLinks(prog.key, item.parteId, from, to)}
                                                        onAddFoto={(file) => handleAddFoto(prog.key, item.parteId, file)}
                                                        onUpdateFoto={(index, nombre) => handleUpdateFoto(prog.key, item.parteId, index, nombre)}
                                                        onRemoveFoto={(index) => handleRemoveFoto(prog.key, item.parteId, index)}
                                                        onReorderFotos={(from, to) => handleReorderFotos(prog.key, item.parteId, from, to)}
                                                        onPickFromLibrary={(mediaItem) => handlePickFromLibrary(prog.key, item.parteId, mediaItem)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>

                                    {prog.partes.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Sin partes</p>
                                            <p className="text-xs">Agrega partes con el botón de arriba</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                              )}
                            </SortableProgramColumn>
                        );
                    })}
                </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Replace persona dialog */}
            <Dialog open={!!replaceState} onOpenChange={(open) => { if (!open) setReplaceState(null); }}>
                <DialogContent className="bg-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                            Reemplazar persona
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Reemplazar a <span className="font-semibold text-gray-700">{replaceState?.persona?.nombre}</span> en{' '}
                            <span className="font-semibold text-gray-700">
                                {replaceState ? contarApariciones(replaceState.programKey, replaceState.persona) : 0} parte(s)
                            </span>{' '}
                            del programa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <Label className="text-gray-700 text-sm">Seleccionar reemplazo</Label>
                        <UserAutocomplete
                            usuarios={usuarios}
                            selectedIds={replaceState?.persona?.tipo === 'usuario' ? [replaceState.persona.id] : []}
                            onSelect={handleReemplazarConUsuario}
                            onAddFreeText={handleReemplazarConTexto}
                            placeholder="Buscar reemplazo..."
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
