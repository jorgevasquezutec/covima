import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Calendar,
    Plus,
    Eye,
    Edit,
    Trash2,
    Send,
    Copy,
    Loader2,
    FileText,
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    MessageCircle,
    Phone,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { programasApi } from '@/services/api';
import { formatDate } from '@/lib/utils';
import type { Programa, PreviewNotificacionesResponse } from '@/types';

const estadoConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    borrador: { label: 'Borrador', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
    completo: { label: 'Completo', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <CheckCircle className="w-3 h-3" /> },
    enviado: { label: 'Enviado', color: 'bg-green-100 text-green-700 border-green-200', icon: <Send className="w-3 h-3" /> },
    finalizado: { label: 'Finalizado', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <CheckCircle className="w-3 h-3" /> },
};

export default function ProgramasPage() {
    const navigate = useNavigate();
    const [programas, setProgramas] = useState<Programa[]>([]);
    const [loading, setLoading] = useState(true);
    const [estadoFilter, setEstadoFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deletePrograma, setDeletePrograma] = useState<Programa | null>(null);
    const [viewPrograma, setViewPrograma] = useState<Programa | null>(null);
    const [textoWhatsapp, setTextoWhatsapp] = useState<string>('');
    const [generatingText, setGeneratingText] = useState(false);
    const [previewNotif, setPreviewNotif] = useState<PreviewNotificacionesResponse | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [sendingNotif, setSendingNotif] = useState(false);
    const [notifResult, setNotifResult] = useState<{
        enviados: number;
        errores: number;
        detalles: { nombre: string; telefono: string; success: boolean; error?: string }[];
    } | null>(null);

    useEffect(() => {
        loadProgramas();
    }, [estadoFilter, page]);

    const loadProgramas = async () => {
        try {
            setLoading(true);
            const response = await programasApi.getAll({
                page,
                limit: 10,
                estado: estadoFilter !== 'all' ? estadoFilter : undefined,
            });
            setProgramas(response.data);
            setTotalPages(response.meta.totalPages);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al cargar programas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletePrograma) return;
        try {
            await programasApi.delete(deletePrograma.id);
            toast.success('Programa eliminado');
            setDeletePrograma(null);
            loadProgramas();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al eliminar programa');
        }
    };

    const handleGenerarTexto = async (programa: Programa) => {
        try {
            setGeneratingText(true);
            setViewPrograma(programa);
            const response = await programasApi.generarTexto(programa.id);
            setTextoWhatsapp(response.texto);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al generar texto');
        } finally {
            setGeneratingText(false);
        }
    };

    const handleCopyTexto = async () => {
        if (!textoWhatsapp) {
            toast.error('No hay texto para copiar');
            return;
        }

        // Siempre usar el método del textarea que funciona en todos los contextos
        const textArea = document.createElement('textarea');
        textArea.value = textoWhatsapp;
        // Hacerlo visible pero fuera de la pantalla para que funcione el select
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                toast.success('Texto copiado al portapapeles');
            } else {
                toast.error('No se pudo copiar el texto');
            }
        } catch (err) {
            toast.error('No se pudo copiar el texto');
        }

        document.body.removeChild(textArea);
    };

    const handleCrearPrograma = () => {
        navigate(`/programas/nuevo`);
    };

    const handlePreviewNotificaciones = async (programa: Programa) => {
        try {
            setLoadingPreview(true);
            setNotifResult(null);
            const response = await programasApi.previewNotificaciones(programa.id);
            setPreviewNotif(response);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al cargar preview');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleEnviarNotificaciones = async () => {
        if (!previewNotif) return;

        try {
            setSendingNotif(true);
            const result = await programasApi.enviarNotificaciones(previewNotif.programa.id);
            setNotifResult(result);

            if (result.enviados > 0) {
                toast.success(`${result.enviados} notificaciones enviadas`);
                loadProgramas(); // Recargar para actualizar estado
            }
            if (result.errores > 0) {
                toast.warning(`${result.errores} notificaciones fallaron`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al enviar notificaciones');
        } finally {
            setSendingNotif(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-blue-600" />
                        Programas
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestiona los programas semanales del grupo Maranatha
                    </p>
                </div>
                <Button
                    onClick={handleCrearPrograma}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Programa
                </Button>
            </div>

            {/* Filtros */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-48">
                            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                    <SelectValue placeholder="Filtrar por estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="borrador">Borrador</SelectItem>
                                    <SelectItem value="completo">Completo</SelectItem>
                                    <SelectItem value="enviado">Enviado</SelectItem>
                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de programas */}
            <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        Lista de Programas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : programas.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg">No hay programas registrados</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Crea tu primer programa para empezar
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-200 bg-gray-50">
                                        <TableHead className="text-gray-600">Código</TableHead>
                                        <TableHead className="text-gray-600">Fecha</TableHead>
                                        <TableHead className="text-gray-600">Hora</TableHead>
                                        <TableHead className="text-gray-600">Título</TableHead>
                                        <TableHead className="text-gray-600 text-center">Asignaciones</TableHead>
                                        <TableHead className="text-gray-600">Estado</TableHead>
                                        <TableHead className="text-gray-600 text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {programas.map((programa) => (
                                        <TableRow key={programa.id} className="border-gray-200 hover:bg-gray-50">
                                            <TableCell className="text-gray-700 font-mono text-sm">
                                                {programa.codigo}
                                            </TableCell>
                                            <TableCell className="text-gray-900 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-blue-600" />
                                                    {formatDate(programa.fecha)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-700">
                                                {programa.horaInicio ? `${programa.horaInicio}${programa.horaFin ? ` - ${programa.horaFin}` : ''}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-700">{programa.titulo}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-gray-700">
                                                    <Users className="h-4 w-4 text-green-600" />
                                                    {programa.asignaciones.length}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${estadoConfig[programa.estado].color} flex items-center gap-1 w-fit border`}>
                                                    {estadoConfig[programa.estado].icon}
                                                    {estadoConfig[programa.estado].label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-blue-50 hover:text-blue-600"
                                                        onClick={() => handleGenerarTexto(programa)}
                                                        title="Ver programa"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-green-50 hover:text-green-600"
                                                        onClick={() => handlePreviewNotificaciones(programa)}
                                                        title="Preview notificaciones WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-yellow-50 hover:text-yellow-600"
                                                        onClick={() => navigate(`/programas/${programa.id}/editar`)}
                                                        title="Editar"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => setDeletePrograma(programa)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Página {page} de {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-gray-300 hover:bg-gray-50"
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="border-gray-300 hover:bg-gray-50"
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Dialog para ver programa */}
            <Dialog open={!!viewPrograma} onOpenChange={() => { setViewPrograma(null); setTextoWhatsapp(''); }}>
                <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            {viewPrograma?.titulo}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {viewPrograma && formatDate(viewPrograma.fecha)}
                        </DialogDescription>
                    </DialogHeader>

                    {generatingText ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : textoWhatsapp ? (
                        <div className="space-y-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {textoWhatsapp}
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handleCopyTexto}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar para WhatsApp
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No se pudo generar el texto
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Alert de confirmación de eliminación */}
            <AlertDialog open={!!deletePrograma} onOpenChange={() => setDeletePrograma(null)}>
                <AlertDialogContent className="bg-white border-gray-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-gray-900">¿Eliminar programa?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-500">
                            Esta acción no se puede deshacer. Se eliminará el programa del{' '}
                            <span className="font-semibold text-gray-900">
                                {deletePrograma && formatDate(deletePrograma.fecha)}
                            </span>{' '}
                            junto con todas sus asignaciones y links.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog para preview de notificaciones WhatsApp */}
            <Dialog open={!!previewNotif} onOpenChange={() => setPreviewNotif(null)}>
                <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            Preview Notificaciones WhatsApp
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {previewNotif && `Programa: ${previewNotif.programa.titulo} - ${formatDate(previewNotif.programa.fecha)}`}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingPreview ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                        </div>
                    ) : previewNotif ? (
                        <div className="space-y-6">
                            {/* Resumen */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-green-700">
                                        <Phone className="h-5 w-5" />
                                        <span className="text-2xl font-bold">{previewNotif.resumen.totalUsuariosConTelefono}</span>
                                    </div>
                                    <p className="text-sm text-green-600 mt-1">Con teléfono</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-yellow-700">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span className="text-2xl font-bold">{previewNotif.resumen.totalUsuariosSinTelefono}</span>
                                    </div>
                                    <p className="text-sm text-yellow-600 mt-1">Sin teléfono</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-blue-700">
                                        <Users className="h-5 w-5" />
                                        <span className="text-2xl font-bold">{previewNotif.resumen.totalAsignaciones}</span>
                                    </div>
                                    <p className="text-sm text-blue-600 mt-1">Asignaciones</p>
                                </div>
                            </div>

                            {/* Usuarios sin teléfono */}
                            {previewNotif.usuariosSinTelefono.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4" />
                                        Usuarios sin teléfono ({previewNotif.usuariosSinTelefono.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {previewNotif.usuariosSinTelefono.map((u) => (
                                            <div key={u.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-yellow-900">{u.nombre}</span>
                                                <span className="text-yellow-700">{u.partes.join(', ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lista de notificaciones */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Send className="h-4 w-4 text-green-600" />
                                    Mensajes a enviar ({previewNotif.notificaciones.length})
                                </h3>

                                {previewNotif.notificaciones.map((notif) => (
                                    <div key={notif.usuario.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{notif.usuario.nombre}</p>
                                                <p className="text-sm text-gray-500">
                                                    {notif.usuario.codigoPais} {notif.usuario.telefono}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {notif.partes.map((parte) => (
                                                    <Badge key={parte} variant="outline" className="text-xs bg-white">
                                                        {parte}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <details className="group">
                                            <summary className="px-4 py-2 text-sm text-blue-600 cursor-pointer hover:bg-blue-50 flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                Ver mensaje completo
                                            </summary>
                                            <div className="px-4 py-3 bg-white border-t border-gray-100">
                                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                                    {notif.mensaje}
                                                </pre>
                                            </div>
                                        </details>
                                    </div>
                                ))}
                            </div>

                            {/* Resultado de envío */}
                            {notifResult && (
                                <div className={`rounded-lg p-4 ${notifResult.errores > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                    <h3 className={`font-semibold flex items-center gap-2 mb-3 ${notifResult.errores > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                                        <CheckCircle className="h-4 w-4" />
                                        Resultado del envío
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-green-600">{notifResult.enviados}</span>
                                            <p className="text-sm text-gray-600">Enviados</p>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-2xl font-bold text-red-600">{notifResult.errores}</span>
                                            <p className="text-sm text-gray-600">Errores</p>
                                        </div>
                                    </div>
                                    {notifResult.detalles.some(d => !d.success) && (
                                        <details className="text-sm">
                                            <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800">
                                                Ver errores ({notifResult.detalles.filter(d => !d.success).length})
                                            </summary>
                                            <ul className="mt-2 space-y-1">
                                                {notifResult.detalles.filter(d => !d.success).map((d, i) => (
                                                    <li key={i} className="text-red-600">
                                                        {d.nombre}: {d.error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="border-t border-gray-200 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => { setPreviewNotif(null); setNotifResult(null); }}
                                    className="border-gray-300"
                                >
                                    Cerrar
                                </Button>
                                {!notifResult && (
                                    <Button
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                        onClick={handleEnviarNotificaciones}
                                        disabled={sendingNotif || previewNotif.notificaciones.length === 0}
                                    >
                                        {sendingNotif ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Enviar via WhatsApp ({previewNotif.notificaciones.length})
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
