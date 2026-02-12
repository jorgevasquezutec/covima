import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PhoneInput, {
  parsePhoneNumber,
  type Country,
} from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Phone, Shield, Lock, Check } from 'lucide-react';
import { authApi } from '@/services/api';

// Step 1: Phone number
const phoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Número de teléfono inválido'),
});

// Step 3: New password
const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type PhoneForm = z.infer<typeof phoneSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState<Country>('PE');
  const [codigoPais, setCodigoPais] = useState('');
  const [telefono, setTelefono] = useState('');
  const [resetToken, setResetToken] = useState('');

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown para reenviar
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Step 1 form
  const {
    control: phoneControl,
    handleSubmit: handlePhoneSubmit,
    formState: { errors: phoneErrors },
  } = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '' },
  });

  // Step 3 form
  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Step 1: Request code
  const onRequestCode = async (data: PhoneForm) => {
    try {
      const parsed = parsePhoneNumber(data.phoneNumber);
      if (!parsed) {
        toast.error('Número de teléfono inválido');
        return;
      }

      setIsLoading(true);
      const cp = parsed.countryCallingCode;
      const tel = parsed.nationalNumber;
      setCodigoPais(cp);
      setTelefono(tel);

      await authApi.forgotPassword({ codigoPais: cp, telefono: tel });
      toast.success('Código enviado a tu WhatsApp');
      setCooldown(60);
      setStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al enviar código';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Step 2: Verify code
  const onVerifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }

    try {
      setIsLoading(true);
      const result = await authApi.verifyResetCode({
        codigoPais,
        telefono,
        code,
      });
      setResetToken(result.resetToken);
      setStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Código incorrecto';
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const onResendCode = async () => {
    if (cooldown > 0) return;
    try {
      setIsLoading(true);
      await authApi.forgotPassword({ codigoPais, telefono });
      toast.success('Código reenviado');
      setCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al reenviar';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const onResetPassword = async (data: PasswordForm) => {
    try {
      setIsLoading(true);
      await authApi.resetPasswordWithToken({
        resetToken,
        newPassword: data.newPassword,
      });
      toast.success('Contraseña actualizada correctamente');
      setStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al cambiar contraseña';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const stepConfig = {
    1: { icon: Phone, title: 'Recuperar contraseña', subtitle: 'Ingresa tu número de teléfono registrado' },
    2: { icon: Shield, title: 'Verificar código', subtitle: 'Ingresa el código de 6 dígitos enviado a tu WhatsApp' },
    3: { icon: Lock, title: 'Nueva contraseña', subtitle: 'Crea tu nueva contraseña' },
    4: { icon: Check, title: 'Contraseña actualizada', subtitle: 'Tu contraseña ha sido cambiada exitosamente' },
  };

  const current = stepConfig[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <current.icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{current.title}</h1>
          <p className="text-gray-500 mt-1">{current.subtitle}</p>
        </div>

        {/* Step indicators */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-blue-600'
                    : s < step
                    ? 'w-2 bg-blue-600'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 1: Phone */}
        {step === 1 && (
          <form onSubmit={handlePhoneSubmit(onRequestCode)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                Teléfono
              </Label>
              <Controller
                name="phoneNumber"
                control={phoneControl}
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
              {phoneErrors.phoneNumber && (
                <p className="text-sm text-red-600">{phoneErrors.phoneNumber.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar código'}
            </Button>

            <p className="text-center">
              <Link to="/login" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Volver al login
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button
              onClick={onVerifyCode}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
              disabled={isLoading || otp.join('').length !== 6}
            >
              {isLoading ? 'Verificando...' : 'Verificar código'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              ¿No recibiste el código?{' '}
              {cooldown > 0 ? (
                <span className="text-gray-400">Reenviar en {cooldown}s</span>
              ) : (
                <button
                  onClick={onResendCode}
                  disabled={isLoading}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Reenviar
                </button>
              )}
            </p>

            <p className="text-center">
              <button
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); }}
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Cambiar número
              </button>
            </p>
          </div>
        )}

        {/* Step 3: New password */}
        {step === 3 && (
          <form onSubmit={handlePasswordSubmit(onResetPassword)} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                Nueva contraseña
              </Label>
              <Controller
                name="newPassword"
                control={passwordControl}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                )}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-red-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 text-sm font-medium">
                Confirmar contraseña
              </Label>
              <Controller
                name="confirmPassword"
                control={passwordControl}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="password"
                    placeholder="Repite tu contraseña"
                    className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 h-12 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                )}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
              disabled={isLoading}
            >
              {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-gray-600">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              Ir al login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
