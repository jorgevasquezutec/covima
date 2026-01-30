import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
    QrCode,
    Plus,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Copy,
    ToggleLeft,
    ToggleRight,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Radio,
    Filter,
    ChevronDown,
    Info,
    Download,
    CalendarDays,
    Pencil,
    UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { asistenciaApi, tiposAsistenciaApi, usuariosApi } from '@/services/api';
import type { QRAsistencia, Asistencia, EstadisticasGenerales, TipoAsistencia } from '@/types';
import RegistroManualAsistencia from './RegistroManualAsistencia';
import { DatePickerString } from '@/components/ui/date-picker';
import { DateRangePickerString } from '@/components/ui/date-range-picker';

// Helper para parsear fecha evitando problemas de zona horaria
const parseLocalDate = (fecha: string | Date): Date => {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const [datePart] = fechaStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper para formatear hora desde timestamp o string
const formatHora = (hora: string): string => {
    if (!hora) return '--:--';
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    try {
        const date = new Date(hora);
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return hora;
    }
};

// Helper para formatear datos del formulario
const formatDatosFormulario = (datos: Record<string, unknown> | undefined): string => {
    if (!datos || Object.keys(datos).length === 0) return '';
    return Object.entries(datos)
        .map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (typeof value === 'boolean') return `${label}: ${value ? 'Sí' : 'No'}`;
            return `${label}: ${value}`;
        })
        .join(' • ');
};

export default function AsistenciaPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [qrs, setQrs] = useState<QRAsistencia[]>([]);
    const [allQrs, setAllQrs] = useState<QRAsistencia[]>([]);
    const [qrListExpanded, setQrListExpanded] = useState(false);
    const [qrListMeta, setQrListMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
    const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales | null>(null);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [tipos, setTipos] = useState<TipoAsistencia[]>([]);
    const [qrsExpanded, setQrsExpanded] = useState(true);
    const [registroManualExpanded, setRegistroManualExpanded] = useState(false);

    // Filters
    const [estadoFilter, setEstadoFilter] = useState<string>('all');
    const [tipoFilter, setTipoFilter] = useState<string>('all');
    const [fechaDesde, setFechaDesde] = useState<string>('');
    const [fechaHasta, setFechaHasta] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Dialog states
    const [createQROpen, setCreateQROpen] = useState(false);
    const [creatingQR, setCreatingQR] = useState(false);
    const [newQR, setNewQR] = useState<{
        semanaInicio: string;
        tipoId: number | null;
        descripcion: string;
        horaInicio: string;
        horaFin: string;
        margenTemprana: number;
        margenTardia: number;
    }>({
        semanaInicio: '',
        tipoId: null,
        descripcion: '',
        horaInicio: '09:00',
        horaFin: '12:00',
        margenTemprana: 15,
        margenTardia: 30,
    });

    // Edit QR Dialog state
    const [editQROpen, setEditQROpen] = useState(false);
    const [editingQR, setEditingQR] = useState<QRAsistencia | null>(null);
    const [editQRData, setEditQRData] = useState({
        semanaInicio: '',
        horaInicio: '',
        horaFin: '',
        descripcion: '',
        margenTemprana: 15,
        margenTardia: 30,
    });
    const [updatingQR, setUpdatingQR] = useState(false);

    // Registrar usuario desde asistencia
    const [registerUserOpen, setRegisterUserOpen] = useState(false);
    const [registeringUser, setRegisteringUser] = useState(false);
    const [userToRegister, setUserToRegister] = useState<{
        asistenciaId: number;
        nombre: string;
        telefono: string;
    } | null>(null);

    // Load tipos on mount
    useEffect(() => {
        const loadTipos = async () => {
            try {
                const tiposData = await tiposAsistenciaApi.getAll({ activo: true });
                setTipos(tiposData);
                if (tiposData.length > 0 && !newQR.tipoId) {
                    setNewQR(prev => ({ ...prev, tipoId: tiposData[0].id }));
                }
            } catch {
                toast.error('Error al cargar tipos de asistencia');
            }
        };
        loadTipos();
    }, []);

    useEffect(() => {
        loadData();
    }, [meta.page, estadoFilter, tipoFilter, fechaDesde, fechaHasta]);

    useEffect(() => {
        loadQrList();
    }, [qrListMeta.page]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [qrsData, asistenciasData, statsData] = await Promise.all([
                asistenciaApi.getAllQRs({ page: 1, limit: 10, activo: true }),
                asistenciaApi.getAll({
                    page: meta.page,
                    limit: meta.limit,
                    estado: estadoFilter !== 'all' ? estadoFilter : undefined,
                    fechaDesde: fechaDesde || undefined,
                    fechaHasta: fechaHasta || undefined,
                }),
                asistenciaApi.getEstadisticasGenerales(),
            ]);

            setQrs(qrsData.data);
            // Filtrar por tipo en frontend si se seleccionó uno
            let filteredAsistencias = asistenciasData.data;
            if (tipoFilter !== 'all') {
                filteredAsistencias = filteredAsistencias.filter(a => a.tipo?.id === parseInt(tipoFilter));
            }
            setAsistencias(filteredAsistencias);
            setMeta(asistenciasData.meta);
            setEstadisticas(statsData);
            // También cargar la lista de QRs
            await loadQrList();
        } catch {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const loadQrList = async () => {
        try {
            const allQrsData = await asistenciaApi.getAllQRs({
                page: qrListMeta.page,
                limit: qrListMeta.limit,
            });

            // Ordenar: primero por activo (activos primero), luego por fecha
            const sortedAllQrs = allQrsData.data.sort((a, b) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dateA = parseLocalDate(a.semanaInicio);
                const dateB = parseLocalDate(b.semanaInicio);
                const isActiveA = dateA >= today && a.activo;
                const isActiveB = dateB >= today && b.activo;

                if (isActiveA && !isActiveB) return -1;
                if (!isActiveA && isActiveB) return 1;
                return dateB.getTime() - dateA.getTime();
            });
            setAllQrs(sortedAllQrs);
            setQrListMeta(allQrsData.meta);
        } catch {
            // Error silencioso para la lista de QRs
        }
    };

    const handleCreateQR = async () => {
        if (!newQR.semanaInicio) {
            toast.error('Selecciona la fecha de la semana');
            return;
        }
        if (!newQR.tipoId) {
            toast.error('Selecciona un tipo de asistencia');
            return;
        }

        try {
            setCreatingQR(true);
            await asistenciaApi.createQR({
                semanaInicio: newQR.semanaInicio,
                tipoId: newQR.tipoId,
                horaInicio: newQR.horaInicio,
                horaFin: newQR.horaFin,
                margenTemprana: newQR.margenTemprana,
                margenTardia: newQR.margenTardia,
                descripcion: newQR.descripcion || undefined,
            });
            toast.success('QR creado exitosamente');
            setCreateQROpen(false);
            setNewQR({ semanaInicio: '', tipoId: tipos[0]?.id || null, descripcion: '', horaInicio: '09:00', horaFin: '12:00', margenTemprana: 15, margenTardia: 30 });
            loadData();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error al crear QR');
        } finally {
            setCreatingQR(false);
        }
    };

    const handleToggleQR = async (qr: QRAsistencia) => {
        try {
            await asistenciaApi.toggleQRActive(qr.id);
            toast.success(qr.activo ? 'QR desactivado' : 'QR activado');
            loadData();
        } catch {
            toast.error('Error al cambiar estado');
        }
    };

    // Abrir modal de edición de QR
    const openEditQRModal = (qr: QRAsistencia) => {
        setEditingQR(qr);
        // Extraer fecha sin problemas de timezone
        const [datePart] = qr.semanaInicio.split('T');
        setEditQRData({
            semanaInicio: datePart,
            horaInicio: formatHora(qr.horaInicio),
            horaFin: formatHora(qr.horaFin),
            descripcion: qr.descripcion || '',
            margenTemprana: qr.margenTemprana ?? 15,
            margenTardia: qr.margenTardia ?? 30,
        });
        setEditQROpen(true);
    };

    const handleSaveEditQR = async () => {
        if (!editingQR) return;

        try {
            setUpdatingQR(true);
            await asistenciaApi.updateQR(editingQR.id, {
                semanaInicio: editQRData.semanaInicio,
                horaInicio: editQRData.horaInicio,
                horaFin: editQRData.horaFin,
                margenTemprana: editQRData.margenTemprana,
                margenTardia: editQRData.margenTardia,
                descripcion: editQRData.descripcion || undefined,
            });
            toast.success('QR actualizado correctamente');
            setEditQROpen(false);
            setEditingQR(null);
            loadData();
        } catch {
            toast.error('Error al actualizar QR');
        } finally {
            setUpdatingQR(false);
        }
    };

    // Determina si un QR está activo basado en su fecha y estado
    const isQRActive = (qr: QRAsistencia): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const qrDate = parseLocalDate(qr.semanaInicio);
        return qrDate >= today && qr.activo;
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Link copiado');
    };

    const handleConfirmar = async (id: number, estado: 'confirmado' | 'rechazado') => {
        try {
            await asistenciaApi.confirmar(id, { estado });
            toast.success(estado === 'confirmado' ? 'Confirmado' : 'Rechazado');
            loadData();
        } catch {
            toast.error('Error al procesar');
        }
    };

    const handleConfirmarMultiples = async (estado: 'confirmado' | 'rechazado') => {
        if (selectedIds.length === 0) {
            toast.error('Selecciona al menos una asistencia');
            return;
        }

        try {
            const result = await asistenciaApi.confirmarMultiples(selectedIds, estado);
            toast.success(result.message);
            setSelectedIds([]);
            loadData();
        } catch {
            toast.error('Error al procesar');
        }
    };

    const handleOpenRegisterUser = (asistencia: Asistencia) => {
        setUserToRegister({
            asistenciaId: asistencia.id,
            nombre: asistencia.nombreRegistro || '',
            telefono: asistencia.telefonoRegistro?.replace(/^\+?51/, '') || '',
        });
        setRegisterUserOpen(true);
    };

    const handleRegisterUser = async () => {
        if (!userToRegister || !userToRegister.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        try {
            setRegisteringUser(true);
            // Crear usuario (rol será participante por defecto en el backend)
            const nuevoUsuario = await usuariosApi.create({
                nombre: userToRegister.nombre.trim(),
                codigoPais: '51',
                telefono: userToRegister.telefono,
            });

            // Vincular la asistencia al nuevo usuario
            await asistenciaApi.vincularUsuario(userToRegister.asistenciaId, nuevoUsuario.id);

            toast.success(`Usuario "${nuevoUsuario.nombre}" creado y vinculado a la asistencia`);
            setRegisterUserOpen(false);
            setUserToRegister(null);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al crear usuario');
        } finally {
            setRegisteringUser(false);
        }
    };

    const toggleSelectAll = () => {
        const pendientes = asistencias.filter(a => a.estado === 'pendiente_confirmacion');
        if (selectedIds.length === pendientes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendientes.map(a => a.id));
        }
    };

    const handleExportExcel = async (exportAll: boolean = false) => {
        try {
            setExporting(true);
            const params: { estado?: string; tipoId?: number; fechaDesde?: string; fechaHasta?: string } = {};
            // Si exportAll es false, usar los filtros actuales; si es true, exportar todo
            if (!exportAll && estadoFilter !== 'all') params.estado = estadoFilter;
            if (!exportAll && tipoFilter !== 'all') params.tipoId = parseInt(tipoFilter);
            if (!exportAll && fechaDesde) params.fechaDesde = fechaDesde;
            if (!exportAll && fechaHasta) params.fechaHasta = fechaHasta;

            const blob = await asistenciaApi.exportarExcel(params);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `asistencias_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Archivo exportado correctamente');
        } catch {
            toast.error('Error al exportar');
        } finally {
            setExporting(false);
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'confirmado':
                return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</Badge>;
            case 'rechazado':
                return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rechazado</Badge>;
            default:
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>;
        }
    };

    const getFechaActual = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    // Componente para mostrar asistencia en móvil
    const AsistenciaCard = ({ asistencia }: { asistencia: Asistencia }) => {
        const isPendiente = asistencia.estado === 'pendiente_confirmacion';
        const datosStr = formatDatosFormulario(asistencia.datosFormulario);

        return (
            <div className="p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {isPendiente && (
                            <Checkbox
                                checked={selectedIds.includes(asistencia.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedIds([...selectedIds, asistencia.id]);
                                    } else {
                                        setSelectedIds(selectedIds.filter(id => id !== asistencia.id));
                                    }
                                }}
                                className="mt-1"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                                {asistencia.usuario?.nombre || asistencia.nombreRegistro || 'Sin nombre'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">
                                    {new Date(asistencia.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                </span>
                                {asistencia.tipo && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                        style={{
                                            borderColor: asistencia.tipo.color || '#6B7280',
                                            color: asistencia.tipo.color || '#6B7280'
                                        }}
                                    >
                                        {asistencia.tipo.label}
                                    </Badge>
                                )}
                            </div>
                            {datosStr && (
                                <p className="text-xs text-gray-500 mt-1 truncate">{datosStr}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {getEstadoBadge(asistencia.estado)}
                        {isPendiente && (
                            <div className="flex gap-1">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleConfirmar(asistencia.id, 'confirmado')}
                                    className="h-8 w-8 text-green-600 hover:bg-green-50"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleConfirmar(asistencia.id, 'rechazado')}
                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                >
                                    <XCircle className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        Asistencia
                    </h1>
                    <p className="text-gray-500 text-sm">Gestiona QRs y confirma asistencias</p>
                </div>
                <Button
                    onClick={() => {
                        setNewQR({ ...newQR, semanaInicio: getFechaActual() });
                        setCreateQROpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo QR
                </Button>
            </div>

            {/* Stats Cards - Compactos */}
            {estadisticas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Usuarios</p>
                                    <p className="text-xl font-bold text-gray-900">{estadisticas.totalUsuarios}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Promedio</p>
                                    <p className="text-xl font-bold text-gray-900">{estadisticas.promedioAsistencia}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Este mes</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {estadisticas.meses?.[estadisticas.meses.length - 1]?.confirmados || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-gray-200 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Pendientes</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {estadisticas.meses?.[estadisticas.meses.length - 1]?.total - (estadisticas.meses?.[estadisticas.meses.length - 1]?.confirmados || 0) || 0}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* QRs Activos - Colapsable */}
            <Collapsible open={qrsExpanded} onOpenChange={setQrsExpanded}>
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-blue-600" />
                                    <CardTitle className="text-gray-900">QRs Activos</CardTitle>
                                    <Badge variant="outline" className="ml-2">{qrs.length}</Badge>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${qrsExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            {qrs.length === 0 ? (
                                <div className="text-center py-8">
                                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No hay QRs activos</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setNewQR({ ...newQR, semanaInicio: getFechaActual() });
                                            setCreateQROpen(true);
                                        }}
                                        className="mt-3"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Crear QR
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {qrs.map((qr) => {
                                        const tipoColor = qr.tipoAsistencia?.color || '#3B82F6';
                                        return (
                                            <div
                                                key={qr.id}
                                                className="relative border-2 rounded-xl p-4 transition-all hover:shadow-lg bg-gradient-to-br from-white to-gray-50 group"
                                                style={{ borderColor: tipoColor }}
                                            >
                                                {/* Header con tipo y estado */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <Badge
                                                        className="text-xs font-semibold px-2 py-1"
                                                        style={{
                                                            backgroundColor: tipoColor,
                                                            color: 'white',
                                                        }}
                                                    >
                                                        {qr.tipoAsistencia?.label || 'Sin tipo'}
                                                    </Badge>
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-2 h-2 rounded-full ${qr.activo ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                                        <span className={`text-xs font-medium ${qr.activo ? 'text-green-600' : 'text-gray-500'}`}>
                                                            {qr.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* QR Code - Click to open room */}
                                                <div
                                                    className="flex justify-center mb-3 cursor-pointer group/qr"
                                                    onClick={() => navigate(`/asistencias/room/${qr.codigo}`)}
                                                >
                                                    <div className="relative p-2 bg-white rounded-lg shadow-sm group-hover/qr:shadow-md transition-shadow">
                                                        <QRCodeSVG
                                                            value={qr.urlWhatsapp || qr.urlGenerada || ''}
                                                            size={90}
                                                            level="M"
                                                            bgColor="#ffffff"
                                                            fgColor={tipoColor}
                                                        />
                                                        {/* Overlay en hover */}
                                                        <div className="absolute inset-0 bg-purple-600/80 rounded-lg flex items-center justify-center opacity-0 group-hover/qr:opacity-100 transition-opacity">
                                                            <div className="text-center text-white">
                                                                <Radio className="w-5 h-5 mx-auto mb-1 animate-pulse" />
                                                                <span className="text-xs font-medium">Ver en vivo</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Código y fecha */}
                                                <div className="text-center mb-3">
                                                    <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{qr.codigo}</p>
                                                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                                                        <CalendarDays className="w-4 h-4" />
                                                        <span>{parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)}</span>
                                                    </div>
                                                </div>

                                                {/* Estadística de asistencias */}
                                                {(qr.totalAsistencias ?? 0) > 0 && (
                                                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 rounded-lg mb-3">
                                                        <Users className="w-4 h-4 text-blue-600" />
                                                        <span className="text-sm font-medium text-blue-700">{qr.totalAsistencias} asistencias</span>
                                                    </div>
                                                )}

                                                {/* Acciones */}
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {qr.urlWhatsapp && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCopyLink(qr.urlWhatsapp!)}
                                                            className="flex-1 h-9 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                                        >
                                                            <Copy className="w-3 h-3 mr-1" />
                                                            Copiar link
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => openEditQRModal(qr)}
                                                        className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                                        title="Editar QR"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleToggleQR(qr)}
                                                        className={`h-9 w-9 ${qr.activo ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                                                        title={qr.activo ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {qr.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Lista de todos los QRs */}
            <Collapsible open={qrListExpanded} onOpenChange={setQrListExpanded}>
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-purple-600" />
                                    <CardTitle className="text-gray-900">Todos los QRs</CardTitle>
                                    <Badge variant="outline" className="ml-2">{qrListMeta.total}</Badge>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${qrListExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            {allQrs.length === 0 ? (
                                <div className="text-center py-8">
                                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No hay QRs registrados</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-gray-200 bg-gray-50">
                                                <TableHead className="text-gray-600">Código</TableHead>
                                                <TableHead className="text-gray-600">Fecha y Horario</TableHead>
                                                <TableHead className="text-gray-600">Tipo</TableHead>
                                                <TableHead className="text-gray-600 text-center">Asistencias</TableHead>
                                                <TableHead className="text-gray-600 text-center">Estado</TableHead>
                                                <TableHead className="text-gray-600 text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allQrs.map((qr) => {
                                                const active = isQRActive(qr);
                                                const tipoColor = qr.tipoAsistencia?.color || '#6B7280';
                                                return (
                                                    <TableRow key={qr.id} className={`border-gray-200 transition-colors ${!active ? 'bg-gray-50/50' : 'hover:bg-blue-50/30'}`}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                <span className="font-mono text-sm font-bold text-gray-900">{qr.codigo}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                                                    <CalendarDays className="w-4 h-4 text-gray-400" />
                                                                    {parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                                    {formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className="text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: tipoColor,
                                                                    color: 'white',
                                                                }}
                                                            >
                                                                {qr.tipoAsistencia?.label || 'Sin tipo'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Users className="w-4 h-4 text-gray-400" />
                                                                <span className="font-medium text-gray-700">{qr.totalAsistencias || 0}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className={active
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                                                }
                                                            >
                                                                {active ? 'Activo' : 'Inactivo'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => navigate(`/asistencias/room/${qr.codigo}`)}
                                                                    className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600"
                                                                    title="Ver en vivo"
                                                                >
                                                                    <Radio className="w-4 h-4" />
                                                                </Button>
                                                                {qr.urlWhatsapp && (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleCopyLink(qr.urlWhatsapp!)}
                                                                        className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                                                                        title="Copiar link WhatsApp"
                                                                    >
                                                                        <Copy className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => openEditQRModal(qr)}
                                                                    className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                                                                    title="Editar QR"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleToggleQR(qr)}
                                                                    className={`h-8 w-8 ${qr.activo ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                                    title={qr.activo ? 'Desactivar' : 'Activar'}
                                                                >
                                                                    {qr.activo ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Paginación de QRs */}
                            {qrListMeta.totalPages > 1 && (
                                <div className="flex items-center justify-between px-2 py-3 border-t border-gray-200 mt-4">
                                    <p className="text-sm text-gray-500">
                                        Página {qrListMeta.page} de {qrListMeta.totalPages} ({qrListMeta.total} QRs)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={qrListMeta.page === 1}
                                            onClick={() => setQrListMeta(m => ({ ...m, page: m.page - 1 }))}
                                            className="border-gray-300"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={qrListMeta.page === qrListMeta.totalPages}
                                            onClick={() => setQrListMeta(m => ({ ...m, page: m.page + 1 }))}
                                            className="border-gray-300"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Registro Manual */}
            <Collapsible open={registroManualExpanded} onOpenChange={setRegistroManualExpanded}>
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-green-600" />
                                    <CardTitle className="text-gray-900">Registro Manual</CardTitle>
                                    <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                        Admin/Líder
                                    </Badge>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${registroManualExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="pt-0">
                            <RegistroManualAsistencia onSuccess={() => loadData()} />
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Asistencias */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <CardTitle className="text-gray-900">Registros de Asistencia</CardTitle>
                                <CardDescription className="text-gray-500">
                                    {meta.total} registros encontrados
                                </CardDescription>
                            </div>

                            {/* Acciones masivas */}
                            {selectedIds.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleConfirmarMultiples('confirmado')}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        Confirmar ({selectedIds.length})
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleConfirmarMultiples('rechazado')}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Rechazar
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v); setSelectedIds([]); }}>
                                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-300 text-sm">
                                    <Filter className="w-3 h-3 mr-2 text-gray-500" />
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="pendiente_confirmacion">Pendientes</SelectItem>
                                    <SelectItem value="confirmado">Confirmados</SelectItem>
                                    <SelectItem value="rechazado">Rechazados</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setSelectedIds([]); }}>
                                <SelectTrigger className="w-[160px] h-9 bg-white border-gray-300 text-sm">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    {tipos.map(tipo => (
                                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filtro de rango de fechas */}
                            <div className="flex items-center gap-1">
                                <DateRangePickerString
                                    valueFrom={fechaDesde}
                                    valueTo={fechaHasta}
                                    onChange={(from, to) => { setFechaDesde(from); setFechaHasta(to); setSelectedIds([]); }}
                                    placeholder="Rango de fechas"
                                    className="w-[280px] h-9"
                                    numberOfMonths={1}
                                />
                                {(fechaDesde || fechaHasta) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setFechaDesde(''); setFechaHasta(''); setSelectedIds([]); }}
                                        className="h-9 px-2 text-gray-500 hover:text-gray-700"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {estadoFilter === 'pendiente_confirmacion' && asistencias.filter(a => a.estado === 'pendiente_confirmacion').length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="h-9 text-sm"
                                >
                                    {selectedIds.length === asistencias.filter(a => a.estado === 'pendiente_confirmacion').length
                                        ? 'Deseleccionar todos'
                                        : 'Seleccionar todos'}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportExcel(true)}
                                disabled={exporting}
                                className="h-9 text-sm ml-auto"
                            >
                                <Download className="w-4 h-4 mr-1" />
                                {exporting ? 'Exportando...' : 'Excel'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Vista Desktop - Tabla */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-200 bg-gray-50">
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedIds.length > 0 && selectedIds.length === asistencias.filter(a => a.estado === 'pendiente_confirmacion').length}
                                            onCheckedChange={toggleSelectAll}
                                            disabled={asistencias.filter(a => a.estado === 'pendiente_confirmacion').length === 0}
                                        />
                                    </TableHead>
                                    <TableHead className="text-gray-600">Participante</TableHead>
                                    <TableHead className="text-gray-600">Fecha</TableHead>
                                    <TableHead className="text-gray-600">Tipo</TableHead>
                                    <TableHead className="text-gray-600">Datos</TableHead>
                                    <TableHead className="text-gray-600">Estado</TableHead>
                                    <TableHead className="text-gray-600 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                            Cargando...
                                        </TableCell>
                                    </TableRow>
                                ) : asistencias.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                            No hay registros
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    asistencias.map((asistencia) => {
                                        const datosStr = formatDatosFormulario(asistencia.datosFormulario);
                                        return (
                                            <TableRow key={asistencia.id} className="border-gray-200 hover:bg-gray-50">
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIds.includes(asistencia.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedIds([...selectedIds, asistencia.id]);
                                                            } else {
                                                                setSelectedIds(selectedIds.filter(id => id !== asistencia.id));
                                                            }
                                                        }}
                                                        disabled={asistencia.estado !== 'pendiente_confirmacion'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {asistencia.usuario?.nombre || asistencia.nombreRegistro || 'Sin nombre'}
                                                            </p>
                                                            {!asistencia.usuario && asistencia.telefonoRegistro && (
                                                                <p className="text-xs text-gray-500">{asistencia.telefonoRegistro}</p>
                                                            )}
                                                        </div>
                                                        {!asistencia.usuario && asistencia.telefonoRegistro && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleOpenRegisterUser(asistencia)}
                                                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                                                title="Registrar como usuario"
                                                            >
                                                                <UserPlus className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-700">
                                                    {new Date(asistencia.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                                </TableCell>
                                                <TableCell>
                                                    {asistencia.tipo ? (
                                                        <Badge
                                                            variant="outline"
                                                            style={{
                                                                borderColor: asistencia.tipo.color || '#6B7280',
                                                                color: asistencia.tipo.color || '#6B7280'
                                                            }}
                                                        >
                                                            {asistencia.tipo.label}
                                                        </Badge>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {datosStr ? (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500">
                                                                    <Info className="w-3 h-3 mr-1" />
                                                                    Ver datos
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-64 bg-white border-gray-200">
                                                                <div className="space-y-2">
                                                                    {Object.entries(asistencia.datosFormulario || {}).map(([key, value]) => (
                                                                        <div key={key} className="flex justify-between text-sm">
                                                                            <span className="text-gray-500">{key.replace(/_/g, ' ')}</span>
                                                                            <span className="font-medium text-gray-900">
                                                                                {typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getEstadoBadge(asistencia.estado)}</TableCell>
                                                <TableCell className="text-right">
                                                    {asistencia.estado === 'pendiente_confirmacion' && (
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleConfirmar(asistencia.id, 'confirmado')}
                                                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleConfirmar(asistencia.id, 'rechazado')}
                                                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Vista Mobile - Cards */}
                    <div className="md:hidden p-4 space-y-3">
                        {loading ? (
                            <p className="text-center text-gray-500 py-8">Cargando...</p>
                        ) : asistencias.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No hay registros</p>
                        ) : (
                            asistencias.map((asistencia) => (
                                <AsistenciaCard key={asistencia.id} asistencia={asistencia} />
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                            <p className="text-sm text-gray-500">
                                {(meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={meta.page === 1}
                                    onClick={() => setMeta(m => ({ ...m, page: m.page - 1 }))}
                                    className="border-gray-300"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={meta.page === meta.totalPages}
                                    onClick={() => setMeta(m => ({ ...m, page: m.page + 1 }))}
                                    className="border-gray-300"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create QR Dialog */}
            <Dialog open={createQROpen} onOpenChange={setCreateQROpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-blue-600" />
                            Crear Nuevo QR
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Genera un código QR para registrar asistencia
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700">Fecha (sábado)</Label>
                            <DatePickerString
                                value={newQR.semanaInicio}
                                onChange={(value) => setNewQR({ ...newQR, semanaInicio: value })}
                                placeholder="Seleccionar fecha"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Tipo de Asistencia</Label>
                            <Select
                                value={newQR.tipoId?.toString() || ''}
                                onValueChange={(v) => setNewQR({ ...newQR, tipoId: parseInt(v, 10) })}
                            >
                                <SelectTrigger className="bg-white border-gray-300">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    {tipos.map(tipo => (
                                        <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Hora inicio</Label>
                                <Input
                                    type="time"
                                    value={newQR.horaInicio}
                                    onChange={(e) => setNewQR({ ...newQR, horaInicio: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Hora fin</Label>
                                <Input
                                    type="time"
                                    value={newQR.horaFin}
                                    onChange={(e) => setNewQR({ ...newQR, horaFin: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">El QR solo será válido entre estas horas</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Margen temprana (min)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={newQR.margenTemprana}
                                    onChange={(e) => setNewQR({ ...newQR, margenTemprana: parseInt(e.target.value) || 0 })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Margen tardía (min)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={newQR.margenTardia}
                                    onChange={(e) => setNewQR({ ...newQR, margenTardia: parseInt(e.target.value) || 0 })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">Temprana: antes de hora inicio. Tardía: después de hora inicio.</p>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Descripción (opcional)</Label>
                            <Input
                                value={newQR.descripcion}
                                onChange={(e) => setNewQR({ ...newQR, descripcion: e.target.value })}
                                placeholder="Ej: QR para sábado 25 de enero"
                                className="bg-white border-gray-300 text-gray-900"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateQROpen(false)} className="border-gray-300" disabled={creatingQR}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateQR} className="bg-blue-600 hover:bg-blue-700" disabled={creatingQR}>
                            {creatingQR ? 'Creando...' : 'Crear QR'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit QR Dialog */}
            <Dialog open={editQROpen} onOpenChange={setEditQROpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            Editar QR
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {editingQR && (
                                <span className="flex items-center gap-2 mt-1">
                                    <span className="font-mono font-bold text-gray-900">{editingQR.codigo}</span>
                                    <Badge
                                        className="text-xs"
                                        style={{
                                            backgroundColor: editingQR.tipoAsistencia?.color || '#6B7280',
                                            color: 'white',
                                        }}
                                    >
                                        {editingQR.tipoAsistencia?.label}
                                    </Badge>
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700">Fecha</Label>
                            <DatePickerString
                                value={editQRData.semanaInicio}
                                onChange={(value) => setEditQRData({ ...editQRData, semanaInicio: value })}
                                placeholder="Seleccionar fecha"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Hora inicio
                                </Label>
                                <Input
                                    type="time"
                                    value={editQRData.horaInicio}
                                    onChange={(e) => setEditQRData({ ...editQRData, horaInicio: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Hora fin</Label>
                                <Input
                                    type="time"
                                    value={editQRData.horaFin}
                                    onChange={(e) => setEditQRData({ ...editQRData, horaFin: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Margen temprana (min)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={editQRData.margenTemprana}
                                    onChange={(e) => setEditQRData({ ...editQRData, margenTemprana: parseInt(e.target.value) || 0 })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Margen tardía (min)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={editQRData.margenTardia}
                                    onChange={(e) => setEditQRData({ ...editQRData, margenTardia: parseInt(e.target.value) || 0 })}
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">Temprana: antes de hora inicio. Tardía: después de hora inicio.</p>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Descripción (opcional)</Label>
                            <Input
                                value={editQRData.descripcion}
                                onChange={(e) => setEditQRData({ ...editQRData, descripcion: e.target.value })}
                                placeholder="Descripción del QR"
                                className="bg-white border-gray-300 text-gray-900"
                            />
                        </div>

                        {/* Info del QR */}
                        {editingQR && (
                            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                                <p className="text-xs text-gray-500 font-medium">Información</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Asistencias registradas:</span>
                                    <span className="font-medium text-gray-900">{editingQR.totalAsistencias || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Estado:</span>
                                    <Badge
                                        variant="outline"
                                        className={editingQR.activo
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }
                                    >
                                        {editingQR.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                                {editingQR.urlWhatsapp && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyLink(editingQR.urlWhatsapp!)}
                                        className="w-full mt-2 text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copiar link de WhatsApp
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditQROpen(false);
                                setEditingQR(null);
                            }}
                            className="border-gray-300"
                            disabled={updatingQR}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveEditQR}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={updatingQR}
                        >
                            {updatingQR ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Register User Dialog */}
            <Dialog open={registerUserOpen} onOpenChange={setRegisterUserOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-blue-600" />
                            Registrar Usuario
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Crea un nuevo usuario a partir de este registro de asistencia
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700">Nombre</Label>
                            <Input
                                value={userToRegister?.nombre || ''}
                                onChange={(e) => setUserToRegister(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                                placeholder="Nombre completo"
                                className="bg-white border-gray-300 text-gray-900"
                            />
                            <p className="text-xs text-gray-500">Puedes editar el nombre antes de registrar</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Teléfono</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">+51</span>
                                <Input
                                    value={userToRegister?.telefono || ''}
                                    onChange={(e) => setUserToRegister(prev => prev ? { ...prev, telefono: e.target.value } : null)}
                                    placeholder="987654321"
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRegisterUserOpen(false);
                                setUserToRegister(null);
                            }}
                            className="border-gray-300"
                            disabled={registeringUser}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRegisterUser}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={registeringUser || !userToRegister?.nombre.trim()}
                        >
                            {registeringUser ? 'Registrando...' : 'Registrar Usuario'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
