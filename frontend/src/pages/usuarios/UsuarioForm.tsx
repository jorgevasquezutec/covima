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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MapPin, FileText, Camera, Loader2, Bell, MessageSquare } from 'lucide-react';
import { DatePickerString } from '@/components/ui/date-picker';

// Helper to transform empty string to undefined for optional enums
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().or(z.literal('').transform(() => undefined));

const createSchema = z.object({
  phoneNumber: z.string().min(8, 'Número de teléfono inválido'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nombreWhatsapp: z.string().optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
  esJA: z.boolean(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  tipoDocumento: optionalEnum(['DNI', 'CE', 'PASAPORTE'] as const),
  numeroDocumento: z.string().optional(),
  tallaPolo: optionalEnum(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const),
  esBautizado: z.boolean().optional(),
  biografia: z.string().optional(),
  notificarNuevasConversaciones: z.boolean(),
  modoHandoffDefault: z.enum(['WEB', 'WHATSAPP', 'AMBOS']),
});

const updateSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  nombreWhatsapp: z.string().optional(),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
  esJA: z.boolean(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  tipoDocumento: optionalEnum(['DNI', 'CE', 'PASAPORTE'] as const),
  numeroDocumento: z.string().optional(),
  tallaPolo: optionalEnum(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const),
  esBautizado: z.boolean().optional(),
  biografia: z.string().optional(),
  notificarNuevasConversaciones: z.boolean(),
  modoHandoffDefault: z.enum(['WEB', 'WHATSAPP', 'AMBOS']),
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
  } = useForm({
    resolver: zodResolver(isEditing ? updateSchema : createSchema) as any,
    defaultValues: isEditing
      ? {
        nombre: usuario.nombre,
        email: usuario.email || '',
        nombreWhatsapp: usuario.nombreWhatsapp || '',
        roles: usuario.roles,
        esJA: usuario.esJA ?? true,
        fechaNacimiento: usuario.fechaNacimiento ? usuario.fechaNacimiento.split('T')[0] : '',
        direccion: usuario.direccion || '',
        tipoDocumento: (usuario.tipoDocumento ?? undefined) as 'DNI' | 'CE' | 'PASAPORTE' | undefined,
        numeroDocumento: usuario.numeroDocumento || '',
        tallaPolo: (usuario.tallaPolo ?? undefined) as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | undefined,
        esBautizado: usuario.esBautizado ?? undefined,
        biografia: usuario.biografia || '',
        notificarNuevasConversaciones: usuario.notificarNuevasConversaciones ?? false,
        modoHandoffDefault: usuario.modoHandoffDefault ?? 'WEB',
      }
      : {
        phoneNumber: '',
        nombre: '',
        email: '',
        nombreWhatsapp: '',
        password: '',
        roles: ['participante'],
        esJA: true,
        fechaNacimiento: '',
        direccion: '',
        tipoDocumento: undefined,
        numeroDocumento: '',
        tallaPolo: undefined,
        esBautizado: undefined,
        biografia: '',
        notificarNuevasConversaciones: false,
        modoHandoffDefault: 'WEB' as const,
      },
  });

  const selectedRoles = watch('roles') as string[];

  const handleRoleToggle = (roleName: string, checked: boolean) => {
    const currentRoles = watch('roles') as string[] || [];
    let newRoles: string[];

    if (checked) {
      // Agregar rol si no existe
      newRoles = currentRoles.includes(roleName)
        ? currentRoles
        : [...currentRoles, roleName];
    } else {
      // Quitar rol
      newRoles = currentRoles.filter((r) => r !== roleName);
    }

    setValue('roles', newRoles, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      if (isEditing) {
        const updateData = data as UpdateFormData;
        await usuariosApi.update(usuario.id, {
          nombre: updateData.nombre,
          email: updateData.email || undefined,
          nombreWhatsapp: updateData.nombreWhatsapp || undefined,
          roles: updateData.roles,
          esJA: updateData.esJA,
          fechaNacimiento: updateData.fechaNacimiento || undefined,
          direccion: updateData.direccion || undefined,
          tipoDocumento: updateData.tipoDocumento || undefined,
          numeroDocumento: updateData.numeroDocumento || undefined,
          tallaPolo: updateData.tallaPolo || undefined,
          esBautizado: updateData.esBautizado,
          biografia: updateData.biografia || undefined,
          notificarNuevasConversaciones: updateData.notificarNuevasConversaciones,
          modoHandoffDefault: updateData.modoHandoffDefault,
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
          esJA: createData.esJA,
          fechaNacimiento: createData.fechaNacimiento || undefined,
          direccion: createData.direccion || undefined,
          tipoDocumento: createData.tipoDocumento || undefined,
          numeroDocumento: createData.numeroDocumento || undefined,
          tallaPolo: createData.tallaPolo || undefined,
          esBautizado: createData.esBautizado,
          biografia: createData.biografia || undefined,
          notificarNuevasConversaciones: createData.notificarNuevasConversaciones,
          modoHandoffDefault: createData.modoHandoffDefault,
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
    <form onSubmit={handleSubmit(onSubmit, () => toast.error('Revisa los campos marcados en rojo'))} className="space-y-4">
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
                  handleRoleToggle(rol.nombre, checked as boolean)
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

      <div className="space-y-2">
        <Label className="text-gray-700">Membresía</Label>
        <Controller
          name="esJA"
          control={control}
          render={({ field }) => (
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <span className="text-sm text-gray-700">
                Es miembro JA
              </span>
            </label>
          )}
        />
        <p className="text-xs text-gray-500">
          Los miembros JA aparecen automáticamente en el ranking general
        </p>
      </div>

      {/* Campos adicionales del perfil (opcional) */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-sm font-medium text-gray-500 mb-4">Información del perfil (opcional)</p>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-700">Fecha de nacimiento</Label>
        <Controller
          name="fechaNacimiento"
          control={control}
          render={({ field }) => (
            <DatePickerString
              value={field.value || ''}
              onChange={field.onChange}
              placeholder="Seleccionar fecha"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700">Tipo de documento</Label>
          <Controller
            name="tipoDocumento"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700">Número de documento</Label>
          <Controller
            name="numeroDocumento"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Número"
                className="bg-white border-gray-300 text-gray-900"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-700">Talla de polo</Label>
          <Controller
            name="tallaPolo"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                  <SelectItem value="XXL">XXL</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-700">Bautizado</Label>
          <Controller
            name="esBautizado"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value === undefined ? '' : field.value ? 'si' : 'no'}
                onValueChange={(v) => field.onChange(v === '' ? undefined : v === 'si')}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
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

      {/* Preferencias de Notificación - Solo para admin/lider */}
      {selectedRoles?.some((rol) => ['admin', 'lider'].includes(rol)) && (
        <>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Preferencias de notificación del Inbox
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificar nuevas conversaciones
                </Label>
                <p className="text-xs text-gray-500">
                  Recibe alerta cuando llegue una nueva conversación al inbox
                </p>
              </div>
              <Controller
                name="notificarNuevasConversaciones"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Modo de respuesta por defecto
            </Label>
            <Controller
              name="modoHandoffDefault"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Seleccionar modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEB">🖥️ Solo Web</SelectItem>
                    <SelectItem value="WHATSAPP">📱 Solo WhatsApp</SelectItem>
                    <SelectItem value="AMBOS">🔄 Ambos</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-gray-500">
              {watch('modoHandoffDefault') === 'WEB' && 'Responderá solo desde el panel web.'}
              {watch('modoHandoffDefault') === 'WHATSAPP' && 'Responderá con >> desde WhatsApp.'}
              {watch('modoHandoffDefault') === 'AMBOS' && 'Puede responder desde el panel web o WhatsApp.'}
            </p>
          </div>
        </>
      )}

      {/* Resumen de errores de validación */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-red-700 mb-1">Corrige los siguientes campos:</p>
          <ul className="text-xs text-red-600 space-y-0.5">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                &bull; <span className="capitalize">{field === 'phoneNumber' ? 'Teléfono' : field === 'nombre' ? 'Nombre' : field === 'roles' ? 'Roles' : field === 'esJA' ? 'Membresía JA' : field === 'email' ? 'Email' : field === 'notificarNuevasConversaciones' ? 'Notificaciones' : field === 'modoHandoffDefault' ? 'Modo de respuesta' : field}</span>: {(error as any)?.message || 'Campo requerido'}
              </li>
            ))}
          </ul>
        </div>
      )}

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
