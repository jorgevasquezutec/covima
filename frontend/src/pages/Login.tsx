import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput, {
  parsePhoneNumber,
  type Country,
} from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Users, Calendar, Award, MessageSquare } from 'lucide-react';

const loginSchema = z.object({
  phoneNumber: z.string().min(8, 'Número de teléfono inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState<Country>('PE');

  const redirectTo = searchParams.get('redirect') || '/';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const parsed = parsePhoneNumber(data.phoneNumber);
      if (!parsed) {
        toast.error('Número de teléfono inválido');
        return;
      }

      const codigoPais = parsed.countryCallingCode;
      const telefono = parsed.nationalNumber;

      await login({ codigoPais, telefono, password: data.password });
      toast.success('Bienvenido');
      navigate(redirectTo);
    } catch {
      toast.error('Credenciales inválidas');
    }
  };

  const features = [
    { icon: Calendar, text: 'Programas semanales' },
    { icon: Users, text: 'Control de asistencia' },
    { icon: Award, text: 'Gamificación y ranking' },
    { icon: MessageSquare, text: 'Bot de WhatsApp' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Branding (oculto en mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-blue-600 to-indigo-600 overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                <span className="text-2xl font-bold">JA</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Covima</h1>
                <p className="text-indigo-200 text-sm">Jóvenes Adventistas</p>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Gestiona tu grupo<br />
            <span className="text-indigo-200">de manera simple</span>
          </h2>

          <p className="text-lg text-indigo-100 mb-10 max-w-md">
            Organiza programas, registra asistencia y motiva a tu comunidad con gamificación.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10"
              >
                <feature.icon className="w-5 h-5 text-indigo-200" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header mobile */}
        <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">JA</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Covima</h1>
              <p className="text-indigo-200 text-sm">Jóvenes Adventistas</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm">
            {/* Título */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
              <p className="text-gray-500 mt-1">Ingresa con tu número de teléfono</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 text-sm font-medium">
                  Teléfono
                </Label>
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
                      className="phone-input-modern"
                      numberInputProps={{
                        className:
                          'flex-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-r-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border transition-shadow',
                      }}
                    />
                  )}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 pr-12 h-12 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      />
                    )}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Ingresando...
                  </span>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-gray-400 text-sm mt-8">
              Sistema de gestión para programas JA
            </p>
          </div>
        </div>

        {/* Features mobile */}
        <div className="lg:hidden border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex justify-around">
            {features.slice(0, 4).map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <feature.icon className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-gray-500">{feature.text.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
