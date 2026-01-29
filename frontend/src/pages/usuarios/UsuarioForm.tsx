import { useState, useRef, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput, { parsePhoneNumber, type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { usuariosApi } from '@/services/api';
import type { Usuario, Rol } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar, MapPin, FileText, Camera, Loader2 } from 'lucide-react';

const createSchema = z.object({
  phoneNumber: z.string().min(8, 'Número de teléfono inválido'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nombreWhatsapp: z.string().optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  biografia: z.string().optional(),
});

const updateSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nombreWhatsapp: z.string().optional(),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  biografia: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;

interface UsuarioFormProps {
  usuario: Usuario | null;
  roles: Rol[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UsuarioForm({
  usuario,
  roles,
  onSuccess,
  onCancel,
}: UsuarioFormProps) {
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<Country>('PE');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(usuario?.fotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!usuario;

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateFormData | UpdateFormData>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: isEditing
      ? {
        nombre: usuario.nombre,
        email: usuario.email || '',
        nombreWhatsapp: usuario.nombreWhatsapp || '',
        roles: usuario.roles,
        fechaNacimiento: usuario.fechaNacimiento ? usuario.fechaNacimiento.split('T')[0] : '',
        direccion: usuario.direccion || '',
        biografia: usuario.biografia || '',
      }
      : {
        phoneNumber: '',
        nombre: '',
        email: '',
        nombreWhatsapp: '',
        password: '',
        roles: ['participante'],
        fechaNacimiento: '',
        direccion: '',
        biografia: '',
      },
  });

  const selectedRoles = watch('roles') as string[];

  const onSubmit = async (data: CreateFormData | UpdateFormData) => {
    setLoading(true);
    try {
      if (isEditing) {
        const updateData = data as UpdateFormData;
        await usuariosApi.update(usuario.id, {
          nombre: updateData.nombre,
          email: updateData.email || undefined,
          nombreWhatsapp: updateData.nombreWhatsapp || undefined,
          roles: updateData.roles,
          fechaNacimiento: updateData.fechaNacimiento || null,
          direccion: updateData.direccion || undefined,
          biografia: updateData.biografia || undefined,
        });
        toast.success('Usuario actualizado');
      } else {
        const createData = data as CreateFormData;
        const parsed = parsePhoneNumber(createData.phoneNumber);
        if (!parsed) {
          toast.error('Número de teléfono inválido');
          return;
        }

        await usuariosApi.create({
          codigoPais: parsed.countryCallingCode,
          telefono: parsed.nationalNumber,
          nombre: createData.nombre,
          email: createData.email || undefined,
          nombreWhatsapp: createData.nombreWhatsapp || undefined,
          password: createData.password || undefined,
          roles: createData.roles,
          fechaNacimiento: createData.fechaNacimiento || undefined,
          direccion: createData.direccion || undefined,
          biografia: createData.biografia || undefined,
        });
        toast.success('Usuario creado');
      }
      onSuccess();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al guardar';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleName: string, checked: boolean) => {
    const current = selectedRoles || [];
    if (checked) {
      setValue('roles', [...current, roleName]);
    } else {
      setValue('roles', current.filter((r) => r !== roleName));
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !usuario) return;

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
      const result = await usuariosApi.uploadUserPhoto(usuario.id, file);
      setCurrentPhotoUrl(result.fotoUrl);
      toast.success('Foto actualizada');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Foto de perfil - solo en edición */}
      {isEditing && (
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="hidden"
          />
          <div className="relative group">
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploadingPhoto}
              className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            >
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={usuario.nombre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                  {getInitials(usuario.nombre)}
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{usuario.nombre}</p>
            <p className="text-xs text-gray-500">Click en la foto para cambiar</p>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="space-y-2">
          <Label className="text-gray-700">Teléfono</Label>
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                international
                countryCallingCodeEditable={false}
                defaultCountry="PE"
                country={country}
                onCountryChange={(c) => c && setCountry(c)}
                className="phone-input-light"
                numberInputProps={{
                  className:
                    'flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 rounded-r-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border',
                }}
              />
            )}
          />
          {'phoneNumber' in errors && errors.phoneNumber && (
            <p className="text-sm text-red-600">
              {errors.phoneNumber.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-gray-700">Nombre</Label>
        <Controller
          name="nombre"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Nombre completo"
              className="bg-white border-gray-300 text-gray-900"
            />
          )}
        />
        {errors.nombre && (
          <p className="text-sm text-red-600">{errors.nombre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700">Email (opcional)</Label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="email"
              placeholder="email@ejemplo.com"
              className="bg-white border-gray-300 text-gray-900"
            />
          )}
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700">Nombre WhatsApp (opcional)</Label>
        <Controller
          name="nombreWhatsapp"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Nombre en WhatsApp"
              className="bg-white border-gray-300 text-gray-900"
            />
          )}
        />
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <Label className="text-gray-700">Contraseña (opcional)</Label>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Dejar vacío para usar 'password'"
                className="bg-white border-gray-300 text-gray-900"
              />
            )}
          />
          <p className="text-xs text-gray-500">
            Si no se especifica, se usará &quot;password&quot; por defecto
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-gray-700">Roles</Label>
        <div className="flex flex-wrap gap-4 pt-2">
          {roles.map((rol) => (
            <label
              key={rol.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedRoles?.includes(rol.nombre)}
                onCheckedChange={(checked) =>
                  handleRoleChange(rol.nombre, checked as boolean)
                }
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-sm text-gray-700 capitalize">
                {rol.nombre}
              </span>
            </label>
          ))}
        </div>
        {errors.roles && (
          <p className="text-sm text-red-600">{errors.roles.message}</p>
        )}
      </div>

      {/* Campos adicionales del perfil (opcional) */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm font-medium text-gray-500 mb-4">Información del perfil (opcional)</p>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Fecha de nacimiento
        </Label>
        <Controller
          name="fechaNacimiento"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              className="bg-white border-gray-300 text-gray-900"
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Dirección
        </Label>
        <Controller
          name="direccion"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Dirección del usuario"
              className="bg-white border-gray-300 text-gray-900"
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Biografía
        </Label>
        <Controller
          name="biografia"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              placeholder="Información adicional sobre el usuario..."
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-md min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
