import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { usuariosApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Calendar, MapPin, FileText, Save, Camera, Loader2 } from 'lucide-react';
import RegistrarMiAsistencia from '@/components/asistencia/RegistrarMiAsistencia';

interface ProfileData {
    id: number;
    nombre: string;
    email: string | null;
    codigoPais: string;
    telefono: string;
    fotoUrl: string | null;
    fechaNacimiento: string | null;
    direccion: string | null;
    biografia: string | null;
    roles: string[];
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [direccion, setDireccion] = useState('');
    const [biografia, setBiografia] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await usuariosApi.getMyProfile();
            setProfile(data);
            setNombre(data.nombre || '');
            setEmail(data.email || '');
            setFechaNacimiento(data.fechaNacimiento ? data.fechaNacimiento.split('T')[0] : '');
            setDireccion(data.direccion || '');
            setBiografia(data.biografia || '');
        } catch {
            toast.error('Error al cargar el perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await usuariosApi.updateMyProfile({
                nombre,
                email: email || undefined,
                fechaNacimiento: fechaNacimiento || undefined,
                direccion: direccion || undefined,
                biografia: biografia || undefined,
            });
            toast.success('Perfil actualizado correctamente');
            loadProfile();
        } catch {
            toast.error('Error al guardar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
            toast.error('Solo se permiten imágenes (jpg, png, gif, webp)');
            return;
        }

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar 5MB');
            return;
        }

        try {
            setUploadingPhoto(true);
            await usuariosApi.uploadProfilePhoto(file);
            toast.success('Foto de perfil actualizada');
            loadProfile();
        } catch {
            toast.error('Error al subir la foto');
        } finally {
            setUploadingPhoto(false);
            // Limpiar el input para permitir subir la misma imagen de nuevo
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Construir URL completa de la foto
    // const getPhotoUrl = (url: string | null | undefined) => {
    //     if (!url) return null;
    //     if (url.startsWith('http')) return url;
    //     // URL relativa, agregar base URL del backend
    //     const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    //     return `${baseUrl}${url}`;
    // };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const photoUrl = profile?.fotoUrl;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-7 h-7 text-blue-600" />
                    Mi Perfil
                </h1>
                <p className="text-gray-500">Gestiona tu información personal</p>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
            />

            {/* Avatar Card */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <button
                                onClick={handlePhotoClick}
                                disabled={uploadingPhoto}
                                className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                            >
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={profile?.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {getInitials(profile?.nombre || 'U')}
                                    </div>
                                )}
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {uploadingPhoto ? (
                                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-white" />
                                    )}
                                </div>
                            </button>
                            <p className="text-xs text-gray-400 text-center mt-1">Click para cambiar</p>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{profile?.nombre}</h2>
                            <p className="text-gray-500">+{profile?.codigoPais} {profile?.telefono}</p>
                            <div className="flex gap-2 mt-2">
                                {profile?.roles.map((rol) => (
                                    <Badge
                                        key={rol}
                                        className="bg-blue-100 text-blue-700 border-blue-200"
                                    >
                                        {rol}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Registrar Mi Asistencia */}
            <RegistrarMiAsistencia />

            {/* Profile Form */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-gray-900">Información Personal</CardTitle>
                    <CardDescription className="text-gray-500">
                        Actualiza tus datos personales
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <Label htmlFor="nombre" className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4" />
                            Nombre completo
                        </Label>
                        <Input
                            id="nombre"
                            value={nombre}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                            placeholder="Tu nombre"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4" />
                            Correo electrónico
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                            placeholder="tu@email.com"
                        />
                    </div>

                    {/* Fecha de nacimiento */}
                    <div className="space-y-2">
                        <Label htmlFor="fechaNacimiento" className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-4 h-4" />
                            Fecha de nacimiento
                        </Label>
                        <Input
                            id="fechaNacimiento"
                            type="date"
                            value={fechaNacimiento}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFechaNacimiento(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                        />
                    </div>

                    {/* Dirección */}
                    <div className="space-y-2">
                        <Label htmlFor="direccion" className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4" />
                            Dirección
                        </Label>
                        <Input
                            id="direccion"
                            value={direccion}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setDireccion(e.target.value)}
                            className="bg-white border-gray-300 text-gray-900"
                            placeholder="Tu dirección"
                        />
                    </div>

                    {/* Biografía */}
                    <div className="space-y-2">
                        <Label htmlFor="biografia" className="flex items-center gap-2 text-gray-700">
                            <FileText className="w-4 h-4" />
                            Biografía
                        </Label>
                        <textarea
                            id="biografia"
                            value={biografia}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBiografia(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Cuéntanos sobre ti..."
                        />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
