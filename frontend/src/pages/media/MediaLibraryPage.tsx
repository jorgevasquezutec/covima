import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { mediaApi } from '@/services/api';
import type { MediaItem } from '@/types';

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
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadNames, setUploadNames] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
        queryKey: ['media-library', debouncedSearch, page],
        queryFn: () => mediaApi.getAll({ page, limit: 24, search: debouncedSearch || undefined }),
    });

    const renameMutation = useMutation({
        mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
            mediaApi.updateNombre(id, nombre),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            setEditingId(null);
            toast.success('Nombre actualizado');
        },
        onError: () => toast.error('Error al renombrar'),
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

    const handleFilesSelected = (files: FileList) => {
        const fileArr = Array.from(files);
        setPendingFiles(fileArr);
        setUploadNames(fileArr.map(f => f.name.replace(/\.[^/.]+$/, '')));
    };

    const handleConfirmUpload = async () => {
        setUploading(true);
        let uploaded = 0;
        for (let i = 0; i < pendingFiles.length; i++) {
            try {
                await mediaApi.upload(pendingFiles[i], uploadNames[i]?.trim() || undefined);
                uploaded++;
            } catch {
                toast.error(`Error al subir ${pendingFiles[i].name}`);
            }
        }
        setUploading(false);
        setPendingFiles([]);
        setUploadNames([]);
        if (uploaded > 0) {
            queryClient.invalidateQueries({ queryKey: ['media-library'] });
            toast.success(`${uploaded} archivo(s) subido(s)`);
        }
    };

    const startEdit = (item: MediaItem) => {
        setEditingId(item.id);
        setEditName(item.nombre || item.nombreOriginal || '');
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            renameMutation.mutate({ id: editingId, nombre: editName.trim() });
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
    const items = data?.data || [];
    const meta = data?.meta;

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
                <div>
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
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        Subir archivos
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="pl-9 bg-white border-gray-300"
                />
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
                        <Card key={item.id} className="bg-white border-gray-200 overflow-hidden group">
                            <div className="relative aspect-square bg-gray-50">
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
                                {/* Actions overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8"
                                        onClick={() => startEdit(item)}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                                        onClick={() => setDeleteTarget(item)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {/* Usage badge */}
                                {item._count && item._count.programaFotos > 0 && (
                                    <Badge className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5">
                                        {item._count.programaFotos} uso{item._count.programaFotos > 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>
                            <CardContent className="p-2">
                                {editingId === item.id ? (
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
                                ) : (
                                    <>
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                            {item.nombre || item.nombreOriginal || 'Sin nombre'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {formatFileSize(item.tamanio)} · {formatDate(item.createdAt)}
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

            {/* Upload naming dialog */}
            <Dialog open={pendingFiles.length > 0} onOpenChange={(open) => { if (!open) { setPendingFiles([]); setUploadNames([]); } }}>
                <DialogContent className="bg-white sm:max-w-md">
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
                                    <Input
                                        value={uploadNames[i] || ''}
                                        onChange={(e) => {
                                            const newNames = [...uploadNames];
                                            newNames[i] = e.target.value;
                                            setUploadNames(newNames);
                                        }}
                                        placeholder="Nombre del archivo"
                                        className="h-8 text-sm bg-white border-gray-300"
                                        autoFocus={i === 0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && pendingFiles.length === 1) handleConfirmUpload();
                                        }}
                                    />
                                    <p className="text-[10px] text-gray-400">{file.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => { setPendingFiles([]); setUploadNames([]); }}
                            disabled={uploading}
                            className="border-gray-300"
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmUpload} disabled={uploading}>
                            {uploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Subir {pendingFiles.length > 1 ? `(${pendingFiles.length})` : ''}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de eliminar <strong>{deleteTarget?.nombre || deleteTarget?.nombreOriginal || 'este archivo'}</strong>?
                            Solo se puede eliminar si no está siendo usado en ningún programa.
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
        </div>
    );
}
