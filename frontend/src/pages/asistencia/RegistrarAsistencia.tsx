import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    CheckCircle2,
    Loader2,
    Calendar,
    AlertCircle,
    ArrowLeft,
    Users,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DynamicForm } from '@/components/asistencia/DynamicForm';
import { asistenciaApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useAsistenciaSocket } from '@/hooks/useAsistenciaSocket';
import type { QRAsistencia, Asistencia } from '@/types';

// Helper para parsear fecha evitando problemas de zona horaria
const parseLocalDate = (fecha: string | Date): Date => {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const [datePart] = fechaStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper para extraer solo la parte de fecha (YYYY-MM-DD)
const extractDatePart = (fecha: string | Date): string => {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    return fechaStr.split('T')[0];
};

export default function RegistrarAsistencia() {
    const { codigo } = useParams<{ codigo: string }>();
    const navigate = useNavigate();
    const { token, user } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [qr, setQr] = useState<QRAsistencia | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [yaRegistrado, setYaRegistrado] = useState<Asistencia | null>(null);

    // WebSocket connection
    const {
        isConnected,
        usuariosEnRoom,
        asistencias: asistenciasEnRoom,
        setAsistencias: setAsistenciasEnRoom,
    } = useAsistenciaSocket({
        qrCode: codigo || '',
        onNuevaAsistencia: (asistencia) => {
            if (asistencia.usuario?.id !== user?.id) {
                toast.info(`${asistencia.usuario?.nombre} registró su asistencia`);
            }
        },
    });

    useEffect(() => {
        if (!token) {
            // Redirect to login with return URL
            navigate(`/login?redirect=/asistencia/${codigo}`);
            return;
        }

        loadQR();
    }, [codigo, token, navigate]);

    const loadQR = async () => {
        if (!codigo) {
            setError('Código QR no válido');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const qrData = await asistenciaApi.getQRByCodigo(codigo);

            if (!qrData.activo) {
                setError('Este código QR ya no está activo');
                return;
            }

            setQr(qrData);

            // Verificar si el usuario ya registró asistencia para este QR
            // Buscar en las asistencias del room si el usuario actual ya está
            try {
                const response = await asistenciaApi.getAll({
                    usuarioId: user?.id,
                    semanaInicio: extractDatePart(qrData.semanaInicio),
                    limit: 10,
                });

                // Buscar si hay asistencia para el mismo tipo
                const asistenciaExistente = response.data.find(
                    (a) => a.tipo?.id === qrData.tipoAsistencia?.id
                );

                if (asistenciaExistente) {
                    setYaRegistrado(asistenciaExistente);
                }
            } catch {
                // Si falla la verificación, continuar sin ella
                console.log('No se pudo verificar asistencia previa');
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            setError(axiosError.response?.data?.message || 'Código QR no válido');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (datosFormulario: Record<string, unknown>) => {
        try {
            setSubmitting(true);
            const result = await asistenciaApi.registrar({
                datosFormulario,
                metodoRegistro: 'qr_web',
                codigoQR: codigo,
            });

            // Agregar a la lista local
            setAsistenciasEnRoom((prev: Asistencia[]) => [result, ...prev]);

            setSuccess(true);
            toast.success('¡Asistencia registrada!');
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error al registrar asistencia');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white border-gray-200 shadow-lg">
                    <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver al inicio
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Vista cuando ya registró asistencia previamente
    if (yaRegistrado) {
        const tipoColor = qr?.tipoAsistencia?.color || '#3B82F6';
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-4">
                    <Card className="bg-white border-gray-200 shadow-lg">
                        <CardContent className="pt-6 text-center">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: `${tipoColor}20` }}
                            >
                                <CheckCircle2 className="w-10 h-10" style={{ color: tipoColor }} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ya registraste tu asistencia</h2>
                            <p className="text-gray-600 mb-2">
                                <span className="font-medium">{user?.nombre}</span>, ya tienes una asistencia registrada para esta semana.
                            </p>
                            <div className="my-4 p-4 bg-gray-50 rounded-lg text-left">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Tipo:</span>
                                    <Badge style={{ backgroundColor: tipoColor, color: 'white' }}>
                                        {yaRegistrado.tipo?.label || 'Sin tipo'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Fecha:</span>
                                    <span className="font-medium text-gray-900">
                                        {parseLocalDate(yaRegistrado.fecha).toLocaleDateString('es-PE', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Estado:</span>
                                    <Badge className={
                                        yaRegistrado.estado === 'confirmado'
                                            ? 'bg-green-100 text-green-700'
                                            : yaRegistrado.estado === 'rechazado'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                    }>
                                        {yaRegistrado.estado === 'confirmado'
                                            ? 'Confirmado'
                                            : yaRegistrado.estado === 'rechazado'
                                            ? 'Rechazado'
                                            : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">
                                {yaRegistrado.estado === 'pendiente_confirmacion'
                                    ? 'Tu asistencia está pendiente de confirmación por un líder.'
                                    : yaRegistrado.estado === 'confirmado'
                                    ? '¡Tu asistencia ha sido confirmada!'
                                    : 'Tu asistencia fue rechazada. Contacta a un líder si crees que es un error.'}
                            </p>
                            <Button onClick={() => navigate('/')} style={{ backgroundColor: tipoColor }}>
                                Volver al inicio
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-4">
                    <Card className="bg-white border-gray-200 shadow-lg">
                        <CardContent className="pt-6 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Asistencia Registrada!</h2>
                            <p className="text-gray-600 mb-2">Gracias por asistir, <span className="font-medium">{user?.nombre}</span></p>
                            <p className="text-sm text-gray-500 mb-6">Tu asistencia está pendiente de confirmación por un líder.</p>
                            <Button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700">
                                Continuar
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Mostrar asistencias en tiempo real */}
                    {asistenciasEnRoom.length > 0 && (
                        <Card className="bg-white border-gray-200 shadow-lg">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Asistencias registradas ({asistenciasEnRoom.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {asistenciasEnRoom.slice(0, 5).map((a) => (
                                        <div key={a.id} className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{a.usuario?.nombre}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {new Date(a.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

    const tipoAsistencia = qr?.tipoAsistencia;
    const campos = tipoAsistencia?.campos || [];
    const tipoColor = tipoAsistencia?.color || '#3B82F6';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                {/* Connection status */}
                <div className="flex items-center justify-center gap-2 text-sm">
                    {isConnected ? (
                        <>
                            <Wifi className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">Conectado</span>
                            {usuariosEnRoom.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {usuariosEnRoom.length} en sala
                                </Badge>
                            )}
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">Conectando...</span>
                        </>
                    )}
                </div>

                <Card className="bg-white border-gray-200 shadow-lg">
                    <CardHeader className="text-center">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: `${tipoColor}20` }}
                        >
                            <Calendar className="w-8 h-8" style={{ color: tipoColor }} />
                        </div>
                        <CardTitle className="text-xl text-gray-900">
                            {tipoAsistencia?.label || 'Registrar Asistencia'}
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                            Semana del {qr && parseLocalDate(qr.semanaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </CardDescription>
                        {tipoAsistencia && (
                            <Badge
                                className="mx-auto mt-2"
                                style={{ backgroundColor: tipoColor, color: 'white' }}
                            >
                                {tipoAsistencia.label}
                            </Badge>
                        )}
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>¡Hola, {user?.nombre}!</strong>
                                    <br />
                                    {tipoAsistencia?.soloPresencia
                                        ? 'Presiona el botón para registrar tu asistencia.'
                                        : 'Completa este formulario para registrar tu asistencia.'}
                                </p>
                            </div>

                            <DynamicForm
                                campos={campos}
                                onSubmit={handleSubmit}
                                isSubmitting={submitting}
                                submitLabel="Registrar Asistencia"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Asistencias en tiempo real */}
                {asistenciasEnRoom.length > 0 && (
                    <Card className="bg-white border-gray-200 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Asistencias registradas ({asistenciasEnRoom.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {asistenciasEnRoom.slice(0, 5).map((a) => (
                                    <div key={a.id} className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{a.usuario?.nombre}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {new Date(a.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
