import { useState } from 'react';
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
} from '@dnd-kit/sortable';
import {
    Plus,
    Loader2,
    ArrowLeftRight,
    CloudDownload,
    Check,
    ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import UserAutocomplete from '@/components/UserAutocomplete';
import MediaPickerDialog from '@/components/MediaPickerDialog';
import { programasApi, mediaApi } from '@/services/api';
import type { Parte, UsuarioSimple } from '@/types';
import { SortableParteItem, genKey } from './ProgramaForm';
import type { ParteEnPrograma, PersonaReemplazo } from './ProgramaForm';

import { cn } from '@/lib/utils';

interface ProgramPartesProps {
    partes: ParteEnPrograma[];
    todasLasPartes: Parte[];
    usuarios: UsuarioSimple[];
    programaId?: number;
    onPartesChange: (partes: ParteEnPrograma[]) => void;
    compact?: boolean;
}

export default function ProgramPartes({
    partes,
    todasLasPartes,
    usuarios,
    programaId,
    onPartesChange,
    compact,
}: ProgramPartesProps) {
    const [personaAReemplazar, setPersonaAReemplazar] = useState<PersonaReemplazo | null>(null);
    const [downloadingLink, setDownloadingLink] = useState<string | null>(null);
    const [batchDownloading, setBatchDownloading] = useState<string | null>(null);
    const [libraryPickerInstanceId, setLibraryPickerInstanceId] = useState<string | null>(null);
    const [addParteOpen, setAddParteOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Helper to update partes via transform function
    const updatePartes = (updater: (prev: ParteEnPrograma[]) => ParteEnPrograma[]) => {
        onPartesChange(updater(partes));
    };

    // --- Available partes for autocomplete ---
    const availablePartes = todasLasPartes.filter(
        (p: Parte) => p.permitirMultiples || !partes.some(ep => ep.parteId === p.id)
    );

    // --- Handlers ---

    const handleAddParte = (parteId: number) => {
        const parte = todasLasPartes.find((p: Parte) => p.id === parteId);
        if (!parte) return;

        if (!parte.permitirMultiples && partes.some(p => p.parteId === parteId)) {
            toast.error('Esta parte ya está en el programa');
            return;
        }

        onPartesChange([
            ...partes,
            {
                id: `parte-${parte.id}-${Date.now()}`,
                parteId: parte.id,
                parte,
                usuarioIds: [],
                nombresLibres: [],
                links: [],
                fotos: [],
            },
        ]);
        setAddParteOpen(false);
    };

    const handleRemoveParte = (instanceId: string) => {
        onPartesChange(partes.filter(p => p.id !== instanceId));
    };

    const handleUpdateUsuarios = (instanceId: string, usuarioId: number, action: 'add' | 'remove') => {
        updatePartes(prev => {
            const currentParte = prev.find(p => p.id === instanceId);
            if (!currentParte) return prev;

            let newPartes = prev.map(p => {
                if (p.id === instanceId) {
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

            return newPartes;
        });
    };

    const handleAddLink = (instanceId: string) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, links: [...p.links, { _key: genKey(), nombre: '', url: '' }] }
                : p
        ));
    };

    const handleUpdateLink = (instanceId: string, index: number, field: 'nombre' | 'url', value: string) => {
        updatePartes(prev => prev.map(p => {
            if (p.id === instanceId) {
                const newLinks = [...p.links];
                newLinks[index] = { ...newLinks[index], [field]: value };
                return { ...p, links: newLinks };
            }
            return p;
        }));

        // Auto-match YouTube URL to existing media
        if (field === 'url' && value) {
            try {
                const u = new URL(value);
                if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
                    mediaApi.findByYoutubeUrl(value).then(existing => {
                        if (existing) {
                            updatePartes(prev => prev.map(p => {
                                if (p.id === instanceId) {
                                    const newLinks = [...p.links];
                                    if (newLinks[index] && !newLinks[index].mediaItemId) {
                                        newLinks[index] = { ...newLinks[index], mediaItemId: existing.id, mediaUrl: existing.url };
                                    }
                                    return { ...p, links: newLinks };
                                }
                                return p;
                            }));
                            toast.success(`Video encontrado en biblioteca: ${existing.nombre || 'YouTube'}`);
                        }
                    }).catch(() => {});
                }
            } catch {}
        }
    };

    const handleRemoveLink = (instanceId: string, index: number) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, links: p.links.filter((_, i) => i !== index) }
                : p
        ));
    };

    const handleReorderLinks = (instanceId: string, fromIndex: number, toIndex: number) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, links: arrayMove(p.links, fromIndex, toIndex) }
                : p
        ));
    };

    const handleAddFoto = async (instanceId: string, file: File) => {
        try {
            const result = await programasApi.uploadFotoPrograma(file);
            updatePartes(prev => prev.map(p =>
                p.id === instanceId
                    ? { ...p, fotos: [...p.fotos, { _key: genKey(), url: result.url, mediaItemId: result.mediaItemId }] }
                    : p
            ));
        } catch {
            toast.error('Error al subir la foto');
        }
    };

    const handlePickFromLibrary = (instanceId: string, item: { url: string; nombre?: string; mediaItemId: number }) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, fotos: [...p.fotos, { _key: genKey(), url: item.url, nombre: item.nombre, mediaItemId: item.mediaItemId }] }
                : p
        ));
    };

    const handleUpdateFoto = (instanceId: string, index: number, nombre: string) => {
        updatePartes(prev => prev.map(p => {
            if (p.id === instanceId) {
                const newFotos = [...p.fotos];
                newFotos[index] = { ...newFotos[index], nombre };
                return { ...p, fotos: newFotos };
            }
            return p;
        }));
    };

    const handleRemoveFoto = (instanceId: string, index: number) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, fotos: p.fotos.filter((_, i) => i !== index) }
                : p
        ));
    };

    const handleReorderFotos = (instanceId: string, fromIndex: number, toIndex: number) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, fotos: arrayMove(p.fotos, fromIndex, toIndex) }
                : p
        ));
    };

    const handleAddFreeText = (instanceId: string, nombre: string) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId && !p.nombresLibres.includes(nombre)
                ? { ...p, nombresLibres: [...p.nombresLibres, nombre] }
                : p
        ));
    };

    const handleRemoveFreeText = (instanceId: string, nombre: string) => {
        updatePartes(prev => prev.map(p =>
            p.id === instanceId
                ? { ...p, nombresLibres: p.nombresLibres.filter(n => n !== nombre) }
                : p
        ));
    };

    const handleDownloadYouTube = async (instanceId: string, linkIndex: number) => {
        const parte = partes.find(p => p.id === instanceId);
        if (!parte) return;
        const link = parte.links[linkIndex];
        if (!link?.url) return;

        const downloadKey = `${instanceId}-${linkIndex}`;
        setDownloadingLink(downloadKey);
        try {
            const mediaItem = await mediaApi.downloadYouTube(
                link.url,
                link.nombre || undefined,
                (link as any).id,
            );
            updatePartes(prev => prev.map(p => {
                if (p.id === instanceId) {
                    const newLinks = [...p.links];
                    newLinks[linkIndex] = { ...newLinks[linkIndex], mediaItemId: mediaItem.id, mediaUrl: mediaItem.url };
                    return { ...p, links: newLinks };
                }
                return p;
            }));
            toast.success(`Video descargado: ${mediaItem.nombre || 'YouTube'}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error al descargar el video');
        } finally {
            setDownloadingLink(null);
        }
    };

    const handleAssociateMediaToLink = (instanceId: string, linkIndex: number, mediaItem: { id: number; url: string; nombre?: string }) => {
        updatePartes(prev => prev.map(p => {
            if (p.id === instanceId) {
                const newLinks = [...p.links];
                newLinks[linkIndex] = { ...newLinks[linkIndex], mediaItemId: mediaItem.id, mediaUrl: mediaItem.url };
                return { ...p, links: newLinks };
            }
            return p;
        }));
        toast.success(`Video importado: ${mediaItem.nombre || 'Biblioteca'}`);
    };

    const handleAddLinkFromLibrary = (instanceId: string) => {
        setLibraryPickerInstanceId(instanceId);
    };

    const handleLibraryPickerSelect = (instanceId: string, selected: { mediaItemId: number; url: string; nombre?: string }) => {
        updatePartes(prev => prev.map(p => {
            if (p.id === instanceId) {
                return {
                    ...p,
                    links: [...p.links, {
                        _key: genKey(),
                        nombre: selected.nombre || 'Video',
                        url: '',
                        mediaItemId: selected.mediaItemId,
                        mediaUrl: selected.url,
                        mediaName: selected.nombre,
                    }],
                };
            }
            return p;
        }));
        setLibraryPickerInstanceId(null);
        toast.success(`Video agregado: ${selected.nombre || 'Biblioteca'}`);
    };

    const handleDownloadBatch = async (instanceId: string) => {
        const parte = partes.find(p => p.id === instanceId);
        if (!parte) return;

        const isYouTube = (url: string) => {
            try { const u = new URL(url); return u.hostname.includes('youtube.com') || u.hostname === 'youtu.be'; } catch { return false; }
        };
        const pendingLinks = parte.links
            .map((l, i) => ({ ...l, originalIndex: i }))
            .filter(l => !l.mediaItemId && isYouTube(l.url));

        if (pendingLinks.length === 0) return;

        setBatchDownloading(instanceId);
        try {
            const results = await mediaApi.downloadYouTubeBatch(
                pendingLinks.map(l => ({ url: l.url, nombre: l.nombre || undefined }))
            );
            updatePartes(prev => prev.map(p => {
                if (p.id === instanceId) {
                    const newLinks = [...p.links];
                    results.forEach((result, i) => {
                        if (result.mediaItem) {
                            const idx = pendingLinks[i].originalIndex;
                            newLinks[idx] = { ...newLinks[idx], mediaItemId: result.mediaItem.id, mediaUrl: result.mediaItem.url };
                        }
                    });
                    return { ...p, links: newLinks };
                }
                return p;
            }));
            const downloaded = results.filter(r => r.mediaItem && !r.skipped).length;
            const skipped = results.filter(r => r.skipped).length;
            const errors = results.filter(r => r.error).length;
            let msg = `${downloaded} video(s) descargado(s)`;
            if (skipped > 0) msg += `, ${skipped} ya existían`;
            if (errors > 0) msg += `, ${errors} error(es)`;
            toast.success(msg);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error al descargar videos');
        } finally {
            setBatchDownloading(null);
        }
    };

    // --- Persona replacement ---

    const contarApariciones = (persona: PersonaReemplazo): number => {
        return partes.filter(p => {
            if (persona.tipo === 'usuario') return p.usuarioIds.includes(persona.id);
            return p.nombresLibres.includes(persona.nombre);
        }).length;
    };

    const handleReemplazarConUsuario = (usuarioId: number) => {
        if (!personaAReemplazar) return;
        updatePartes(prev =>
            prev.map(p => {
                if (personaAReemplazar.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(personaAReemplazar.id)) return p;
                    const sinAnterior = p.usuarioIds.filter(id => id !== personaAReemplazar.id);
                    const nuevos = sinAnterior.includes(usuarioId) ? sinAnterior : [...sinAnterior, usuarioId];
                    return { ...p, usuarioIds: nuevos };
                } else {
                    if (!p.nombresLibres.includes(personaAReemplazar.nombre)) return p;
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

    const handleReemplazarConTexto = (nuevoNombre: string) => {
        if (!personaAReemplazar) return;
        updatePartes(prev =>
            prev.map(p => {
                if (personaAReemplazar.tipo === 'usuario') {
                    if (!p.usuarioIds.includes(personaAReemplazar.id)) return p;
                    const sinAnterior = p.usuarioIds.filter(id => id !== personaAReemplazar.id);
                    const nuevosLibres = p.nombresLibres.includes(nuevoNombre) ? p.nombresLibres : [...p.nombresLibres, nuevoNombre];
                    return { ...p, usuarioIds: sinAnterior, nombresLibres: nuevosLibres };
                } else {
                    if (!p.nombresLibres.includes(personaAReemplazar.nombre)) return p;
                    const sinAnterior = p.nombresLibres.filter(n => n !== personaAReemplazar.nombre);
                    const nuevos = sinAnterior.includes(nuevoNombre) ? sinAnterior : [...sinAnterior, nuevoNombre];
                    return { ...p, nombresLibres: nuevos };
                }
            })
        );
        toast.success(`Reemplazado con "${nuevoNombre}" en todas las partes`);
        setPersonaAReemplazar(null);
    };

    // --- DnD ---

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            updatePartes(items => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // --- Global batch download ---

    const isYouTubeUrl = (url: string) => {
        try { const u = new URL(url); return u.hostname.includes('youtube.com') || u.hostname === 'youtu.be'; } catch { return false; }
    };
    const allPendingYt = partes.flatMap(p =>
        p.links.filter(l => !l.mediaItemId && isYouTubeUrl(l.url))
    );

    const handleGlobalBatchDownload = async () => {
        const allItems: { url: string; nombre?: string; instanceId: string; linkIndex: number }[] = [];
        for (const p of partes) {
            p.links.forEach((l, i) => {
                if (!l.mediaItemId && isYouTubeUrl(l.url)) {
                    allItems.push({ url: l.url, nombre: l.nombre || undefined, instanceId: p.id, linkIndex: i });
                }
            });
        }
        if (allItems.length === 0) return;
        setBatchDownloading('__global__');
        try {
            const results = await mediaApi.downloadYouTubeBatch(
                allItems.map(it => ({ url: it.url, nombre: it.nombre }))
            );
            updatePartes(prev => {
                const next = prev.map(p => ({ ...p, links: [...p.links] }));
                results.forEach((result, i) => {
                    if (result.mediaItem) {
                        const meta = allItems[i];
                        const parte = next.find(p => p.id === meta.instanceId);
                        if (parte) {
                            parte.links[meta.linkIndex] = {
                                ...parte.links[meta.linkIndex],
                                mediaItemId: result.mediaItem.id,
                                mediaUrl: result.mediaItem.url,
                            };
                        }
                    }
                });
                return next;
            });
            const downloaded = results.filter(r => r.mediaItem && !r.skipped).length;
            const skipped = results.filter(r => r.skipped).length;
            const errors = results.filter(r => r.error).length;
            let msg = `${downloaded} video(s) descargado(s)`;
            if (skipped > 0) msg += `, ${skipped} ya existían`;
            if (errors > 0) msg += `, ${errors} error(es)`;
            toast.success(msg);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Error al descargar videos');
        } finally {
            setBatchDownloading(null);
        }
    };

    // --- Render ---

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        {!compact && (
                            <>
                                <h2 className="text-lg font-semibold text-gray-900">Partes del Programa</h2>
                                <p className="text-sm text-gray-500">
                                    Arrastra las partes para reordenarlas. Puedes eliminar cualquier parte.
                                </p>
                            </>
                        )}
                        {compact && (
                            <span className="text-sm font-medium text-gray-700">
                                {partes.length} parte{partes.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Add Part - Autocomplete */}
                    <Popover open={addParteOpen} onOpenChange={setAddParteOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size={compact ? 'sm' : 'default'}
                                className={cn(
                                    'border-gray-300 hover:bg-gray-50',
                                    compact && 'h-7 text-xs',
                                )}
                            >
                                <Plus className={cn('mr-1', compact ? 'h-3 w-3' : 'h-4 w-4 mr-2')} />
                                {compact ? 'Agregar' : 'Agregar Parte'}
                                <ChevronsUpDown className={cn('ml-1 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4 ml-2')} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                            <Command>
                                <CommandInput placeholder="Buscar parte..." />
                                <CommandList>
                                    <CommandEmpty>No se encontraron partes.</CommandEmpty>
                                    <CommandGroup>
                                        {availablePartes.map((parte: Parte) => (
                                            <CommandItem
                                                key={parte.id}
                                                value={parte.nombre}
                                                onSelect={() => handleAddParte(parte.id)}
                                            >
                                                {parte.nombre}
                                                {parte.permitirMultiples && partes.some(ep => ep.parteId === parte.id) && (
                                                    <Check className="ml-auto h-4 w-4 text-green-500" />
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Global batch download */}
                {allPendingYt.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGlobalBatchDownload}
                        disabled={batchDownloading !== null}
                        className="border-purple-300 hover:bg-purple-50 text-purple-700"
                    >
                        {batchDownloading !== null ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <CloudDownload className="h-4 w-4 mr-2" />
                        )}
                        {batchDownloading !== null ? 'Descargando...' : `Descargar todos los videos (${allPendingYt.length})`}
                    </Button>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={partes.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid gap-4">
                            {partes.map((item) => (
                                <SortableParteItem
                                    key={item.id}
                                    item={item}
                                    usuarios={usuarios}
                                    programaId={programaId}
                                    onRemove={() => handleRemoveParte(item.id)}
                                    onUpdateUsuarios={(usuarioId, action) => handleUpdateUsuarios(item.id, usuarioId, action)}
                                    onAddFreeText={(nombre) => handleAddFreeText(item.id, nombre)}
                                    onRemoveFreeText={(nombre) => handleRemoveFreeText(item.id, nombre)}
                                    onReplacePersona={(persona) => setPersonaAReemplazar(persona)}
                                    onAddLink={() => handleAddLink(item.id)}
                                    onAddLinkFromLibrary={() => handleAddLinkFromLibrary(item.id)}
                                    onUpdateLink={(index, field, value) => handleUpdateLink(item.id, index, field, value)}
                                    onRemoveLink={(index) => handleRemoveLink(item.id, index)}
                                    onReorderLinks={(from, to) => handleReorderLinks(item.id, from, to)}
                                    onAddFoto={(file) => handleAddFoto(item.id, file)}
                                    onUpdateFoto={(index, nombre) => handleUpdateFoto(item.id, index, nombre)}
                                    onRemoveFoto={(index) => handleRemoveFoto(item.id, index)}
                                    onReorderFotos={(from, to) => handleReorderFotos(item.id, from, to)}
                                    onPickFromLibrary={(mediaItem) => handlePickFromLibrary(item.id, mediaItem)}
                                    onDownloadYouTube={(linkIndex) => handleDownloadYouTube(item.id, linkIndex)}
                                    onAssociateMedia={(linkIndex, mediaItem) => handleAssociateMediaToLink(item.id, linkIndex, mediaItem)}
                                    onDownloadBatch={() => handleDownloadBatch(item.id)}
                                    downloadingLinkKey={downloadingLink}
                                    batchDownloading={batchDownloading === item.id}
                                    fetchSearch={(q) => programasApi.getUsuarios(q)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Library picker dialog */}
            {libraryPickerInstanceId !== null && (
                <MediaPickerDialog
                    open={true}
                    onOpenChange={(open) => { if (!open) setLibraryPickerInstanceId(null); }}
                    onSelect={(selected) => handleLibraryPickerSelect(libraryPickerInstanceId, selected)}
                />
            )}

            {/* Replace persona dialog */}
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
                            fetchSearch={(q) => programasApi.getUsuarios(q)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
