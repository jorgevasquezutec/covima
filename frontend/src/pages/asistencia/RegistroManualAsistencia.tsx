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
    History,
    Users,
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { asistenciaApi, usuariosApi } from '@/services/api';
import type { QRAsistencia, Usuario } from '@/types';
import { DynamicForm } from '@/components/asistencia/DynamicForm';
import { parseLocalDate } from '@/lib/utils';

interface Props {
    onSuccess?: () => void;
}

// Helper para verificar si QR está en horario válido (considerando margenTemprana)
const isQRInTime = (qr: QRAsistencia): boolean => {
    const now = new Date();
    const horaActual = now.getHours() * 60 + now.getMinutes();

    const horaInicio = qr.horaInicio ? new Date(qr.horaInicio) : null;
    const horaFin = qr.horaFin ? new Date(qr.horaFin) : null;

    // Usar getHours para obtener hora local (Peru)
    const inicioMinutos = horaInicio ? horaInicio.getHours() * 60 + horaInicio.getMinutes() : 9 * 60;
    const finMinutos = horaFin ? horaFin.getHours() * 60 + horaFin.getMinutes() : 12 * 60;

    // Aplicar margen temprana: el QR se abre margenTemprana minutos antes de horaInicio
    const margenTemprana = qr.margenTemprana || 0;
    const horaApertura = inicioMinutos - margenTemprana;

    // Verificar si está en horario (considerando horarios que cruzan medianoche)
    if (finMinutos > horaApertura) {
        // Horario normal
        return horaActual >= horaApertura && horaActual < finMinutos;
    } else {
        // Horario que cruza medianoche
        return horaActual >= horaApertura || horaActual < finMinutos;
    }
};

export default function RegistroManualAsistencia({ onSuccess }: Props) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [qrs, setQrs] = useState<QRAsistencia[]>([]);
    const [selectedQR, setSelectedQR] = useState<QRAsistencia | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);

    // Modo: 'usuario', 'manual' o 'masivo'
    const [modo, setModo] = useState<'usuario' | 'manual' | 'masivo'>('usuario');
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [nombreManual, setNombreManual] = useState('');
    const [telefonoManual, setTelefonoManual] = useState('');

    // Modo masivo
    const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);
    const [masivoBusqueda, setMasivoBusqueda] = useState('');
    const [selectedUsuarioIds, setSelectedUsuarioIds] = useState<Set<number>>(new Set());

    // Modo histórico (para QRs pasados)
    const [modoHistorico, setModoHistorico] = useState(false);
    const [tipoAsistenciaManual, setTipoAsistenciaManual] = useState<'temprana' | 'normal' | 'tardia'>('normal');

    // Cargar QRs (activos en horario, o todos si es histórico)
    useEffect(() => {
        const loadQRs = async () => {
            try {
                setLoading(true);
                setSelectedQR(null);

                if (modoHistorico) {
                    // Cargar todos los QRs (para registro histórico)
                    const response = await asistenciaApi.getAllQRs({ limit: 100 });
                    setQrs(response.data);
                } else {
                    // Solo QRs activos y en horario
                    const response = await asistenciaApi.getAllQRs({ activo: true, limit: 50 });
                    const qrsEnHorario = response.data.filter(qr => qr.activo && isQRInTime(qr));
                    setQrs(qrsEnHorario);
                }
            } catch {
                toast.error('Error al cargar QRs');
            } finally {
                setLoading(false);
            }
        };
        loadQRs();
    }, [modoHistorico]);

    // Cargar todos los usuarios cuando se entra en modo masivo
    useEffect(() => {
        if (modo !== 'masivo') return;
        if (todosUsuarios.length > 0) return; // ya cargados

        const loadAllUsuarios = async () => {
            try {
                setLoadingUsuarios(true);
                const response = await usuariosApi.getAll({ activo: true, limit: 500 });
                setTodosUsuarios(response.data);
            } catch {
                toast.error('Error al cargar usuarios');
            } finally {
                setLoadingUsuarios(false);
            }
        };
        loadAllUsuarios();
    }, [modo, todosUsuarios.length]);

    // Buscar usuarios (modo individual)
    useEffect(() => {
        if (modo !== 'usuario') return;

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
    }, [searchTerm, modo]);

    // Usuarios filtrados para modo masivo
    const usuariosFiltrados = masivoBusqueda.length >= 2
        ? todosUsuarios.filter(u =>
            u.nombre.toLowerCase().includes(masivoBusqueda.toLowerCase()) ||
            u.telefono?.includes(masivoBusqueda)
        )
        : todosUsuarios;

    const toggleUsuarioMasivo = (id: number) => {
        setSelectedUsuarioIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (next.size >= 50) {
                    toast.error('Máximo 50 usuarios por registro masivo');
                    return prev;
                }
                next.add(id);
            }
            return next;
        });
    };

    const seleccionarTodos = () => {
        const ids = usuariosFiltrados.map(u => u.id);
        if (ids.length > 50) {
            toast.error('Máximo 50 usuarios. Filtra la lista primero.');
            return;
        }
        setSelectedUsuarioIds(new Set(ids));
    };

    const deseleccionarTodos = () => {
        setSelectedUsuarioIds(new Set());
    };

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

        if (modo === 'masivo' && selectedUsuarioIds.size === 0) {
            toast.error('Selecciona al menos un usuario');
            return;
        }

        try {
            setSubmitting(true);

            if (modo === 'masivo') {
                // Registro masivo
                const usuarioIds = Array.from(selectedUsuarioIds);

                if (modoHistorico) {
                    const result = await asistenciaApi.registrarHistoricaMasivo({
                        codigoQR: selectedQR.codigo,
                        usuarioIds,
                        tipoAsistenciaManual,
                        datosFormulario,
                    });
                    toast.success(
                        `${result.registrados} registrados, ${result.yaRegistrados} ya registrados${result.errores > 0 ? `, ${result.errores} errores` : ''}`
                    );
                } else {
                    const result = await asistenciaApi.registrarManualMasivo({
                        codigoQR: selectedQR.codigo,
                        usuarioIds,
                        datosFormulario,
                    });
                    toast.success(
                        `${result.registrados} registrados, ${result.yaRegistrados} ya registrados${result.errores > 0 ? `, ${result.errores} errores` : ''}`
                    );
                }

                setSelectedUsuarioIds(new Set());
            } else if (modoHistorico) {
                // Registro histórico individual
                await asistenciaApi.registrarHistorica({
                    codigoQR: selectedQR.codigo,
                    usuarioId: modo === 'usuario' ? selectedUsuario?.id : undefined,
                    telefonoManual: modo === 'manual' ? telefonoManual : undefined,
                    nombreManual: modo === 'manual' ? nombreManual : undefined,
                    tipoAsistenciaManual,
                    datosFormulario,
                });

                const tipoLabel = ` (${tipoAsistenciaManual === 'temprana' ? 'Temprana' : tipoAsistenciaManual === 'normal' ? 'Normal' : 'Tardía'})`;
                toast.success(`Asistencia registrada correctamente${tipoLabel}`);

                setSelectedUsuario(null);
                setSearchTerm('');
                setNombreManual('');
                setTelefonoManual('');
            } else {
                // Registro normal individual
                await asistenciaApi.registrarManual({
                    codigoQR: selectedQR.codigo,
                    usuarioId: modo === 'usuario' ? selectedUsuario?.id : undefined,
                    telefonoManual: modo === 'manual' ? telefonoManual : undefined,
                    nombreManual: modo === 'manual' ? nombreManual : undefined,
                    datosFormulario,
                });

                toast.success('Asistencia registrada correctamente');

                setSelectedUsuario(null);
                setSearchTerm('');
                setNombreManual('');
                setTelefonoManual('');
            }

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
                        {modoHistorico ? (
                            <>
                                <p className="text-gray-500 font-medium">No hay QRs registrados</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Crea un QR primero para poder registrar asistencia
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setModoHistorico(false)}
                                >
                                    Volver
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-500 font-medium">No hay QRs activos en este momento</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Los QRs solo están disponibles durante su horario configurado
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setModoHistorico(true)}
                                >
                                    <History className="w-4 h-4 mr-2" />
                                    Ver QRs históricos
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <UserPlus className="w-5 h-5 text-green-600 shrink-0" />
                        <CardTitle className="text-gray-900 text-base sm:text-lg">Registro Manual</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <History className="w-3.5 h-3.5 text-gray-400" />
                        <Label htmlFor="modo-historico" className="text-xs text-gray-500 hidden sm:inline">
                            Histórico
                        </Label>
                        <Switch
                            id="modo-historico"
                            checked={modoHistorico}
                            onCheckedChange={setModoHistorico}
                        />
                    </div>
                </div>
                <CardDescription className="text-gray-500 text-sm mt-1">
                    {modoHistorico
                        ? 'Registra en QRs pasados (solo admin)'
                        : 'Registra asistencia manualmente'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {/* Selector de QR */}
                <div className="space-y-1.5">
                    <Label className="text-gray-700 text-sm">
                        {modoHistorico ? 'QR (histórico)' : 'QR activo'}
                    </Label>
                    <Select
                        value={selectedQR?.codigo || ''}
                        onValueChange={(codigo) => {
                            const qr = qrs.find(q => q.codigo === codigo);
                            setSelectedQR(qr || null);
                        }}
                    >
                        <SelectTrigger className="w-full bg-white border-gray-300 h-9 text-sm">
                            <SelectValue placeholder="Selecciona un QR" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 max-h-56">
                            {qrs.map((qr) => {
                                const fecha = parseLocalDate(qr.semanaInicio);
                                const fechaStr = fecha.toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'short',
                                });
                                return (
                                    <SelectItem key={qr.id} value={qr.codigo} className="py-2">
                                        <div className="flex items-center gap-1.5">
                                            <Badge
                                                className="text-[10px] px-1.5 py-0 shrink-0"
                                                style={{
                                                    backgroundColor: qr.tipoAsistencia?.color || '#3B82F6',
                                                    color: 'white',
                                                }}
                                            >
                                                {qr.tipoAsistencia?.label}
                                            </Badge>
                                            <span className="font-mono text-xs">{qr.codigo}</span>
                                            {modoHistorico && (
                                                <span className="text-[10px] text-gray-400">({fechaStr})</span>
                                            )}
                                            {!qr.activo && (
                                                <span className="text-[10px] text-gray-400 italic">inactivo</span>
                                            )}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Selector de tipo de asistencia (solo modo histórico) */}
                {modoHistorico && selectedQR && (
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Tipo de asistencia</Label>
                        <div className="flex gap-1.5">
                            <Button
                                type="button"
                                variant={tipoAsistenciaManual === 'temprana' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTipoAsistenciaManual('temprana')}
                                className={`flex-1 text-xs px-2 ${tipoAsistenciaManual === 'temprana' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            >
                                Temprana
                            </Button>
                            <Button
                                type="button"
                                variant={tipoAsistenciaManual === 'normal' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTipoAsistenciaManual('normal')}
                                className={`flex-1 text-xs px-2 ${tipoAsistenciaManual === 'normal' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            >
                                Normal
                            </Button>
                            <Button
                                type="button"
                                variant={tipoAsistenciaManual === 'tardia' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTipoAsistenciaManual('tardia')}
                                className={`flex-1 text-xs px-2 ${tipoAsistenciaManual === 'tardia' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                            >
                                Tardía
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400">
                            Puntos según tipo seleccionado
                        </p>
                    </div>
                )}

                {selectedQR && (
                    <>
                        {/* Modo de registro */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">Tipo de registro</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={modo === 'usuario' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setModo('usuario')}
                                    className={`flex-1 text-xs ${modo === 'usuario' ? 'bg-blue-600' : ''}`}
                                >
                                    <User className="w-4 h-4 mr-1 shrink-0" />
                                    Individual
                                </Button>
                                <Button
                                    type="button"
                                    variant={modo === 'masivo' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setModo('masivo')}
                                    className={`flex-1 text-xs ${modo === 'masivo' ? 'bg-blue-600' : ''}`}
                                >
                                    <Users className="w-4 h-4 mr-1 shrink-0" />
                                    Masivo
                                </Button>
                                <Button
                                    type="button"
                                    variant={modo === 'manual' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setModo('manual')}
                                    className={`flex-1 text-xs ${modo === 'manual' ? 'bg-blue-600' : ''}`}
                                >
                                    <Phone className="w-4 h-4 mr-1 shrink-0" />
                                    Manual
                                </Button>
                            </div>
                        </div>

                        {modo === 'usuario' ? (
                            /* Búsqueda de usuario individual */
                            <div className="space-y-2">
                                <Label className="text-gray-700 text-sm">Buscar usuario</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Nombre o teléfono"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 bg-white border-gray-300 text-sm h-9"
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                </div>

                                {/* Resultados de búsqueda */}
                                {usuarios.length > 0 && (
                                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                                        {usuarios.map((usuario) => (
                                            <div
                                                key={usuario.id}
                                                className={`p-2.5 cursor-pointer transition-colors border-b last:border-b-0 ${selectedUsuario?.id === usuario.id
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
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm truncate">{usuario.nombre}</p>
                                                        <p className="text-xs text-gray-500">{usuario.telefono}</p>
                                                    </div>
                                                    {selectedUsuario?.id === usuario.id && (
                                                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Usuario seleccionado */}
                                {selectedUsuario && (
                                    <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-green-900 text-sm truncate">{selectedUsuario.nombre}</p>
                                                    <p className="text-xs text-green-700">{selectedUsuario.telefono}</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-green-700 hover:text-red-600 hover:bg-red-50 shrink-0"
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
                        ) : modo === 'masivo' ? (
                            /* Selección masiva de usuarios */
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-700 text-sm">Seleccionar usuarios</Label>
                                    {selectedUsuarioIds.size > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {selectedUsuarioIds.size} seleccionados
                                        </Badge>
                                    )}
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por nombre o teléfono..."
                                        value={masivoBusqueda}
                                        onChange={(e) => setMasivoBusqueda(e.target.value)}
                                        className="pl-9 bg-white border-gray-300 text-sm h-9"
                                    />
                                </div>

                                {/* Acciones rápidas */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={seleccionarTodos}
                                        className="text-xs h-7"
                                    >
                                        Seleccionar todos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={deseleccionarTodos}
                                        className="text-xs h-7"
                                        disabled={selectedUsuarioIds.size === 0}
                                    >
                                        Limpiar
                                    </Button>
                                </div>

                                {loadingUsuarios ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                        <span className="ml-2 text-sm text-gray-500">Cargando usuarios...</span>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-56 border border-gray-200 rounded-lg">
                                        <div className="divide-y divide-gray-100">
                                            {usuariosFiltrados.map((usuario) => {
                                                const isSelected = selectedUsuarioIds.has(usuario.id);
                                                return (
                                                    <label
                                                        key={usuario.id}
                                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleUsuarioMasivo(usuario.id)}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {usuario.nombre}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{usuario.telefono}</p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                            {usuariosFiltrados.length === 0 && (
                                                <div className="py-6 text-center text-sm text-gray-400">
                                                    No se encontraron usuarios
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        ) : (
                            /* Ingreso manual */
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-gray-700 text-sm">Nombre</Label>
                                    <Input
                                        placeholder="Nombre del asistente"
                                        value={nombreManual}
                                        onChange={(e) => setNombreManual(e.target.value)}
                                        className="bg-white border-gray-300 text-sm h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-gray-700 text-sm">Teléfono (opcional)</Label>
                                    <Input
                                        placeholder="51987654321"
                                        value={telefonoManual}
                                        onChange={(e) => setTelefonoManual(e.target.value)}
                                        className="bg-white border-gray-300 text-sm h-9"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Formulario dinámico */}
                        {selectedQR.tipoAsistencia && !selectedQR.tipoAsistencia.soloPresencia && (
                            <div className="pt-3 border-t border-gray-200">
                                <DynamicForm
                                    campos={selectedQR.tipoAsistencia.campos || []}
                                    onSubmit={handleSubmit}
                                    isSubmitting={submitting}
                                    submitLabel={modo === 'masivo' ? `Registrar ${selectedUsuarioIds.size} asistencias` : 'Registrar'}
                                />
                            </div>
                        )}

                        {/* Si es solo presencia, mostrar botón directo */}
                        {selectedQR.tipoAsistencia?.soloPresencia && (
                            <Button
                                onClick={() => handleSubmit({})}
                                disabled={
                                    submitting ||
                                    (modo === 'usuario' && !selectedUsuario) ||
                                    (modo === 'manual' && !telefonoManual && !nombreManual) ||
                                    (modo === 'masivo' && selectedUsuarioIds.size === 0)
                                }
                                className="w-full bg-green-600 hover:bg-green-700 h-9 text-sm"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                        Registrando...
                                    </>
                                ) : modo === 'masivo' ? (
                                    <>
                                        <Users className="w-4 h-4 mr-1.5" />
                                        Registrar {selectedUsuarioIds.size} asistencias
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
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
