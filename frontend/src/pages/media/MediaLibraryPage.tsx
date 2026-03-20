import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Image,
    Film,
    Upload,
    Loader2,
    Search,
    Trash2,
    Pencil,
    Check,
    X,
    FileImage,
    RefreshCw,
    Eye,
    CheckSquare,
    Download,
    CheckCircle2,
    AlertCircle,
    Clock,
    RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mediaApi } from '@/services/api';
import type { MediaItem, TagMedia } from '@/types';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function MediaLibraryPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [uploadPhase, setUploadPhase] = useState<'naming' | 'uploading' | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editTag, setEditTag] = useState<TagMedia>('OTRO');
    const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadNames, setUploadNames] = useState<string[]>([]);
    const [replaceTarget, setReplaceTarget] = useState<MediaItem | null>(null);
    const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
    const [activeTag, setActiveTag] = useState<TagMedia | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteMultiOpen, setDeleteMultiOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['media-library', debouncedSearch, page, activeTag],
        queryFn: () => mediaApi.getAll({ page, limit: 24, search: debouncedSearch || undefined, tag: activeTag || undefined }),
    });

    const items = data?.data || [];
    const meta = data?.meta;

    const renameMutation = useMutation({
        mutationFn: ({ id, nombre, tag }: { id: number; nombre: string; tag: TagMedia }) =>
            mediaApi.update(id, { nombre, tag }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            setEditingId(null);
            toast.success('Medio actualizado');
        },
        onError: () => toast.error('Error al actualizar'),
    });

    const replaceMutation = useMutation({
        mutationFn: ({ id, file }: { id: number; file: File }) =>
            mediaApi.replace(id, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            setReplaceTarget(null);
            toast.success(`Archivo reemplazado (${data._count?.programaFotos || 0} programa(s) actualizados)`);
        },
        onError: () => toast.error('Error al reemplazar'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => mediaApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            setDeleteTarget(null);
            toast.success('Archivo eliminado');
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Error al eliminar');
            setDeleteTarget(null);
        },
    });

    const deleteBatchMutation = useMutation({
        mutationFn: (ids: number[]) => mediaApi.deleteBatch(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            setDeleteMultiOpen(false);
            setSelectedIds(new Set());
            setSelectMode(false);
            toast.success(`${data.deleted} archivo(s) eliminado(s)`);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Error al eliminar');
            setDeleteMultiOpen(false);
        },
    });

    const toggleSelect = useCallback((id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    }, [selectedIds.size, items]);

    const exitSelectMode = useCallback(() => {
        setSelectMode(false);
        setSelectedIds(new Set());
    }, []);

    const [uploadTags, setUploadTags] = useState<TagMedia[]>([]);

    type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';
    interface FileUploadState {
        file: File;
        name: string;
        tag: TagMedia;
        status: FileUploadStatus;
        progress: number;
        error?: string;
    }
    const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);

    const detectTagFromFile = (file: File, name: string): TagMedia => {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('himno') || nameLower.includes('adventista') || nameLower.includes('hymn')) return 'HIMNO';
        if (file.type.startsWith('image/')) return 'IMAGEN';
        if (file.type.startsWith('video/')) return 'VIDEO';
        return 'OTRO';
    };

    const handleFilesSelected = (files: FileList) => {
        const fileArr = Array.from(files);
        setPendingFiles(fileArr);
        const names = fileArr.map(f => f.name.replace(/\.[^/.]+$/, ''));
        setUploadNames(names);
        setUploadTags(fileArr.map((f, i) => detectTagFromFile(f, names[i])));
    };

    const updateUploadState = useCallback((index: number, update: Partial<FileUploadState>) => {
        setUploadStates(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
    }, []);

    const uploadFilesParallel = useCallback(async (states: FileUploadState[]) => {
        const pending = states
            .map((s, i) => ({ ...s, globalIdx: i }))
            .filter(s => s.status === 'pending' || s.status === 'error');
        const concurrency = 3;
        let idx = 0;

        const uploadOne = async () => {
            while (idx < pending.length) {
                const current = idx++;
                const item = pending[current];
                updateUploadState(item.globalIdx, { status: 'uploading', progress: 0 });
                try {
                    await mediaApi.upload(item.file, item.name, item.tag, (progress) => {
                        updateUploadState(item.globalIdx, { progress });
                    });
                    updateUploadState(item.globalIdx, { status: 'done', progress: 100 });
                } catch (e: any) {
                    updateUploadState(item.globalIdx, {
                        status: 'error',
                        progress: 0,
                        error: e?.response?.data?.message || 'Error al subir',
                    });
                }
            }
        };

        await Promise.all(Array.from({ length: concurrency }, () => uploadOne()));
    }, [updateUploadState]);

    const handleConfirmUpload = async () => {
        const initialStates: FileUploadState[] = pendingFiles.map((file, i) => ({
            file,
            name: uploadNames[i]?.trim() || file.name.replace(/\.[^/.]+$/, ''),
            tag: uploadTags[i] || 'OTRO',
            status: 'pending' as const,
            progress: 0,
        }));
        setUploadStates(initialStates);
        setUploadPhase('uploading');
        await uploadFilesParallel(initialStates);
    };

    const handleRetryOne = useCallback(async (index: number) => {
        setUploadStates(prev => prev.map((s, i) => i === index ? { ...s, status: 'uploading' as const, progress: 0, error: undefined } : s));
        const item = uploadStates[index];
        try {
            await mediaApi.upload(item.file, item.name, item.tag, (progress) => {
                updateUploadState(index, { progress });
            });
            updateUploadState(index, { status: 'done', progress: 100 });
        } catch (e: any) {
            updateUploadState(index, {
                status: 'error',
                progress: 0,
                error: e?.response?.data?.message || 'Error al subir',
            });
        }
    }, [uploadStates, updateUploadState]);

    const handleRetryAllFailed = useCallback(async () => {
        const resetStates = uploadStates.map(s =>
            s.status === 'error' ? { ...s, status: 'pending' as const, progress: 0, error: undefined } : s
        );
        setUploadStates(resetStates);
        await uploadFilesParallel(resetStates);
    }, [uploadStates, uploadFilesParallel]);

    const handleCloseUploadDialog = useCallback(() => {
        const hasUploaded = uploadStates.some(s => s.status === 'done');
        setPendingFiles([]);
        setUploadNames([]);
        setUploadTags([]);
        setUploadStates([]);
        setUploadPhase(null);
        if (hasUploaded) {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            const doneCount = uploadStates.filter(s => s.status === 'done').length;
            toast.success(`${doneCount} archivo(s) subido(s)`);
        }
    }, [uploadStates, queryClient]);

    const uploadSummary = {
        total: uploadStates.length,
        done: uploadStates.filter(s => s.status === 'done').length,
        uploading: uploadStates.filter(s => s.status === 'uploading').length,
        error: uploadStates.filter(s => s.status === 'error').length,
        pending: uploadStates.filter(s => s.status === 'pending').length,
    };
    const isUploadActive = uploadSummary.uploading > 0 || uploadSummary.pending > 0;

    const startEdit = (item: MediaItem) => {
        setEditingId(item.id);
        setEditName(item.nombre || item.nombreOriginal || '');
        setEditTag(item.tag || 'OTRO');
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            renameMutation.mutate({ id: editingId, nombre: editName.trim(), tag: editTag });
        }
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

    const isVideo = (mimeType: string) => mimeType.startsWith('video/');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileImage className="h-6 w-6 text-blue-600" />
                        Biblioteca de Medios
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {meta ? `${meta.total} archivo(s)` : 'Cargando...'}
                        {' — '}Las fotos subidas aquí se pueden reutilizar en cualquier programa.
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFilesSelected(e.target.files);
                                e.target.value = '';
                            }
                        }}
                    />
                    {!selectMode ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setSelectMode(true)}
                                className="border-gray-300"
                            >
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Seleccionar
                            </Button>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadPhase === 'uploading'}
                            >
                                {uploadPhase === 'uploading' ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                Subir archivos
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="border-gray-300"
                            >
                                {selectedIds.size === items.length && items.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={selectedIds.size === 0}
                                onClick={() => setDeleteMultiOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar ({selectedIds.size})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exitSelectMode}
                                className="border-gray-300"
                            >
                                Cancelar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Search + Tags */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Buscar por nombre..."
                        className="pl-9 bg-white border-gray-300"
                    />
                </div>
                <div className="flex gap-1 flex-wrap">
                    {([null, 'HIMNO', 'VIDEO', 'IMAGEN', 'ANUNCIO', 'OTRO'] as (TagMedia | null)[]).map((tag) => (
                        <Button
                            key={tag ?? 'ALL'}
                            variant={activeTag === tag ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => { setActiveTag(tag); setPage(1); }}
                            className={activeTag === tag ? '' : 'border-gray-300 text-gray-600'}
                        >
                            {tag === null ? 'Todos' : tag === 'HIMNO' ? 'Himnos' : tag === 'VIDEO' ? 'Videos' : tag === 'IMAGEN' ? 'Imágenes' : tag === 'ANUNCIO' ? 'Anuncios' : 'Otros'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Image className="h-12 w-12 mb-3 text-gray-300" />
                    <p className="font-medium">
                        {search ? 'No se encontraron resultados' : 'La biblioteca está vacía'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Sube fotos o videos para empezar a usarlos en tus programas.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.map((item) => (
                        <Card
                            key={item.id}
                            className={`bg-white border-gray-200 overflow-hidden group ${selectMode && selectedIds.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={selectMode ? () => toggleSelect(item.id) : undefined}
                        >
                            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                                {isVideo(item.mimeType) ? (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film className="h-10 w-10 text-gray-400" />
                                    </div>
                                ) : (
                                    <img
                                        src={`${getBaseUrl()}${item.url}`}
                                        alt={item.nombre || item.nombreOriginal || ''}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                )}
                                {/* Select mode checkbox */}
                                {selectMode && (
                                    <div className="absolute top-1.5 left-1.5 z-10">
                                        <Checkbox
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={() => toggleSelect(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-white"
                                        />
                                    </div>
                                )}
                                {/* Actions overlay */}
                                {!selectMode && (
                                <div
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                    onClick={() => setPreviewItem(item)}
                                >
                                    <Eye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-white drop-shadow" />
                                </div>
                                )}
                                {/* Action buttons */}
                                {!selectMode && (
                                <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        title="Descargar"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const res = await fetch(item.url);
                                                const blob = await res.blob();
                                                const a = document.createElement('a');
                                                a.href = URL.createObjectURL(blob);
                                                const ext = item.nombreOriginal?.match(/\.[^/.]+$/)?.[0] || '';
                                                const baseName = item.nombre || item.nombreOriginal || 'archivo';
                                                a.download = baseName.match(/\.[^/.]+$/) ? baseName : baseName + ext;
                                                a.click();
                                                URL.revokeObjectURL(a.href);
                                            } catch {
                                                toast.error('Error al descargar');
                                            }
                                        }}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        title="Renombrar"
                                        onClick={() => startEdit(item)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        title="Reemplazar archivo"
                                        onClick={() => {
                                            setReplaceTarget(item);
                                            setTimeout(() => replaceInputRef.current?.click(), 100);
                                        }}
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7 hover:bg-red-100 hover:text-red-600"
                                        title="Eliminar"
                                        onClick={() => setDeleteTarget(item)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                )}
                                {/* Tag + Usage badges */}
                                <div className="absolute top-1.5 right-1.5 flex gap-1">
                                    {item.tag && item.tag !== 'OTRO' && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-white/80">
                                            {item.tag === 'HIMNO' ? '🎵' : item.tag === 'VIDEO' ? '🎬' : item.tag === 'IMAGEN' ? '🖼️' : item.tag === 'ANUNCIO' ? '📢' : ''} {item.tag.toLowerCase()}
                                        </Badge>
                                    )}
                                    {item._count && item._count.programaFotos > 0 && (
                                        <Badge className="text-[10px] px-1.5 py-0.5">
                                            {item._count.programaFotos} uso{item._count.programaFotos > 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <CardContent className="p-2">
                                {editingId === item.id ? (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-7 text-xs bg-white border-gray-300"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit();
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                            />
                                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveEdit}>
                                                <Check className="h-3.5 w-3.5 text-green-600" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                                                <X className="h-3.5 w-3.5 text-gray-400" />
                                            </Button>
                                        </div>
                                        <select
                                            value={editTag}
                                            onChange={(e) => setEditTag(e.target.value as TagMedia)}
                                            className="w-full h-6 text-[10px] rounded border border-gray-300 bg-white px-1"
                                        >
                                            <option value="HIMNO">Himno</option>
                                            <option value="VIDEO">Video</option>
                                            <option value="IMAGEN">Imagen</option>
                                            <option value="ANUNCIO">Anuncio</option>
                                            <option value="OTRO">Otro</option>
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                            {item.nombre || item.nombreOriginal || 'Sin nombre'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {item.tamanio > 0 ? `${formatFileSize(item.tamanio)} · ` : ''}{formatDate(item.createdAt)}
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-gray-500">
                        Página {meta.page} de {meta.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {/* Hidden input for replace */}
            <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && replaceTarget) {
                        replaceMutation.mutate({ id: replaceTarget.id, file });
                        e.target.value = '';
                    }
                }}
            />

            {/* Upload dialog — Phase 1: Naming / Phase 2: Uploading */}
            <Dialog
                open={pendingFiles.length > 0 || uploadPhase === 'uploading'}
                onOpenChange={(open) => {
                    if (!open) {
                        if (isUploadActive) return; // don't close while uploading
                        handleCloseUploadDialog();
                    }
                }}
            >
                <DialogContent className="bg-white sm:max-w-lg">
                    {uploadPhase === 'uploading' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-gray-900">
                                    Subiendo {uploadSummary.total} archivo{uploadSummary.total !== 1 ? 's' : ''}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    {uploadSummary.done} completado{uploadSummary.done !== 1 ? 's' : ''}
                                    {uploadSummary.uploading > 0 && ` · ${uploadSummary.uploading} en progreso`}
                                    {uploadSummary.pending > 0 && ` · ${uploadSummary.pending} en espera`}
                                    {uploadSummary.error > 0 && ` · ${uploadSummary.error} con error`}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {uploadStates.map((state, i) => (
                                    <div key={i} className="flex items-center gap-3 py-1.5">
                                        {state.file.type.startsWith('video/') ? (
                                            <div className="w-9 h-9 bg-gray-100 rounded flex items-center justify-center shrink-0">
                                                <Film className="h-4 w-4 text-gray-400" />
                                            </div>
                                        ) : (
                                            <img
                                                src={URL.createObjectURL(state.file)}
                                                alt=""
                                                className="w-9 h-9 object-cover rounded border border-gray-200 shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{state.name}</p>
                                            {state.status === 'pending' && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Clock className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs text-gray-400">En espera...</span>
                                                </div>
                                            )}
                                            {state.status === 'uploading' && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Progress value={state.progress} className="h-2 flex-1" />
                                                    <span className="text-xs text-blue-600 font-medium w-8 text-right">{state.progress}%</span>
                                                </div>
                                            )}
                                            {state.status === 'done' && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                    <span className="text-xs text-green-600">Completado</span>
                                                </div>
                                            )}
                                            {state.status === 'error' && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                                    <span className="text-xs text-red-600">Error</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-xs text-red-600 hover:text-red-700 ml-auto"
                                                        onClick={() => handleRetryOne(i)}
                                                    >
                                                        <RotateCcw className="h-3 w-3 mr-1" />
                                                        Reintentar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                {uploadSummary.error > 1 && !isUploadActive && (
                                    <Button
                                        variant="outline"
                                        onClick={handleRetryAllFailed}
                                        className="border-gray-300"
                                    >
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Reintentar fallidos ({uploadSummary.error})
                                    </Button>
                                )}
                                <Button
                                    variant={isUploadActive ? 'outline' : 'default'}
                                    onClick={handleCloseUploadDialog}
                                    disabled={isUploadActive}
                                    className={isUploadActive ? 'border-gray-300' : ''}
                                >
                                    {isUploadActive ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Subiendo...
                                        </>
                                    ) : (
                                        'Cerrar'
                                    )}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-gray-900">
                                    {pendingFiles.length === 1 ? 'Nombrar archivo' : `Nombrar ${pendingFiles.length} archivos`}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    Asigna un nombre a cada archivo antes de subirlo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {pendingFiles.map((file, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        {file.type.startsWith('video/') ? (
                                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center shrink-0">
                                                <Film className="h-5 w-5 text-gray-400" />
                                            </div>
                                        ) : (
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt=""
                                                className="w-12 h-12 object-cover rounded border border-gray-200 shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 space-y-1">
                                            <div className="flex gap-2">
                                                <Input
                                                    value={uploadNames[i] || ''}
                                                    onChange={(e) => {
                                                        const newNames = [...uploadNames];
                                                        newNames[i] = e.target.value;
                                                        setUploadNames(newNames);
                                                    }}
                                                    placeholder="Nombre del archivo"
                                                    className="h-8 text-sm bg-white border-gray-300 flex-1"
                                                    autoFocus={i === 0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && pendingFiles.length === 1) handleConfirmUpload();
                                                    }}
                                                />
                                                <select
                                                    value={uploadTags[i] || 'OTRO'}
                                                    onChange={(e) => {
                                                        const newTags = [...uploadTags];
                                                        newTags[i] = e.target.value as TagMedia;
                                                        setUploadTags(newTags);
                                                    }}
                                                    className="h-8 text-xs rounded border border-gray-300 bg-white px-2 shrink-0"
                                                >
                                                    <option value="HIMNO">Himno</option>
                                                    <option value="VIDEO">Video</option>
                                                    <option value="IMAGEN">Imagen</option>
                                                    <option value="ANUNCIO">Anuncio</option>
                                                    <option value="OTRO">Otro</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-gray-400">{file.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => { setPendingFiles([]); setUploadNames([]); setUploadTags([]); }}
                                    className="border-gray-300"
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleConfirmUpload}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir {pendingFiles.length > 1 ? `(${pendingFiles.length})` : ''}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de eliminar <strong>{deleteTarget?.nombre || deleteTarget?.nombreOriginal || 'este archivo'}</strong>?
                            {deleteTarget?._count && deleteTarget._count.programaFotos > 0 ? (
                                <> También se eliminarán <strong>{deleteTarget._count.programaFotos} foto(s)</strong> de programas que la usan.</>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Batch delete confirmation */}
            <AlertDialog open={deleteMultiOpen} onOpenChange={(open) => { if (!open) setDeleteMultiOpen(false); }}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar {selectedIds.size} archivo(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de eliminar <strong>{selectedIds.size} archivo(s)</strong> seleccionado(s)?
                            Esta acción también eliminará las referencias en programas asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteBatchMutation.mutate(Array.from(selectedIds))}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteBatchMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Eliminar {selectedIds.size}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Preview lightbox */}
            <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
                <DialogContent className="bg-black/95 border-none sm:max-w-4xl max-h-[90vh] p-2 [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:text-gray-300">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{previewItem?.nombre || previewItem?.nombreOriginal || 'Vista previa'}</DialogTitle>
                        <DialogDescription>Vista previa del archivo</DialogDescription>
                    </DialogHeader>
                    {previewItem && (
                        <div className="flex flex-col items-center gap-3">
                            {isVideo(previewItem.mimeType) ? (
                                <video
                                    src={`${getBaseUrl()}${previewItem.url}`}
                                    controls
                                    className="max-h-[75vh] max-w-full rounded"
                                />
                            ) : (
                                <img
                                    src={`${getBaseUrl()}${previewItem.url}`}
                                    alt={previewItem.nombre || previewItem.nombreOriginal || ''}
                                    className="max-h-[75vh] max-w-full object-contain rounded"
                                />
                            )}
                            <div className="text-center flex flex-col items-center gap-2">
                                <p className="text-sm font-medium text-white">
                                    {previewItem.nombre || previewItem.nombreOriginal || 'Sin nombre'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {previewItem.tamanio > 0 ? `${formatFileSize(previewItem.tamanio)} · ` : ''}{formatDate(previewItem.createdAt)}
                                </p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(previewItem.url);
                                            const blob = await res.blob();
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            const ext = previewItem.nombreOriginal?.match(/\.[^/.]+$/)?.[0] || '';
                                            const baseName = previewItem.nombre || previewItem.nombreOriginal || 'archivo';
                                            a.download = baseName.match(/\.[^/.]+$/) ? baseName : baseName + ext;
                                            a.click();
                                            URL.revokeObjectURL(a.href);
                                        } catch {
                                            toast.error('Error al descargar');
                                        }
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
