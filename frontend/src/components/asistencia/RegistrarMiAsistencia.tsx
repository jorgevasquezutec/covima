import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    QrCode,
    Loader2,
    CheckCircle2,
    Clock,
    Calendar,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { asistenciaApi } from '@/services/api';
import type { QRAsistencia } from '@/types';
import { DynamicForm } from './DynamicForm';

interface Props {
    onSuccess?: () => void;
    compact?: boolean;
}

export default function RegistrarMiAsistencia({ onSuccess, compact = false }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [qrs, setQrs] = useState<QRAsistencia[]>([]);
    const [selectedQR, setSelectedQR] = useState<QRAsistencia | null>(null);

    useEffect(() => {
        loadQRs();
    }, []);

    const loadQRs = async () => {
        try {
            setLoading(true);
            const data = await asistenciaApi.getQRsDisponibles();
            setQrs(data);
        } catch {
            console.error('Error al cargar QRs disponibles');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (datosFormulario: Record<string, unknown>) => {
        if (!selectedQR) {
            toast.error('Selecciona una asistencia');
            return;
        }

        try {
            setSubmitting(true);
            await asistenciaApi.registrar({
                codigoQR: selectedQR.codigo,
                datosFormulario,
            });

            toast.success('Asistencia registrada correctamente');
            setSelectedQR(null);
            loadQRs();
            onSuccess?.();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Error al registrar asistencia');
        } finally {
            setSubmitting(false);
        }
    };

    const formatHora = (fecha: string | Date | null): string => {
        if (!fecha) return '--:--';
        const d = new Date(fecha);
        return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatFechaSemana = (fecha: string | Date | null): string => {
        if (!fecha) return '';
        // Parsear fecha evitando problemas de timezone
        const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
        const [datePart] = fechaStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return localDate.toLocaleDateString('es-PE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    if (loading) {
        return (
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className={compact ? 'py-6' : 'py-8'}>
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-500 text-sm">Cargando asistencias...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (qrs.length === 0) {
        return (
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className={compact ? 'py-6' : 'py-8'}>
                    <div className="text-center">
                        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">No hay asistencias pendientes</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Ya registraste todas las asistencias disponibles o no hay en este horario
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className={compact ? 'pb-3' : undefined}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-green-600" />
                        Asistencias en Curso
                    </CardTitle>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        {qrs.length} pendiente{qrs.length > 1 ? 's' : ''}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Lista de asistencias disponibles */}
                {!selectedQR && (
                    <div className="space-y-2">
                        {qrs.map((qr) => (
                            <button
                                key={qr.id}
                                type="button"
                                onClick={() => setSelectedQR(qr)}
                                className="w-full p-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-all text-left group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge
                                                className="text-xs"
                                                style={{
                                                    backgroundColor: qr.tipoAsistencia?.color || '#3B82F6',
                                                    color: 'white',
                                                }}
                                            >
                                                {qr.tipoAsistencia?.label}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatFechaSemana(qr.semanaInicio)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Formulario de registro */}
                {selectedQR && (
                    <div className="space-y-4">
                        {/* Header del QR seleccionado */}
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Badge
                                        className="text-xs"
                                        style={{
                                            backgroundColor: selectedQR.tipoAsistencia?.color || '#3B82F6',
                                            color: 'white',
                                        }}
                                    >
                                        {selectedQR.tipoAsistencia?.label}
                                    </Badge>
                                    <p className="text-xs text-green-700 mt-1">
                                        {formatFechaSemana(selectedQR.semanaInicio)}
                                    </p>
                                </div>
                                {qrs.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-green-700 hover:text-green-900 hover:bg-green-100"
                                        onClick={() => setSelectedQR(null)}
                                    >
                                        Volver
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Formulario dinámico o botón directo */}
                        {selectedQR.tipoAsistencia && !selectedQR.tipoAsistencia.soloPresencia && selectedQR.tipoAsistencia.campos && selectedQR.tipoAsistencia.campos.length > 0 ? (
                            <DynamicForm
                                campos={selectedQR.tipoAsistencia.campos}
                                onSubmit={handleSubmit}
                                isSubmitting={submitting}
                                submitLabel="Registrar Asistencia"
                            />
                        ) : (
                            <Button
                                onClick={() => handleSubmit({})}
                                disabled={submitting}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Registrar Asistencia
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
