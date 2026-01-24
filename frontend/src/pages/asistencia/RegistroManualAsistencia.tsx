import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    UserPlus,
    Search,
    QrCode,
    Loader2,
    CheckCircle2,
    User,
    Phone,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { asistenciaApi, usuariosApi } from '@/services/api';
import type { QRAsistencia, Usuario } from '@/types';
import { DynamicForm } from '@/components/asistencia/DynamicForm';

interface Props {
    onSuccess?: () => void;
}

// Helper para formatear hora (muestra hora UTC, que es lo que guardó el usuario)
const formatHora = (hora: string): string => {
    if (!hora) return '--:--';
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    try {
        const date = new Date(hora);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch {
        return hora;
    }
};

// Helper para verificar si QR está en horario válido (compara hora local del usuario con la hora guardada)
const isQRInTime = (qr: QRAsistencia): boolean => {
    const now = new Date();
    const horaActual = now.getHours() * 60 + now.getMinutes();

    const horaInicio = qr.horaInicio ? new Date(qr.horaInicio) : null;
    const horaFin = qr.horaFin ? new Date(qr.horaFin) : null;

    // Usar getUTCHours porque el backend guarda la hora que ingresó el usuario como UTC
    const inicioMinutos = horaInicio ? horaInicio.getUTCHours() * 60 + horaInicio.getUTCMinutes() : 9 * 60;
    const finMinutos = horaFin ? horaFin.getUTCHours() * 60 + horaFin.getUTCMinutes() : 12 * 60;

    return horaActual >= inicioMinutos && horaActual < finMinutos;
};

export default function RegistroManualAsistencia({ onSuccess }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [qrs, setQrs] = useState<QRAsistencia[]>([]);
    const [selectedQR, setSelectedQR] = useState<QRAsistencia | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);

    // Modo: 'usuario' o 'manual'
    const [modo, setModo] = useState<'usuario' | 'manual'>('usuario');
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [nombreManual, setNombreManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');

    // Cargar QRs activos
    useEffect(() => {
        const loadQRs = async () => {
            try {
                setLoading(true);
                const response = await asistenciaApi.getAllQRs({ activo: true, limit: 50 });
                // Filtrar solo los que están en horario
                const qrsEnHorario = response.data.filter(qr => qr.activo && isQRInTime(qr));
                setQrs(qrsEnHorario);
            } catch {
                toast.error('Error al cargar QRs');
            } finally {
                setLoading(false);
            }
        };
        loadQRs();
    }, []);

    // Buscar usuarios
    useEffect(() => {
        const searchUsuarios = async () => {
            if (searchTerm.length < 2) {
                setUsuarios([]);
                return;
            }
            try {
                setSearching(true);
                const response = await usuariosApi.getAll({ search: searchTerm, activo: true, limit: 10 });
                setUsuarios(response.data);
            } catch {
                console.error('Error buscando usuarios');
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(searchUsuarios, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

    const handleSubmit = async (datosFormulario: Record<string, unknown>) => {
        if (!selectedQR) {
            toast.error('Selecciona un QR');
            return;
        }

        if (modo === 'usuario' && !selectedUsuario) {
            toast.error('Selecciona un usuario');
            return;
        }

        if (modo === 'manual' && !telefonoManual && !nombreManual) {
            toast.error('Ingresa al menos el nombre o teléfono');
            return;
        }

        try {
            setSubmitting(true);
            await asistenciaApi.registrarManual({
                codigoQR: selectedQR.codigo,
                usuarioId: modo === 'usuario' ? selectedUsuario?.id : undefined,
                telefonoManual: modo === 'manual' ? telefonoManual : undefined,
                nombreManual: modo === 'manual' ? nombreManual : undefined,
                datosFormulario,
            });

            toast.success('Asistencia registrada correctamente');

            // Reset form
            setSelectedUsuario(null);
            setSearchTerm('');
            setNombreManual('');
            setTelefonoManual('');

            onSuccess?.();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Error al registrar asistencia');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Cargando...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (qrs.length === 0) {
        return (
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-12">
                    <div className="text-center">
                        <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay QRs activos en este momento</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Los QRs solo están disponibles durante su horario configurado
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-gray-900">Registro Manual de Asistencia</CardTitle>
                </div>
                <CardDescription className="text-gray-500">
                    Registra la asistencia de un usuario manualmente
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Selector de QR */}
                <div className="space-y-2">
                    <Label className="text-gray-700">Seleccionar QR activo</Label>
                    <Select
                        value={selectedQR?.codigo || ''}
                        onValueChange={(codigo) => {
                            const qr = qrs.find(q => q.codigo === codigo);
                            setSelectedQR(qr || null);
                        }}
                    >
                        <SelectTrigger className="w-full bg-white border-gray-300">
                            <SelectValue placeholder="Selecciona un QR" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                            {qrs.map((qr) => (
                                <SelectItem key={qr.id} value={qr.codigo}>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className="text-xs"
                                            style={{
                                                backgroundColor: qr.tipoAsistencia?.color || '#3B82F6',
                                                color: 'white',
                                            }}
                                        >
                                            {qr.tipoAsistencia?.label}
                                        </Badge>
                                        <span className="font-mono text-sm">{qr.codigo}</span>
                                        <span className="text-gray-400 text-xs">
                                            ({formatHora(qr.horaInicio)} - {formatHora(qr.horaFin)})
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedQR && (
                    <>
                        {/* Modo de registro */}
                        <div className="space-y-2">
                            <Label className="text-gray-700">Tipo de registro</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={modo === 'usuario' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setModo('usuario')}
                                    className={modo === 'usuario' ? 'bg-blue-600' : ''}
                                >
                                    <User className="w-4 h-4 mr-1" />
                                    Usuario existente
                                </Button>
                                <Button
                                    type="button"
                                    variant={modo === 'manual' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setModo('manual')}
                                    className={modo === 'manual' ? 'bg-blue-600' : ''}
                                >
                                    <Phone className="w-4 h-4 mr-1" />
                                    Ingreso manual
                                </Button>
                            </div>
                        </div>

                        {modo === 'usuario' ? (
                            /* Búsqueda de usuario */
                            <div className="space-y-2">
                                <Label className="text-gray-700">Buscar usuario</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por nombre o teléfono..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-white border-gray-300"
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </div>

                                {/* Resultados de búsqueda */}
                                {usuarios.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                        {usuarios.map((usuario) => (
                                            <div
                                                key={usuario.id}
                                                className={`p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                                                    selectedUsuario?.id === usuario.id
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'hover:bg-gray-50'
                                                }`}
                                                onClick={() => {
                                                    setSelectedUsuario(usuario);
                                                    setSearchTerm(usuario.nombre);
                                                    setUsuarios([]);
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{usuario.nombre}</p>
                                                        <p className="text-sm text-gray-500">{usuario.telefono}</p>
                                                    </div>
                                                    {selectedUsuario?.id === usuario.id && (
                                                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Usuario seleccionado */}
                                {selectedUsuario && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium text-green-900">{selectedUsuario.nombre}</p>
                                                    <p className="text-sm text-green-700">{selectedUsuario.telefono}</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-green-700 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => {
                                                    setSelectedUsuario(null);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Ingreso manual */
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-700">Nombre</Label>
                                    <Input
                                        placeholder="Nombre del asistente"
                                        value={nombreManual}
                                        onChange={(e) => setNombreManual(e.target.value)}
                                        className="bg-white border-gray-300"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-700">Teléfono</Label>
                                    <Input
                                        placeholder="51987654321 (opcional)"
                                        value={telefonoManual}
                                        onChange={(e) => setTelefonoManual(e.target.value)}
                                        className="bg-white border-gray-300"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Formulario dinámico */}
                        {selectedQR.tipoAsistencia && !selectedQR.tipoAsistencia.soloPresencia && (
                            <div className="pt-4 border-t border-gray-200">
                                <DynamicForm
                                    campos={selectedQR.tipoAsistencia.campos || []}
                                    onSubmit={handleSubmit}
                                    isSubmitting={submitting}
                                    submitLabel="Registrar Asistencia"
                                />
                            </div>
                        )}

                        {/* Si es solo presencia, mostrar botón directo */}
                        {selectedQR.tipoAsistencia?.soloPresencia && (
                            <Button
                                onClick={() => handleSubmit({})}
                                disabled={submitting || (modo === 'usuario' && !selectedUsuario) || (modo === 'manual' && !telefonoManual)}
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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
