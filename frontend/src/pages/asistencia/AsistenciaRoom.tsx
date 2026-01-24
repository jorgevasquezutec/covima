import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Users,
    CheckCircle2,
    Clock,
    Wifi,
    WifiOff,
    RefreshCw,
    QrCode,
    Maximize2,
    AlertTriangle,
    LogIn,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { asistenciaApi } from '@/services/api';
import { useAsistenciaSocket } from '@/hooks/useAsistenciaSocket';
import type { QRAsistencia, Asistencia } from '@/types';

// Helper para parsear fecha evitando problemas de zona horaria
// Extrae YYYY-MM-DD y crea la fecha en zona horaria local
const parseLocalDate = (fecha: string | Date): Date => {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const [datePart] = fechaStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper para formatear hora desde timestamp o string
const formatHora = (hora: string): string => {
    if (!hora) return '--:--';
    // Si ya es un formato HH:MM, devolverlo
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    // Si es un timestamp, extraer la hora
    try {
        const date = new Date(hora);
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
        return hora;
    }
};

// Helper para verificar si el QR está dentro del horario válido
const isQRTimeValid = (qr: QRAsistencia): boolean => {
    const now = new Date();
    const qrDate = parseLocalDate(qr.semanaInicio);

    // Verificar si es el mismo día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    qrDate.setHours(0, 0, 0, 0);

    if (qrDate.getTime() !== today.getTime()) {
        // Si la fecha del QR ya pasó, no es válido
        if (qrDate < today) return false;
        // Si es una fecha futura, aún no es válido
        return false;
    }

    // Verificar horario
    const horaInicio = formatHora(qr.horaInicio);
    const horaFin = formatHora(qr.horaFin);

    const [inicioH, inicioM] = horaInicio.split(':').map(Number);
    const [finH, finM] = horaFin.split(':').map(Number);

    const inicioMinutos = inicioH * 60 + inicioM;
    const finMinutos = finH * 60 + finM;
    const ahoraMinutos = now.getHours() * 60 + now.getMinutes();

    return ahoraMinutos >= inicioMinutos && ahoraMinutos <= finMinutos;
};

// Helper para verificar si el QR ha expirado completamente
const isQRExpired = (qr: QRAsistencia): boolean => {
    const now = new Date();
    const qrDate = parseLocalDate(qr.semanaInicio);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    qrDate.setHours(0, 0, 0, 0);

    // Si la fecha ya pasó
    if (qrDate < today) return true;

    // Si es hoy, verificar si la hora fin ya pasó
    if (qrDate.getTime() === today.getTime()) {
        const horaFin = formatHora(qr.horaFin);
        const [finH, finM] = horaFin.split(':').map(Number);
        const finMinutos = finH * 60 + finM;
        const ahoraMinutos = now.getHours() * 60 + now.getMinutes();
        return ahoraMinutos > finMinutos;
    }

    return false;
};

export default function AsistenciaRoom() {
    const { codigo } = useParams<{ codigo: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [qr, setQr] = useState<QRAsistencia | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [qrExpanded, setQrExpanded] = useState(false);

    // Verificar si el usuario puede confirmar (debe estar autenticado y ser admin/lider)
    const canConfirm = useMemo(() => {
        if (!user) return false;
        return user.roles?.includes('admin') || user.roles?.includes('lider');
    }, [user]);

    // Verificar si el QR ha expirado
    const qrExpiredStatus = useMemo(() => {
        if (!qr) return { expired: false, message: '' };
        return {
            expired: isQRExpired(qr),
            inTimeWindow: isQRTimeValid(qr),
        };
    }, [qr]);

    // WebSocket connection - solo para ver nuevas asistencias en tiempo real
    const {
        isConnected,
        asistencias,
        setAsistencias,
    } = useAsistenciaSocket({
        qrCode: codigo || '',
        onNuevaAsistencia: (asistencia) => {
            toast.success(`✅ ${asistencia.usuario?.nombre || asistencia.nombreRegistro || 'Usuario'} registró asistencia`, {
                duration: 5000,
            });
        },
    });

    useEffect(() => {
        loadQR();
        loadAsistencias();
    }, [codigo]);

    const loadQR = async () => {
        if (!codigo) return;

        try {
            setLoading(true);
            const qrData = await asistenciaApi.getQRByCodigo(codigo);
            setQr(qrData);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            setError(axiosError.response?.data?.message || 'QR no encontrado');
        } finally {
            setLoading(false);
        }
    };

    const loadAsistencias = async () => {
        if (!codigo) return;
        try {
            const response = await asistenciaApi.getAll({ limit: 100 });
            const filtradas = response.data.filter((a: Asistencia) => a.qr?.codigo === codigo);
            setAsistencias(filtradas);
        } catch {
            console.error('Error loading asistencias');
        }
    };

    const handleConfirmar = async (id: number, estado: 'confirmado' | 'rechazado') => {
        try {
            await asistenciaApi.confirmar(id, { estado });
            toast.success(estado === 'confirmado' ? 'Asistencia confirmada' : 'Asistencia rechazada');
            setAsistencias((prev: Asistencia[]) =>
                prev.map((a) => (a.id === id ? { ...a, estado } : a))
            );
        } catch {
            toast.error('Error al procesar asistencia');
        }
    };

    const handleConfirmarTodos = async () => {
        const pendientes = asistencias.filter((a) => a.estado === 'pendiente_confirmacion');
        if (pendientes.length === 0) {
            toast.info('No hay asistencias pendientes');
            return;
        }

        try {
            const ids = pendientes.map((a) => a.id);
            await asistenciaApi.confirmarMultiples(ids, 'confirmado');
            toast.success(`${ids.length} asistencias confirmadas`);
            setAsistencias((prev: Asistencia[]) =>
                prev.map((a) =>
                    pendientes.find((p) => p.id === a.id)
                        ? { ...a, estado: 'confirmado' as const }
                        : a
                )
            );
        } catch {
            toast.error('Error al confirmar asistencias');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600 text-lg">Cargando room...</div>
            </div>
        );
    }

    if (error || !qr) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="bg-white border-gray-200 shadow-lg max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Error</h2>
                        <p className="text-gray-600 mb-6">{error || 'QR no encontrado'}</p>
                        <Button onClick={() => navigate('/')} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Ir al inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Mostrar mensaje si el QR ha expirado
    if (qrExpiredStatus.expired) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="bg-white border-gray-200 shadow-lg max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Room no disponible</h2>
                        <p className="text-gray-600 mb-2">
                            El horario de asistencia para este QR ha finalizado.
                        </p>
                        <p className="text-gray-500 text-sm mb-6">
                            Fecha: {parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                            <br />
                            Horario: {formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)}
                        </p>
                        <Button onClick={() => navigate('/')} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Ir al inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const tipoColor = qr.tipoAsistencia?.color || '#3B82F6';
    const pendientes = asistencias.filter((a) => a.estado === 'pendiente_confirmacion');
    const confirmados = asistencias.filter((a) => a.estado === 'confirmado');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate(user ? '/asistencias' : '/')}
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {user ? 'Volver' : 'Inicio'}
                        </Button>
                        <div>
                            <h1 className="text-gray-900 font-bold text-lg">
                                {qr.tipoAsistencia?.label || 'Asistencia'}
                            </h1>
                            <p className="text-gray-500 text-sm">
                                Room en vivo • {codigo}
                            </p>
                        </div>
                    </div>

                    {/* Estado de conexión */}
                    <div className="flex items-center gap-3">
                        {isConnected ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200">
                                <Wifi className="w-3 h-3 mr-1" />
                                En vivo
                            </Badge>
                        ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">
                                <WifiOff className="w-3 h-3 mr-1" />
                                Conectando...
                            </Badge>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Panel izquierdo: QR y estadísticas */}
                    <div className="space-y-6">
                        {/* QR Code Card */}
                        <Card className="bg-white border-gray-200 shadow-sm">
                            <CardHeader className="text-center pb-2">
                                <CardTitle className="text-gray-900 flex items-center justify-center gap-2">
                                    <QrCode className="w-5 h-5" />
                                    Código QR
                                </CardTitle>
                                <CardDescription className="text-gray-500">
                                    Haz click para expandir
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                {(qr.urlWhatsapp || qr.urlGenerada) && (
                                    <div
                                        className="bg-white p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all group relative"
                                        onClick={() => setQrExpanded(true)}
                                    >
                                        <QRCodeSVG
                                            value={qr.urlWhatsapp || qr.urlGenerada || ''}
                                            size={180}
                                            level="H"
                                            includeMargin={true}
                                            bgColor="#ffffff"
                                            fgColor={tipoColor}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-xl flex items-center justify-center transition-all">
                                            <Maximize2 className="w-8 h-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                )}
                                <p className="text-gray-700 text-sm text-center mt-4 font-medium">
                                    {parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </p>
                                <p className="text-gray-500 text-xs mt-1">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="pt-4 text-center">
                                    <p className="text-green-700 text-3xl font-bold">{confirmados.length}</p>
                                    <p className="text-green-600 text-sm">Confirmados</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-yellow-50 border-yellow-200">
                                <CardContent className="pt-4 text-center">
                                    <p className="text-yellow-700 text-3xl font-bold">{pendientes.length}</p>
                                    <p className="text-yellow-600 text-sm">Pendientes</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Confirmar todos - Solo para usuarios autenticados con permisos */}
                        {pendientes.length > 0 && canConfirm && (
                            <Button
                                onClick={handleConfirmarTodos}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Confirmar todos ({pendientes.length})
                            </Button>
                        )}

                        {/* Mensaje para usuarios no autenticados */}
                        {!user && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                                <LogIn className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                <p className="text-sm text-blue-800 font-medium">
                                    Inicia sesión para confirmar asistencias
                                </p>
                                <Button
                                    onClick={() => navigate('/login')}
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 border-blue-300 text-blue-600 hover:bg-blue-100"
                                >
                                    Iniciar sesión
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Panel derecho: Lista de asistencias en tiempo real */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white border-gray-200 shadow-sm h-full">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
                                <div>
                                    <CardTitle className="text-gray-900 flex items-center gap-2">
                                        <RefreshCw className={`w-4 h-4 ${isConnected ? 'animate-spin-slow text-green-600' : 'text-gray-400'}`} />
                                        Asistencias en tiempo real
                                    </CardTitle>
                                    <CardDescription className="text-gray-500">
                                        {asistencias.length} registros
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {asistencias.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Esperando asistencias...</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            Los participantes pueden escanear el QR para registrarse
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                        {asistencias.map((asistencia, index) => (
                                            <div
                                                key={asistencia.id}
                                                className={`
                                                    flex items-center justify-between p-4 rounded-lg border
                                                    ${index === 0 ? 'bg-blue-50 border-blue-200 animate-pulse-once' : 'bg-gray-50 border-gray-100'}
                                                    transition-all duration-300
                                                `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center
                                                        ${asistencia.estado === 'confirmado' ? 'bg-green-100' :
                                                            asistencia.estado === 'rechazado' ? 'bg-red-100' : 'bg-yellow-100'}
                                                    `}>
                                                        <span className={`
                                                            text-lg font-bold
                                                            ${asistencia.estado === 'confirmado' ? 'text-green-600' :
                                                                asistencia.estado === 'rechazado' ? 'text-red-600' : 'text-yellow-600'}
                                                        `}>
                                                            {(asistencia.usuario?.nombre || asistencia.nombreRegistro || 'U').charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-900 font-medium">
                                                            {asistencia.usuario?.nombre || asistencia.nombreRegistro || 'Sin nombre'}
                                                        </p>
                                                        <p className="text-gray-500 text-sm">
                                                            {new Date(asistencia.createdAt).toLocaleTimeString('es-PE', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {asistencia.estado === 'pendiente_confirmacion' ? (
                                                        canConfirm ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleConfirmar(asistencia.id, 'confirmado')}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                                Confirmar
                                                            </Button>
                                                        ) : (
                                                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Pendiente
                                                            </Badge>
                                                        )
                                                    ) : (
                                                        <Badge className={`
                                                            ${asistencia.estado === 'confirmado'
                                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                                : 'bg-red-100 text-red-700 border-red-200'}
                                                        `}>
                                                            {asistencia.estado === 'confirmado' ? '✓ Confirmado' : '✗ Rechazado'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modal QR Expandido */}
            <Dialog open={qrExpanded} onOpenChange={setQrExpanded}>
                <DialogContent className="max-w-3xl bg-white border-gray-200">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            {qr.tipoAsistencia?.label || 'Asistencia'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Escanea para registrar tu asistencia
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center">
                        {(qr.urlWhatsapp || qr.urlGenerada) && (
                            <div className="bg-white p-6 rounded-2xl border-4 border-gray-100 shadow-lg">
                                <QRCodeSVG
                                    value={qr.urlWhatsapp || qr.urlGenerada || ''}
                                    size={400}
                                    level="H"
                                    includeMargin={true}
                                    bgColor="#ffffff"
                                    fgColor={tipoColor}
                                />
                            </div>
                        )}
                        <div className="mt-6 text-center">
                            <p className="text-lg font-medium text-gray-900">
                                {parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </p>
                            <p className="text-gray-500 mt-1">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Válido de {formatHora(qr.horaInicio)} a {formatHora(qr.horaFin)}
                            </p>
                            <Badge
                                className="mt-4"
                                style={{ backgroundColor: tipoColor, color: 'white' }}
                            >
                                {qr.tipoAsistencia?.label}
                            </Badge>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CSS para animaciones */}
            <style>{`
                @keyframes pulse-once {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; background-color: rgba(59, 130, 246, 0.1); }
                }
                .animate-pulse-once {
                    animation: pulse-once 2s ease-in-out;
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
            `}</style>
        </div>
    );
}
