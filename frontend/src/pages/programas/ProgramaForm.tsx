import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    ArrowLeftRight,
    Camera,
    UserPlus,
    MapPin,
    QrCode,
    ChevronsUpDown,
    Search,
    Monitor,
    Image,
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
import { programasApi, asistenciaApi, tiposAsistenciaApi } from '@/services/api';
import { DatePickerString } from '@/components/ui/date-picker';
import type { Parte, UsuarioSimple, ParteOrdenDto, AsignacionDto, LinkDto, FotoDto, PlantillaPrograma, QRAsistencia, TipoAsistencia } from '@/types';
import { downloadOBSSceneCollection } from '@/lib/obs-scene-export';
import MediaPickerDialog from '@/components/MediaPickerDialog';
import type { OBSExportParte } from '@/lib/obs-scene-export';

// Tipo para identificar a quién se va a reemplazar
export type PersonaReemplazo =
    | { tipo: 'usuario'; id: number; nombre: string }
    | { tipo: 'libre'; nombre: string };

let _keyCounter = 0;
export const genKey = () => `k${++_keyCounter}`;

export interface ParteEnPrograma {
    id: string; // Unique ID for drag & drop
    parteId: number;
    parte: Parte;
    usuarioIds: number[];
    nombresLibres: string[];
    links: { _key: string; nombre: string; url: string }[];
    fotos: { _key: string; url: string; nombre?: string; mediaItemId?: number }[];
}

// Sortable Part Item Component
function VisitasSection({ programaId }: { programaId: number }) {
    const queryClient = useQueryClient();
    const [nombre, setNombre] = useState('');
    const [procedencia, setProcedencia] = useState('');
    const nombreInputRef = useRef<HTMLInputElement>(null);

    const { data: visitas = [] } = useQuery({
        queryKey: ['visitas', programaId],
        queryFn: () => programasApi.getVisitas(programaId),
    });

    const createMutation = useMutation({
        mutationFn: () => programasApi.createVisita(programaId, { nombre, procedencia }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitas', programaId] });
            setNombre('');
            setProcedencia('');
            toast.success('Visita registrada');
            setTimeout(() => nombreInputRef.current?.focus(), 100);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (visitaId: number) => programasApi.deleteVisita(visitaId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitas', programaId] });
        },
    });

    const handleAdd = (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (!nombre.trim() || !procedencia.trim()) return;
        createMutation.mutate();
    };

    return (
        <div className="space-y-3">
            <Label className="text-gray-700 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Visitas ({visitas.length})
            </Label>

            {visitas.length > 0 && (
                <div className="space-y-1.5">
                    {visitas.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-gray-900">{v.nombre}</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {v.procedencia}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 h-7 w-7 p-0"
                                onClick={() => deleteMutation.mutate(v.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(e); } }}>
                <Input
                    ref={nombreInputRef}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del visitante"
                    className="bg-white border-gray-300 text-gray-900 flex-1"
                />
                <Input
                    value={procedencia}
                    onChange={(e) => setProcedencia(e.target.value)}
                    placeholder="Procedencia"
                    className="bg-white border-gray-300 text-gray-900 flex-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!nombre.trim() || !procedencia.trim() || createMutation.isPending}
                    onClick={handleAdd}
                    className="border-gray-300 hover:bg-gray-50 text-gray-700 shrink-0"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                </Button>
            </div>
        </div>
    );
}

function SortableFotoItem({ id, children }: { id: string; children: (listeners: Record<string, unknown>) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children(listeners || {})}
        </div>
    );
}

export function SortableParteItem({
    item,
    usuarios,
    onRemove,
    onUpdateUsuarios,
    onAddFreeText,
    onRemoveFreeText,
    onReplacePersona,
    onAddLink,
    onUpdateLink,
    onRemoveLink,
    onReorderLinks,
    onAddFoto,
    onUpdateFoto,
    onRemoveFoto,
    onReorderFotos,
    onPickFromLibrary,
    programaId,
}: {
    item: ParteEnPrograma;
    usuarios: UsuarioSimple[];
    onRemove?: () => void;
    onUpdateUsuarios: (usuarioId: number, action: 'add' | 'remove') => void;
    onAddFreeText: (nombre: string) => void;
    onRemoveFreeText: (nombre: string) => void;
    onReplacePersona: (persona: PersonaReemplazo) => void;
    onAddLink: () => void;
    onUpdateLink: (index: number, field: 'nombre' | 'url', value: string) => void;
    onRemoveLink: (index: number) => void;
    onReorderLinks?: (fromIndex: number, toIndex: number) => void;
    onAddFoto?: (file: File) => void;
    onUpdateFoto?: (index: number, nombre: string) => void;
    onRemoveFoto?: (index: number) => void;
    onReorderFotos?: (fromIndex: number, toIndex: number) => void;
    onPickFromLibrary?: (item: { url: string; nombre?: string; mediaItemId: number }) => void;
    programaId?: number;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const fotosDndId = useId();
    const linksDndId = useId();
    const [fotosOpen, setFotosOpen] = useState(item.fotos.length > 0);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const fotoInputRef = useRef<HTMLInputElement>(null);
    const fotoSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
        }
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            return `http://${window.location.hostname}:3000`;
        }
        return 'http://localhost:3000';
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
                                                onClick={() => onReplacePersona({ tipo: 'usuario', id: uid, nombre: usuario?.nombre || 'Usuario' })}
                                                className="ml-1 p-0.5 hover:bg-green-200 rounded"
                                                title="Reemplazar en todo el programa"
                                            >
                                                <ArrowLeftRight className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onUpdateUsuarios(uid, 'remove')}
                                                className="p-0.5 hover:bg-green-200 rounded"
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
                                            onClick={() => onReplacePersona({ tipo: 'libre', nombre })}
                                            className="ml-1 p-0.5 hover:bg-amber-200 rounded"
                                            title="Reemplazar en todo el programa"
                                        >
                                            <ArrowLeftRight className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveFreeText(nombre)}
                                            className="p-0.5 hover:bg-amber-200 rounded"
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

                        <DndContext
                            id={linksDndId}
                            sensors={fotoSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                                const { active, over } = event;
                                if (over && active.id !== over.id && onReorderLinks) {
                                    const oldIndex = item.links.findIndex(l => l._key === active.id);
                                    const newIndex = item.links.findIndex(l => l._key === over.id);
                                    if (oldIndex !== -1 && newIndex !== -1) {
                                        onReorderLinks(oldIndex, newIndex);
                                    }
                                }
                            }}
                        >
                            <SortableContext
                                items={item.links.map(l => l._key)}
                                strategy={verticalListSortingStrategy}
                            >
                        {item.links.map((link, index) => (
                            <SortableFotoItem key={link._key} id={link._key}>
                                {(dragListeners) => (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button type="button" {...dragListeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 touch-none hidden sm:flex items-center">
                                    <GripVertical className="h-4 w-4" />
                                </button>
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
                                )}
                            </SortableFotoItem>
                        ))}
                            </SortableContext>
                        </DndContext>

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

                    {/* Visitas - only for Bienvenida parts when editing */}
                    {programaId && item.parte.nombre.toLowerCase().includes('bienvenida') && (
                        <VisitasSection programaId={programaId} />
                    )}

                    {/* Fotos - collapsible, only if part allows it */}
                    {item.parte.permiteFotos && onAddFoto && onRemoveFoto && (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setFotosOpen(!fotosOpen)}
                                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                            >
                                <Camera className="h-4 w-4" />
                                Fotos/Videos {item.fotos.length > 0 && `(${item.fotos.length})`}
                                <ChevronDown className={`h-4 w-4 transition-transform ${fotosOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {fotosOpen && (
                                <div className="space-y-3">
                                    <DndContext
                                        id={fotosDndId}
                                        sensors={fotoSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={(event: DragEndEvent) => {
                                            const { active, over } = event;
                                            if (over && active.id !== over.id && onReorderFotos) {
                                                const oldIndex = item.fotos.findIndex(f => f._key === active.id);
                                                const newIndex = item.fotos.findIndex(f => f._key === over.id);
                                                if (oldIndex !== -1 && newIndex !== -1) {
                                                    onReorderFotos(oldIndex, newIndex);
                                                }
                                            }
                                        }}
                                    >
                                        <SortableContext
                                            items={item.fotos.map(f => f._key)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                    {item.fotos.map((foto, index) => {
                                        const isVideo = /\.(mp4|webm|mov)$/i.test(foto.url);
                                        return (
                                        <SortableFotoItem key={foto._key} id={foto._key}>
                                            {(dragListeners) => (
                                            <div className="flex items-center gap-2">
                                                <button type="button" {...dragListeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0 touch-none">
                                                    <GripVertical className="h-4 w-4" />
                                                </button>
                                                {isVideo ? (
                                                    <video
                                                        src={`${getBaseUrl()}${foto.url}`}
                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                                                        muted
                                                    />
                                                ) : (
                                                    <img
                                                        src={`${getBaseUrl()}${foto.url}`}
                                                        alt={foto.nombre || `Foto ${index + 1}`}
                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                                                    />
                                                )}
                                                <Input
                                                    value={foto.nombre || ''}
                                                    onChange={(e) => onUpdateFoto!(index, e.target.value)}
                                                    placeholder="Título del archivo"
                                                    className="bg-white border-gray-300 text-gray-900 flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onRemoveFoto(index)}
                                                    className="hover:bg-red-50 hover:text-red-600 shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            )}
                                        </SortableFotoItem>
                                        );
                                    })}
                                        </SortableContext>
                                    </DndContext>

                                    <input
                                        ref={fotoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                onAddFoto(file);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fotoInputRef.current?.click()}
                                            className="border-gray-300 hover:bg-gray-50 text-gray-700"
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Subir Foto/Video
                                        </Button>
                                        {onPickFromLibrary && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setMediaPickerOpen(true)}
                                                className="border-gray-300 hover:bg-gray-50 text-gray-700"
                                            >
                                                <Image className="h-4 w-4 mr-2" />
                                                Biblioteca
                                            </Button>
                                        )}
                                    </div>
                                    {onPickFromLibrary && (
                                        <MediaPickerDialog
                                            open={mediaPickerOpen}
                                            onOpenChange={setMediaPickerOpen}
                                            onSelect={onPickFromLibrary}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
    const [qrsDisponibles, setQrsDisponibles] = useState<QRAsistencia[]>([]);
    const [tiposAsistencia, setTiposAsistencia] = useState<TipoAsistencia[]>([]);
    const [selectedQrId, setSelectedQrId] = useState<number | null>(null);
    const [selectedTipoId, setSelectedTipoId] = useState<number | null>(null);
    const [qrAsistenciaData, setQrAsistenciaData] = useState<QRAsistencia | null>(null);
    const [qrComboOpen, setQrComboOpen] = useState(false);

    // Replace persona state
    const [personaAReemplazar, setPersonaAReemplazar] = useState<PersonaReemplazo | null>(null);

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
            const [obligatorias, opcionales, usuariosData, plantillasData, qrsData, tiposData] = await Promise.all([
                programasApi.getPartesObligatorias(),
                programasApi.getPartesOpcionales(),
                programasApi.getUsuarios(),
                !isEditing ? programasApi.getPlantillas() : Promise.resolve([]),
                asistenciaApi.getAllQRs({ limit: 100, activo: true }),
                tiposAsistenciaApi.getAll({ activo: true }),
            ]);

            // Combinar todas las partes
            const todas = [...obligatorias, ...opcionales];
            setTodasLasPartes(todas);
            setUsuarios(usuariosData);
            setPlantillas(plantillasData);
            setTiposAsistencia(tiposData);

            if (isEditing) {
                const programaData = await programasApi.getOne(parseInt(id!));
                setFecha(programaData.fecha.split('T')[0]);
                setTitulo(programaData.titulo);
                setCodigo(programaData.codigo);
                setHoraInicio(programaData.horaInicio || '');
                setHoraFin(programaData.horaFin || '');
                if (programaData.qrAsistencia) {
                    setQrAsistenciaData(programaData.qrAsistencia);
                    setSelectedQrId(programaData.qrAsistencia.id);
                }

                // QRs disponibles: activos sin programa vinculado, o el QR del programa actual
                const programaQrId = programaData.qrAsistencia?.id;
                setQrsDisponibles(
                    qrsData.data.filter(qr => qr.activo && (!qr.programaId || qr.id === programaQrId))
                );

                // Rebuild partes from programa data
                const programaPartes: ParteEnPrograma[] = [];

                // Add parts from programa.partes (saved order)
                if (programaData.partes && programaData.partes.length > 0) {
                    for (const pp of programaData.partes) {
                        const asigs = programaData.asignaciones.filter(a => a.parte.id === pp.parteId);
                        const links = programaData.links.filter(l => l.parte.id === pp.parteId);

                        const fotos = programaData.fotos.filter(f => f.parte.id === pp.parteId);
                        programaPartes.push({
                            id: `parte-${pp.parteId}`,
                            parteId: pp.parteId,
                            parte: pp.parte,
                            usuarioIds: asigs.filter(a => a.usuario).map(a => a.usuario!.id),
                            nombresLibres: asigs.filter(a => !a.usuario && a.nombreLibre).map(a => a.nombreLibre!),
                            links: links.map(l => ({ _key: genKey(), nombre: l.nombre, url: l.url })),
                            fotos: fotos.map(f => ({ _key: genKey(), url: f.url, nombre: f.nombre, mediaItemId: f.mediaItemId })),
                        });
                    }
                } else {
                    // Fallback: use todas las partes que tengan asignaciones
                    for (const parte of todas) {
                        const asigs = programaData.asignaciones.filter(a => a.parte.id === parte.id);
                        const links = programaData.links.filter(l => l.parte.id === parte.id);
                        const fotos = programaData.fotos.filter(f => f.parte.id === parte.id);

                        if (asigs.length > 0 || links.length > 0 || fotos.length > 0) {
                            programaPartes.push({
                                id: `parte-${parte.id}`,
                                parteId: parte.id,
                                parte,
                                usuarioIds: asigs.filter(a => a.usuario).map(a => a.usuario!.id),
                                nombresLibres: asigs.filter(a => !a.usuario && a.nombreLibre).map(a => a.nombreLibre!),
                                links: links.map(l => ({ _key: genKey(), nombre: l.nombre, url: l.url })),
                                fotos: fotos.map(f => ({ _key: genKey(), url: f.url, nombre: f.nombre, mediaItemId: f.mediaItemId })),
                            });
                        }
                    }
                }

                setPartesEnPrograma(programaPartes);
            } else {
                // New program: QRs disponibles (activos sin programa)
                setQrsDisponibles(
                    qrsData.data.filter(qr => qr.activo && !qr.programaId)
                );

                // Show template selector
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
                    fotos: [],
                };
            });

        setPartesEnPrograma(initialPartes);
    };

    /**
     * Handle template selection
     */
    const handleSelectPlantilla = (plantilla: PlantillaPrograma) => {
        loadPlantillaPartes(plantilla);
        setTitulo(plantilla.nombre);
        setShowTemplateSelector(false);
    };

    const handleExportOBS = async () => {
        const partes: OBSExportParte[] = partesEnPrograma.map((p) => ({
            nombre: p.parte.nombre,
            participantes: [],
            links: p.links,
            fotos: p.fotos,
        }));

        // Fetch visitas if editing
        let visitas: { nombre: string; procedencia: string }[] = [];
        if (isEditing) {
            try {
                const visitasData = await programasApi.getVisitas(parseInt(id!));
                visitas = visitasData.map((v) => ({ nombre: v.nombre, procedencia: v.procedencia }));
            } catch {
                // continue without visitas
            }
        }

        downloadOBSSceneCollection({
            titulo: titulo || 'Programa JA',
            fecha: fecha || new Date().toISOString().split('T')[0],
            partes,
            visitas,
        });
        toast.success('Archivo OBS exportado');
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
                fotos: [],
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
                    return { ...p, links: [...p.links, { _key: genKey(), nombre: '', url: '' }] };
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

    const handleReorderLinks = (parteId: number, fromIndex: number, toIndex: number) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, links: arrayMove(p.links, fromIndex, toIndex) };
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

    const handleAddFoto = async (parteId: number, file: File) => {
        try {
            const result = await programasApi.uploadFotoPrograma(file);
            setPartesEnPrograma(prev =>
                prev.map(p => {
                    if (p.parteId === parteId) {
                        return { ...p, fotos: [...p.fotos, { _key: genKey(), url: result.url, mediaItemId: result.mediaItemId }] };
                    }
                    return p;
                })
            );
        } catch {
            toast.error('Error al subir la foto');
        }
    };

    const handlePickFromLibrary = (parteId: number, item: { url: string; nombre?: string; mediaItemId: number }) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, fotos: [...p.fotos, { _key: genKey(), url: item.url, nombre: item.nombre, mediaItemId: item.mediaItemId }] };
                }
                return p;
            })
        );
    };

    const handleUpdateFoto = (parteId: number, index: number, nombre: string) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    const newFotos = [...p.fotos];
                    newFotos[index] = { ...newFotos[index], nombre };
                    return { ...p, fotos: newFotos };
                }
                return p;
            })
        );
    };

    const handleRemoveFoto = (parteId: number, index: number) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, fotos: p.fotos.filter((_, i) => i !== index) };
                }
                return p;
            })
        );
    };

    const handleReorderFotos = (parteId: number, fromIndex: number, toIndex: number) => {
        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (p.parteId === parteId) {
                    return { ...p, fotos: arrayMove(p.fotos, fromIndex, toIndex) };
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

    // Count how many parts a person appears in
    const contarApariciones = (persona: PersonaReemplazo): number => {
        return partesEnPrograma.filter(p => {
            if (persona.tipo === 'usuario') return p.usuarioIds.includes(persona.id);
            return p.nombresLibres.includes(persona.nombre);
        }).length;
    };

    // Replace a person across all parts with a registered user
    const handleReemplazarConUsuario = (usuarioId: number) => {
        if (!personaAReemplazar) return;

        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (personaAReemplazar.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(personaAReemplazar.id)) return p;
                    // Remove old user, add new (avoid duplicates)
                    const sinAnterior = p.usuarioIds.filter(id => id !== personaAReemplazar.id);
                    const nuevos = sinAnterior.includes(usuarioId) ? sinAnterior : [...sinAnterior, usuarioId];
                    return { ...p, usuarioIds: nuevos };
                } else {
                    if (!p.nombresLibres.includes(personaAReemplazar.nombre)) return p;
                    // Remove free text, add user (avoid duplicates)
                    const sinAnterior = p.nombresLibres.filter(n => n !== personaAReemplazar.nombre);
                    const nuevosUsuarios = p.usuarioIds.includes(usuarioId) ? p.usuarioIds : [...p.usuarioIds, usuarioId];
                    return { ...p, nombresLibres: sinAnterior, usuarioIds: nuevosUsuarios };
                }
            })
        );

        const usuario = usuarios.find(u => u.id === usuarioId);
        toast.success(`Reemplazado con ${usuario?.nombre || 'usuario'} en todas las partes`);
        setPersonaAReemplazar(null);
    };

    // Replace a person across all parts with free text
    const handleReemplazarConTexto = (nuevoNombre: string) => {
        if (!personaAReemplazar) return;

        setPartesEnPrograma(prev =>
            prev.map(p => {
                if (personaAReemplazar.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(personaAReemplazar.id)) return p;
                    // Remove user, add free text (avoid duplicates)
                    const sinAnterior = p.usuarioIds.filter(id => id !== personaAReemplazar.id);
                    const nuevosLibres = p.nombresLibres.includes(nuevoNombre) ? p.nombresLibres : [...p.nombresLibres, nuevoNombre];
                    return { ...p, usuarioIds: sinAnterior, nombresLibres: nuevosLibres };
                } else {
                    if (!p.nombresLibres.includes(personaAReemplazar.nombre)) return p;
                    // Replace free text name (avoid duplicates)
                    const sinAnterior = p.nombresLibres.filter(n => n !== personaAReemplazar.nombre);
                    const nuevos = sinAnterior.includes(nuevoNombre) ? sinAnterior : [...sinAnterior, nuevoNombre];
                    return { ...p, nombresLibres: nuevos };
                }
            })
        );

        toast.success(`Reemplazado con "${nuevoNombre}" en todas las partes`);
        setPersonaAReemplazar(null);
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

            // Build fotos
            const fotos: FotoDto[] = partesEnPrograma
                .filter(p => p.fotos.length > 0)
                .flatMap(p =>
                    p.fotos.map(f => ({
                        parteId: p.parteId,
                        url: f.url,
                        nombre: f.nombre,
                        mediaItemId: f.mediaItemId,
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
                    fotos,
                    qrAsistenciaId: selectedQrId || null,
                    tipoAsistenciaId: !selectedQrId && selectedTipoId ? selectedTipoId : undefined,
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
                    fotos,
                    qrAsistenciaId: selectedQrId || undefined,
                    tipoAsistenciaId: !selectedQrId && selectedTipoId ? selectedTipoId : undefined,
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
                    {isEditing && partesEnPrograma.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportOBS}
                            className="border-gray-300"
                        >
                            <Monitor className="h-4 w-4 mr-2" />
                            Exportar OBS
                        </Button>
                    )}
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
                    {(qrsDisponibles.length > 0 || tiposAsistencia.length > 0) && (
                        <div className="md:col-span-2 lg:col-span-4">
                            <Label className="text-gray-700 mb-2 block">QR de Asistencia</Label>
                            {selectedQrId ? (() => {
                                const qr = qrAsistenciaData?.id === selectedQrId
                                    ? qrAsistenciaData
                                    : qrsDisponibles.find(q => q.id === selectedQrId);
                                if (!qr) return null;
                                return (
                                    <div className="flex items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <QrCode className="h-5 w-5 text-green-600 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 truncate">
                                                        {qr.descripcion || qr.codigo}
                                                    </span>
                                                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100 shrink-0">
                                                        Activo
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Código: <span className="font-mono">{qr.codigo}</span>
                                                    {' · '}
                                                    {qr.totalAsistencias} asistencia{qr.totalAsistencias !== 1 ? 's' : ''}
                                                    {qr.tipoAsistencia && (
                                                        <>
                                                            {' · '}
                                                            Tipo: {qr.tipoAsistencia.label}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                setSelectedQrId(null);
                                                setQrAsistenciaData(null);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Desvincular
                                        </Button>
                                    </div>
                                );
                            })() : selectedTipoId ? (() => {
                                const tipo = tiposAsistencia.find(t => t.id === selectedTipoId);
                                if (!tipo) return null;
                                return (
                                    <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <QrCode className="h-5 w-5 text-blue-600 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 truncate">
                                                        Se creará QR &quot;{titulo || 'Sin título'}&quot;
                                                    </span>
                                                    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-100 shrink-0">
                                                        {tipo.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Se creará un nuevo QR de asistencia al guardar
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setSelectedTipoId(null)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Cancelar
                                        </Button>
                                    </div>
                                );
                            })() : (
                                <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <QrCode className="h-5 w-5 text-gray-400" />
                                        <span className="text-gray-500">Sin QR de asistencia vinculado</span>
                                    </div>
                                    <Popover open={qrComboOpen} onOpenChange={setQrComboOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-[200px] justify-between bg-white border-gray-300"
                                            >
                                                <span className="flex items-center gap-2 text-gray-500">
                                                    <Search className="h-4 w-4" />
                                                    Vincular QR...
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[320px] p-0" align="end">
                                            <Command>
                                                <CommandInput placeholder="Buscar QR o tipo..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron resultados</CommandEmpty>
                                                    {qrsDisponibles.length > 0 && (
                                                        <CommandGroup heading="QRs activos">
                                                            {qrsDisponibles.map((q) => (
                                                                <CommandItem
                                                                    key={`qr-${q.id}`}
                                                                    value={`${q.descripcion || ''} ${q.codigo} ${q.tipoAsistencia?.label || ''}`}
                                                                    onSelect={() => {
                                                                        setSelectedQrId(q.id);
                                                                        setSelectedTipoId(null);
                                                                        setQrAsistenciaData(q);
                                                                        setQrComboOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{q.descripcion || q.codigo}</span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {q.codigo}
                                                                            {q.tipoAsistencia && ` · ${q.tipoAsistencia.label}`}
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
                                                                            setSelectedTipoId(tipo.id);
                                                                            setSelectedQrId(null);
                                                                            setQrAsistenciaData(null);
                                                                            setQrComboOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">
                                                                                <Plus className="h-3.5 w-3.5 inline mr-1" />
                                                                                Crear QR — {tipo.label}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500">
                                                                                Se creará al guardar el programa
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
                                    programaId={isEditing ? parseInt(id!) : undefined}
                                    onRemove={() => handleRemoveParte(item.parteId)}
                                    onUpdateUsuarios={(usuarioId, action) => handleUpdateUsuarios(item.parteId, usuarioId, action)}
                                    onAddFreeText={(nombre) => handleAddFreeText(item.parteId, nombre)}
                                    onRemoveFreeText={(nombre) => handleRemoveFreeText(item.parteId, nombre)}
                                    onReplacePersona={(persona) => setPersonaAReemplazar(persona)}
                                    onAddLink={() => handleAddLink(item.parteId)}
                                    onUpdateLink={(index, field, value) => handleUpdateLink(item.parteId, index, field, value)}
                                    onRemoveLink={(index) => handleRemoveLink(item.parteId, index)}
                                    onReorderLinks={(from, to) => handleReorderLinks(item.parteId, from, to)}
                                    onAddFoto={(file) => handleAddFoto(item.parteId, file)}
                                    onUpdateFoto={(index, nombre) => handleUpdateFoto(item.parteId, index, nombre)}
                                    onRemoveFoto={(index) => handleRemoveFoto(item.parteId, index)}
                                    onReorderFotos={(from, to) => handleReorderFotos(item.parteId, from, to)}
                                    onPickFromLibrary={(mediaItem) => handlePickFromLibrary(item.parteId, mediaItem)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Dialog de reemplazo */}
            <Dialog open={!!personaAReemplazar} onOpenChange={(open) => { if (!open) setPersonaAReemplazar(null); }}>
                <DialogContent className="bg-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                            Reemplazar persona
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Reemplazar a <span className="font-semibold text-gray-700">{personaAReemplazar?.nombre}</span> en{' '}
                            <span className="font-semibold text-gray-700">
                                {personaAReemplazar ? contarApariciones(personaAReemplazar) : 0} parte(s)
                            </span>{' '}
                            del programa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <Label className="text-gray-700 text-sm">Seleccionar reemplazo</Label>
                        <UserAutocomplete
                            usuarios={usuarios}
                            selectedIds={personaAReemplazar?.tipo === 'usuario' ? [personaAReemplazar.id] : []}
                            onSelect={handleReemplazarConUsuario}
                            onAddFreeText={handleReemplazarConTexto}
                            placeholder="Buscar reemplazo..."
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </form>
    );
}
