import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, UserPlus, ChevronDown, ChevronUp, X, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DynamicForm } from '@/components/asistencia/DynamicForm';
import { usuariosApi, asistenciaApi } from '@/services/api';
import type { Usuario, QRAsistencia } from '@/types';

interface QuickRegisterForm {
  nombre: string;
  telefono: string;
  fechaNacimiento?: string;
}

interface PuertaQuickRegisterProps {
  qr: QRAsistencia | null;
  isOutOfTime?: boolean;
  onSuccess: (nombre: string, tipo: 'nuevo_miembro' | 'asistencia') => void;
  onNewUser: (user: Usuario) => void;
  onCancel: () => void;
}

export function PuertaQuickRegister({ qr, isOutOfTime = false, onSuccess, onNewUser, onCancel }: PuertaQuickRegisterProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [esBautizado, setEsBautizado] = useState(false);
  const [esJA, setEsJA] = useState(false);
  const [genero, setGenero] = useState<string | null>(null);

  // Step 2: after creating user, show dynamic form before registering attendance
  const [createdUser, setCreatedUser] = useState<Usuario | null>(null);

  const soloPresencia = qr?.tipoAsistencia?.soloPresencia ?? true;
  const campos = qr?.tipoAsistencia?.campos ?? [];
  const needsForm = !soloPresencia && campos.length > 0;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuickRegisterForm>();

  const resetAll = () => {
    reset();
    setEsBautizado(false);
    setEsJA(false);
    setGenero(null);
    setShowOptional(false);
    setCreatedUser(null);
  };

  // Step 1: Create user (and optionally register attendance if no form needed)
  const createMutation = useMutation({
    mutationFn: async (data: QuickRegisterForm & { registerAndAttend: boolean }) => {
      const user = await usuariosApi.registroRapido({
        codigoPais: '51',
        telefono: data.telefono,
        nombre: data.nombre,
        fechaNacimiento: data.fechaNacimiento || undefined,
        esBautizado,
        esJA,
      });

      // If attending and no dynamic form needed, register immediately
      if (data.registerAndAttend && qr) {
        if (needsForm) {
          // Don't register yet — show dynamic form first
          return { user, attended: false, pendingAttendance: true };
        }
        await asistenciaApi.registrarManual({
          codigoQR: qr.codigo,
          usuarioId: user.id,
        });
        return { user, attended: true, pendingAttendance: false };
      }

      return { user, attended: false, pendingAttendance: false };
    },
    onSuccess: (result) => {
      onNewUser(result.user);

      if (result.pendingAttendance) {
        // Show dynamic form step
        setCreatedUser(result.user);
        return;
      }

      if (result.attended) {
        onSuccess(result.user.nombre, 'asistencia');
      } else {
        onSuccess(result.user.nombre, 'nuevo_miembro');
      }
      resetAll();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al registrar miembro';
      toast.error(typeof msg === 'string' ? msg : msg[0]);
    },
  });

  // Step 2: Register attendance with formulario data
  const attendMutation = useMutation({
    mutationFn: (datosFormulario?: Record<string, unknown>) =>
      asistenciaApi.registrarManual({
        codigoQR: qr!.codigo,
        usuarioId: createdUser!.id,
        datosFormulario,
        ...(isOutOfTime && { fueraDeHorario: true }),
      }),
    onSuccess: () => {
      onSuccess(createdUser!.nombre, 'asistencia');
      resetAll();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al registrar asistencia';
      toast.error(typeof msg === 'string' ? msg : msg[0]);
    },
  });

  const onSubmit = (registerAndAttend: boolean) => {
    handleSubmit((data) => {
      createMutation.mutate({ ...data, registerAndAttend });
    })();
  };

  const attendLabel = isOutOfTime ? 'Registrar y guardar datos' : 'Registrar y marcar asistencia';
  const formSubmitLabel = isOutOfTime ? 'Guardar datos' : 'Registrar Asistencia';

  // Step 2: Dynamic form after user was created
  if (createdUser) {
    return (
      <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-purple-900">Completar asistencia</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Out-of-time banner */}
        {isOutOfTime && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Fuera de horario — se guardarán los datos sin marcar asistencia</span>
          </div>
        )}

        {/* Created user chip */}
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{createdUser.nombre}</p>
            <p className="text-xs text-green-600">Miembro registrado</p>
          </div>
        </div>

        <DynamicForm
          campos={campos}
          onSubmit={(data) => attendMutation.mutate(data)}
          isSubmitting={attendMutation.isPending}
          submitLabel={formSubmitLabel}
          size="lg"
        />
      </div>
    );
  }

  // Step 1: Registration form
  return (
    <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-purple-900">Registrar nuevo miembro</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Out-of-time banner */}
      {isOutOfTime && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Fuera de horario — se guardarán los datos sin marcar asistencia</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label htmlFor="qr-nombre">Nombre *</Label>
          <Input
            id="qr-nombre"
            placeholder="Nombre completo"
            className="h-14 text-lg mt-1"
            autoFocus
            {...register('nombre', { required: 'El nombre es obligatorio', maxLength: 100 })}
          />
          {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre.message}</p>}
        </div>
        <div>
          <Label htmlFor="qr-telefono">Teléfono * <span className="text-gray-400 font-normal">(+51)</span></Label>
          <Input
            id="qr-telefono"
            placeholder="987654321"
            className="h-14 text-lg mt-1"
            inputMode="numeric"
            {...register('telefono', {
              required: 'El teléfono es obligatorio',
              pattern: { value: /^\d{6,20}$/, message: 'Solo números (6-20 dígitos)' },
            })}
            onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^\d]/g, ''); }}
          />
          {errors.telefono && <p className="text-sm text-red-500 mt-1">{errors.telefono.message}</p>}
        </div>

        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
        >
          {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Datos opcionales
        </button>

        {showOptional && (
          <div className="space-y-3 pt-1">
            <div>
              <Label htmlFor="qr-nacimiento">Cumpleaños</Label>
              <Input id="qr-nacimiento" type="date" className="h-12 mt-1" {...register('fechaNacimiento')} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEsJA(!esJA)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  esJA
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Miembro JA
              </button>
              <button
                type="button"
                onClick={() => setEsBautizado(!esBautizado)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  esBautizado
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Bautizado
              </button>
              <button
                type="button"
                onClick={() => setGenero(genero === 'M' ? null : 'M')}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  genero === 'M'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Masculino
              </button>
              <button
                type="button"
                onClick={() => setGenero(genero === 'F' ? null : 'F')}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  genero === 'F'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Femenino
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {qr && (
          <Button
            type="button"
            className={`w-full h-14 text-base ${isOutOfTime ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
            disabled={createMutation.isPending}
            onClick={() => onSubmit(true)}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <UserPlus className="w-5 h-5 mr-2" />
            )}
            {attendLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base"
          disabled={createMutation.isPending}
          onClick={() => onSubmit(false)}
        >
          Solo registrar miembro
        </Button>
      </div>
    </div>
  );
}
