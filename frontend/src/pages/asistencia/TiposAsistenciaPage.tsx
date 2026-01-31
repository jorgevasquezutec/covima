import { useState, useEffect } from 'react';
import { tiposAsistenciaApi } from '@/services/api';
import type { TipoAsistencia, FormularioCampo } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Plus,
    Pencil,
    Trash2,
    ClipboardList,
    GripVertical,
    BookOpen,
    Users,
    Home,
    Church,
    Heart,
    Star,
} from 'lucide-react';

const ICONOS_DISPONIBLES = [
    { value: 'BookOpen', label: 'Libro', icon: BookOpen },
    { value: 'Users', label: 'Usuarios', icon: Users },
    { value: 'Home', label: 'Casa', icon: Home },
    { value: 'Church', label: 'Iglesia', icon: Church },
    { value: 'Heart', label: 'Corazón', icon: Heart },
    { value: 'Star', label: 'Estrella', icon: Star },
    { value: 'ClipboardList', label: 'Lista', icon: ClipboardList },
];

const COLORES_DISPONIBLES = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Violeta' },
    { value: '#EC4899', label: 'Rosa' },
    { value: '#6B7280', label: 'Gris' },
];

const TIPOS_CAMPO = [
    { value: 'number', label: 'Número' },
    { value: 'checkbox', label: 'Sí/No' },
    { value: 'text', label: 'Texto' },
];

interface NuevoTipoForm {
    nombre: string;
    label: string;
    descripcion: string;
    icono: string;
    color: string;
    soloPresencia: boolean;
}

interface NuevoCampoForm {
    nombre: string;
    label: string;
    tipo: 'number' | 'checkbox' | 'text' | 'select' | 'rating';
    requerido: boolean;
    placeholder: string;
    valorMinimo: number | undefined;
    valorMaximo: number | undefined;
}

const getIconComponent = (iconName: string | undefined) => {
    const iconConfig = ICONOS_DISPONIBLES.find(i => i.value === iconName);
    if (iconConfig) {
        const IconComp = iconConfig.icon;
        return <IconComp className="w-5 h-5" />;
    }
    return <ClipboardList className="w-5 h-5" />;
};

export default function TiposAsistenciaPage() {
    const [tipos, setTipos] = useState<TipoAsistencia[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog para crear/editar tipo
    const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
    const [editingTipo, setEditingTipo] = useState<TipoAsistencia | null>(null);
    const [tipoForm, setTipoForm] = useState<NuevoTipoForm>({
        nombre: '',
        label: '',
        descripcion: '',
        icono: 'ClipboardList',
        color: '#3B82F6',
        soloPresencia: false,
    });
    const [savingTipo, setSavingTipo] = useState(false);

    // Dialog para ver/editar campos
    const [camposDialogOpen, setCamposDialogOpen] = useState(false);
    const [selectedTipo, setSelectedTipo] = useState<TipoAsistencia | null>(null);

    // Dialog para agregar campo
    const [campoDialogOpen, setCampoDialogOpen] = useState(false);
    const [editingCampo, setEditingCampo] = useState<FormularioCampo | null>(null);
    const [campoForm, setCampoForm] = useState<NuevoCampoForm>({
        nombre: '',
        label: '',
        tipo: 'text',
        requerido: false,
        placeholder: '',
        valorMinimo: undefined,
        valorMaximo: undefined,
    });
    const [savingCampo, setSavingCampo] = useState(false);

    // Dialog de confirmación de eliminación
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tipoToDelete, setTipoToDelete] = useState<TipoAsistencia | null>(null);

    useEffect(() => {
        loadTipos();
    }, []);

    const loadTipos = async () => {
        try {
            setLoading(true);
            const data = await tiposAsistenciaApi.getAll();
            setTipos(data);
        } catch {
            toast.error('Error al cargar tipos de asistencia');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateTipo = () => {
        setEditingTipo(null);
        setTipoForm({
            nombre: '',
            label: '',
            descripcion: '',
            icono: 'ClipboardList',
            color: '#3B82F6',
            soloPresencia: false,
        });
        setTipoDialogOpen(true);
    };

    const handleOpenEditTipo = (tipo: TipoAsistencia) => {
        setEditingTipo(tipo);
        setTipoForm({
            nombre: tipo.nombre,
            label: tipo.label,
            descripcion: tipo.descripcion || '',
            icono: tipo.icono || 'ClipboardList',
            color: tipo.color || '#3B82F6',
            soloPresencia: tipo.soloPresencia,
        });
        setTipoDialogOpen(true);
    };

    const handleSaveTipo = async () => {
        if (!tipoForm.nombre || !tipoForm.label) {
            toast.error('Nombre y etiqueta son requeridos');
            return;
        }

        try {
            setSavingTipo(true);
            if (editingTipo) {
                await tiposAsistenciaApi.update(editingTipo.id, {
                    label: tipoForm.label,
                    descripcion: tipoForm.descripcion || undefined,
                    icono: tipoForm.icono,
                    color: tipoForm.color,
                    soloPresencia: tipoForm.soloPresencia,
                });
                toast.success('Tipo actualizado');
            } else {
                await tiposAsistenciaApi.create({
                    nombre: tipoForm.nombre,
                    label: tipoForm.label,
                    descripcion: tipoForm.descripcion || undefined,
                    icono: tipoForm.icono,
                    color: tipoForm.color,
                    soloPresencia: tipoForm.soloPresencia,
                });
                toast.success('Tipo creado');
            }
            setTipoDialogOpen(false);
            loadTipos();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error al guardar');
        } finally {
            setSavingTipo(false);
        }
    };

    const handleDeleteTipo = async () => {
        if (!tipoToDelete) return;

        try {
            await tiposAsistenciaApi.delete(tipoToDelete.id);
            toast.success('Tipo eliminado');
            setDeleteDialogOpen(false);
            setTipoToDelete(null);
            loadTipos();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleOpenCampos = (tipo: TipoAsistencia) => {
        setSelectedTipo(tipo);
        setCamposDialogOpen(true);
    };

    const handleOpenCreateCampo = () => {
        setEditingCampo(null);
        setCampoForm({
            nombre: '',
            label: '',
            tipo: 'text',
            requerido: false,
            placeholder: '',
            valorMinimo: undefined,
            valorMaximo: undefined,
        });
        setCampoDialogOpen(true);
    };

    const handleOpenEditCampo = (campo: FormularioCampo) => {
        setEditingCampo(campo);
        setCampoForm({
            nombre: campo.nombre,
            label: campo.label,
            tipo: campo.tipo,
            requerido: campo.requerido,
            placeholder: campo.placeholder || '',
            valorMinimo: campo.valorMinimo,
            valorMaximo: campo.valorMaximo,
        });
        setCampoDialogOpen(true);
    };

    const handleSaveCampo = async () => {
        if (!selectedTipo || !campoForm.nombre || !campoForm.label) {
            toast.error('Nombre y etiqueta son requeridos');
            return;
        }

        try {
            setSavingCampo(true);
            if (editingCampo) {
                await tiposAsistenciaApi.updateCampo(editingCampo.id, {
                    nombre: campoForm.nombre,
                    label: campoForm.label,
                    tipo: campoForm.tipo,
                    requerido: campoForm.requerido,
                    placeholder: campoForm.placeholder || undefined,
                    valorMinimo: campoForm.valorMinimo,
                    valorMaximo: campoForm.valorMaximo,
                });
                toast.success('Campo actualizado');
            } else {
                await tiposAsistenciaApi.addCampo(selectedTipo.id, {
                    nombre: campoForm.nombre,
                    label: campoForm.label,
                    tipo: campoForm.tipo,
                    requerido: campoForm.requerido,
                    orden: selectedTipo.campos.length + 1,
                    placeholder: campoForm.placeholder || undefined,
                    valorMinimo: campoForm.valorMinimo,
                    valorMaximo: campoForm.valorMaximo,
                });
                toast.success('Campo agregado');
            }
            setCampoDialogOpen(false);
            // Recargar el tipo para actualizar los campos
            const updatedTipo = await tiposAsistenciaApi.getOne(selectedTipo.id);
            setSelectedTipo(updatedTipo);
            loadTipos();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Error al guardar campo');
        } finally {
            setSavingCampo(false);
        }
    };

    const handleDeleteCampo = async (campo: FormularioCampo) => {
        if (!selectedTipo) return;

        try {
            await tiposAsistenciaApi.deleteCampo(campo.id);
            toast.success('Campo eliminado');
            const updatedTipo = await tiposAsistenciaApi.getOne(selectedTipo.id);
            setSelectedTipo(updatedTipo);
            loadTipos();
        } catch {
            toast.error('Error al eliminar campo');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-blue-600" />
                        Tipos de Asistencia
                    </h1>
                    <p className="text-gray-500">Configura los tipos de asistencia y sus formularios</p>
                </div>
                <Button
                    onClick={handleOpenCreateTipo}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Tipo
                </Button>
            </div>

            {/* Table */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-50">
                                    <TableHead className="text-gray-600">Tipo</TableHead>
                                    <TableHead className="text-gray-600">Descripción</TableHead>
                                    <TableHead className="text-gray-600">Campos</TableHead>
                                    <TableHead className="text-gray-600">Solo Presencia</TableHead>
                                    <TableHead className="text-gray-600">Estado</TableHead>
                                    <TableHead className="text-gray-600 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            Cargando...
                                        </TableCell>
                                    </TableRow>
                                ) : tipos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No hay tipos de asistencia configurados
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tipos.map((tipo) => (
                                        <TableRow key={tipo.id} className="border-gray-200 hover:bg-gray-50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                                        style={{ backgroundColor: tipo.color || '#3B82F6' }}
                                                    >
                                                        {getIconComponent(tipo.icono)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{tipo.label}</p>
                                                        <p className="text-sm text-gray-500">{tipo.nombre}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-gray-700 max-w-xs truncate">
                                                {tipo.descripcion || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenCampos(tipo)}
                                                    className="border-gray-300"
                                                    disabled={tipo.soloPresencia}
                                                >
                                                    {tipo.soloPresencia ? (
                                                        'N/A'
                                                    ) : (
                                                        <>
                                                            <GripVertical className="w-4 h-4 mr-1" />
                                                            {tipo.campos?.length || 0} campos
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={tipo.soloPresencia ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
                                                >
                                                    {tipo.soloPresencia ? 'Sí' : 'No'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={tipo.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}
                                                >
                                                    {tipo.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEditTipo(tipo)}
                                                        className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setTipoToDelete(tipo);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog: Crear/Editar Tipo */}
            <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">
                            {editingTipo ? 'Editar Tipo' : 'Nuevo Tipo de Asistencia'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            {editingTipo ? 'Modifica los datos del tipo de asistencia' : 'Configura un nuevo tipo de asistencia'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Nombre (único)</Label>
                                <Input
                                    value={tipoForm.nombre}
                                    onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                    placeholder="escuela_sabatica"
                                    className="bg-white border-gray-300 text-gray-900"
                                    disabled={!!editingTipo}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Etiqueta</Label>
                                <Input
                                    value={tipoForm.label}
                                    onChange={(e) => setTipoForm({ ...tipoForm, label: e.target.value })}
                                    placeholder="Escuela Sabática"
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Descripción</Label>
                            <Input
                                value={tipoForm.descripcion}
                                onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
                                placeholder="Registro de asistencia a..."
                                className="bg-white border-gray-300 text-gray-900"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">Icono</Label>
                                <Select
                                    value={tipoForm.icono}
                                    onValueChange={(v) => setTipoForm({ ...tipoForm, icono: v })}
                                >
                                    <SelectTrigger className="bg-white border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        {ICONOS_DISPONIBLES.map((icono) => {
                                            const IconComp = icono.icon;
                                            return (
                                                <SelectItem key={icono.value} value={icono.value}>
                                                    <div className="flex items-center gap-2">
                                                        <IconComp className="w-4 h-4" />
                                                        {icono.label}
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">Color</Label>
                                <Select
                                    value={tipoForm.color}
                                    onValueChange={(v) => setTipoForm({ ...tipoForm, color: v })}
                                >
                                    <SelectTrigger className="bg-white border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        {COLORES_DISPONIBLES.map((color) => (
                                            <SelectItem key={color.value} value={color.value}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: color.value }}
                                                    />
                                                    {color.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="soloPresencia"
                                checked={tipoForm.soloPresencia}
                                onCheckedChange={(checked) => setTipoForm({ ...tipoForm, soloPresencia: !!checked })}
                            />
                            <Label htmlFor="soloPresencia" className="text-gray-700 cursor-pointer">
                                Solo registro de presencia (sin formulario adicional)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTipoDialogOpen(false)} className="border-gray-300" disabled={savingTipo}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveTipo} className="bg-blue-600 hover:bg-blue-700" disabled={savingTipo}>
                            {savingTipo ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Campos del Tipo */}
            <Dialog open={camposDialogOpen} onOpenChange={setCamposDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900 flex items-center gap-2">
                            {selectedTipo && (
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: selectedTipo.color || '#3B82F6' }}
                                >
                                    {getIconComponent(selectedTipo.icono)}
                                </div>
                            )}
                            Campos de {selectedTipo?.label}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Configura los campos del formulario para este tipo de asistencia
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
                        {selectedTipo?.campos && selectedTipo.campos.length > 0 ? (
                            selectedTipo.campos.map((campo) => (
                                <div
                                    key={campo.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">{campo.label}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="border-gray-300 text-xs">
                                                {TIPOS_CAMPO.find(t => t.value === campo.tipo)?.label || campo.tipo}
                                            </Badge>
                                            {campo.requerido && (
                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                                                    Requerido
                                                </Badge>
                                            )}
                                            <span className="text-xs text-gray-400">{campo.nombre}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditCampo(campo)}
                                            className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteCampo(campo)}
                                            className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                No hay campos configurados para este tipo
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCamposDialogOpen(false)} className="border-gray-300">
                            Cerrar
                        </Button>
                        <Button onClick={handleOpenCreateCampo} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Campo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Crear/Editar Campo */}
            <Dialog open={campoDialogOpen} onOpenChange={setCampoDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">
                            {editingCampo ? 'Editar Campo' : 'Nuevo Campo'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Configura el campo del formulario
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700">Nombre (único)</Label>
                            <Input
                                value={campoForm.nombre}
                                onChange={(e) => setCampoForm({ ...campoForm, nombre: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                placeholder="dias_estudio"
                                className="bg-white border-gray-300 text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Etiqueta</Label>
                            <Input
                                value={campoForm.label}
                                onChange={(e) => setCampoForm({ ...campoForm, label: e.target.value })}
                                placeholder="Días de estudio"
                                className="bg-white border-gray-300 text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-gray-700">Tipo de campo</Label>
                            <Select
                                value={campoForm.tipo}
                                onValueChange={(v) => setCampoForm({ ...campoForm, tipo: v as NuevoCampoForm['tipo'] })}
                            >
                                <SelectTrigger className="bg-white border-gray-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    {TIPOS_CAMPO.map((tipo) => (
                                        <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {campoForm.tipo === 'number' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-700">Valor mínimo</Label>
                                    <Input
                                        type="number"
                                        value={campoForm.valorMinimo ?? ''}
                                        onChange={(e) => setCampoForm({ ...campoForm, valorMinimo: e.target.value ? parseInt(e.target.value) : undefined })}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="0"
                                        className="bg-white border-gray-300 text-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-700">Valor máximo</Label>
                                    <Input
                                        type="number"
                                        value={campoForm.valorMaximo ?? ''}
                                        onChange={(e) => setCampoForm({ ...campoForm, valorMaximo: e.target.value ? parseInt(e.target.value) : undefined })}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="7"
                                        className="bg-white border-gray-300 text-gray-900"
                                    />
                                </div>
                            </div>
                        )}

                        {(campoForm.tipo === 'text' || campoForm.tipo === 'number') && (
                            <div className="space-y-2">
                                <Label className="text-gray-700">Placeholder</Label>
                                <Input
                                    value={campoForm.placeholder}
                                    onChange={(e) => setCampoForm({ ...campoForm, placeholder: e.target.value })}
                                    placeholder="Texto de ayuda..."
                                    className="bg-white border-gray-300 text-gray-900"
                                />
                            </div>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="requerido"
                                checked={campoForm.requerido}
                                onCheckedChange={(checked) => setCampoForm({ ...campoForm, requerido: !!checked })}
                            />
                            <Label htmlFor="requerido" className="text-gray-700 cursor-pointer">
                                Campo requerido
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCampoDialogOpen(false)} className="border-gray-300" disabled={savingCampo}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCampo} className="bg-blue-600 hover:bg-blue-700" disabled={savingCampo}>
                            {savingCampo ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: Confirmar Eliminación */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">Eliminar Tipo</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            ¿Estás seguro de eliminar "{tipoToDelete?.label}"? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-gray-300">
                            Cancelar
                        </Button>
                        <Button onClick={handleDeleteTipo} variant="destructive">
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
