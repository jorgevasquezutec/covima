import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Upload, Loader2, Image, Film, ArrowLeft } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mediaApi } from '@/services/api';
import type { MediaItem } from '@/types';

interface MediaPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (item: { url: string; nombre?: string; mediaItemId: number }) => void;
}

export default function MediaPickerDialog({
    open,
    onOpenChange,
    onSelect,
}: MediaPickerDialogProps) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    // Estado para el paso de "nombrar archivo"
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value);
        }, 300);
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['media-library', debouncedSearch],
        queryFn: () => mediaApi.getAll({ limit: 50, search: debouncedSearch || undefined }),
        enabled: open,
    });

    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
        }
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
            return `http://${window.location.hostname}:3000`;
        }
        return 'http://localhost:3000';
    };

    const handleFileSelected = (file: File) => {
        // Poner nombre por defecto sin extensión
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadName(nameWithoutExt);
        setPendingFile(file);
    };

    const handleConfirmUpload = async () => {
        if (!pendingFile) return;
        setUploading(true);
        try {
            const item = await mediaApi.upload(pendingFile, uploadName.trim() || undefined);
            await refetch();
            onSelect({
                url: item.url,
                nombre: item.nombre || item.nombreOriginal || undefined,
                mediaItemId: item.id,
            });
            setPendingFile(null);
            setUploadName('');
            onOpenChange(false);
        } catch {
            toast.error('Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleCancelUpload = () => {
        setPendingFile(null);
        setUploadName('');
    };

    const handleSelect = (item: MediaItem) => {
        onSelect({
            url: item.url,
            nombre: item.nombre || item.nombreOriginal || undefined,
            mediaItemId: item.id,
        });
        onOpenChange(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setPendingFile(null);
            setUploadName('');
        }
        onOpenChange(newOpen);
    };

    const isVideo = (mimeType: string) => mimeType.startsWith('video/');
    const isVideoFile = (file: File) => file.type.startsWith('video/');

    const items = data?.data || [];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-white sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900">
                        <Image className="h-5 w-5 text-blue-600" />
                        Biblioteca de Medios
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        {pendingFile
                            ? 'Dale un nombre al archivo antes de subirlo.'
                            : 'Selecciona una imagen o video existente, o sube uno nuevo.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {pendingFile ? (
                    /* Paso 2: Nombrar y confirmar */
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-4">
                            {isVideoFile(pendingFile) ? (
                                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Film className="h-8 w-8 text-gray-400" />
                                </div>
                            ) : (
                                <img
                                    src={URL.createObjectURL(pendingFile)}
                                    alt="Preview"
                                    className="w-24 h-24 object-cover rounded-lg border border-gray-200 shrink-0"
                                />
                            )}
                            <div className="flex-1 space-y-2">
                                <Label className="text-gray-700 text-sm">Nombre</Label>
                                <Input
                                    value={uploadName}
                                    onChange={(e) => setUploadName(e.target.value)}
                                    placeholder="Ej: Afiche chequeo médico"
                                    className="bg-white border-gray-300"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConfirmUpload();
                                    }}
                                />
                                <p className="text-xs text-gray-400">
                                    {pendingFile.name} · {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelUpload}
                                disabled={uploading}
                                className="border-gray-300"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirmUpload}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                Subir
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Paso 1: Buscar / seleccionar / elegir archivo */
                    <>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Buscar por nombre..."
                                    className="pl-9 bg-white border-gray-300"
                                />
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleFileSelected(file);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="border-gray-300 hover:bg-gray-50 shrink-0"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Subir nuevo
                            </Button>
                        </div>

                        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Image className="h-10 w-10 mb-2 text-gray-300" />
                                    <p className="text-sm">
                                        {search ? 'No se encontraron resultados' : 'La biblioteca está vacía'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Sube un archivo para comenzar
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pb-2">
                                    {items.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelect(item)}
                                            className="group relative aspect-square rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            {isVideo(item.mimeType) ? (
                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                    <Film className="h-8 w-8 text-gray-400" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={`${getBaseUrl()}${item.url}`}
                                                    alt={item.nombre || item.nombreOriginal || ''}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white text-xs truncate">
                                                    {item.nombre || item.nombreOriginal || 'Sin nombre'}
                                                </p>
                                            </div>
                                            {item._count && item._count.programaFotos > 0 && (
                                                <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                                                    {item._count.programaFotos}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
