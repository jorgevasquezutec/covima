import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormularioCampo } from '@/types';

interface DynamicFormProps {
  campos: FormularioCampo[];
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function DynamicForm({
  campos,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Registrar Asistencia',
}: DynamicFormProps) {
  // Generar schema Zod dinámicamente basado en los campos
  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const campo of campos) {
      let fieldSchema: z.ZodTypeAny;

      switch (campo.tipo) {
        case 'number':
          fieldSchema = z.coerce.number();
          if (campo.valorMinimo !== undefined && campo.valorMinimo !== null) {
            fieldSchema = (fieldSchema as z.ZodNumber).min(campo.valorMinimo, {
              message: `Mínimo ${campo.valorMinimo}`,
            });
          }
          if (campo.valorMaximo !== undefined && campo.valorMaximo !== null) {
            fieldSchema = (fieldSchema as z.ZodNumber).max(campo.valorMaximo, {
              message: `Máximo ${campo.valorMaximo}`,
            });
          }
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'select':
          fieldSchema = z.string();
          break;
        case 'rating':
          fieldSchema = z.coerce.number().min(1).max(5);
          break;
        default:
          fieldSchema = z.string();
      }

      if (!campo.requerido) {
        fieldSchema = fieldSchema.optional();
      }

      shape[campo.nombre] = fieldSchema;
    }

    return z.object(shape);
  }, [campos]);

  // Generar valores por defecto
  const defaultValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const campo of campos) {
      switch (campo.tipo) {
        case 'checkbox':
          values[campo.nombre] = false;
          break;
        case 'number':
        case 'rating':
          values[campo.nombre] = campo.valorMinimo ?? 0;
          break;
        default:
          values[campo.nombre] = '';
      }
    }
    return values;
  }, [campos]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleFormSubmit = (data: Record<string, unknown>) => {
    onSubmit(data);
  };

  if (campos.length === 0) {
    return (
      <Button
        type="button"
        onClick={() => onSubmit({})}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Enviando...' : submitLabel}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {campos.map((campo) => (
        <DynamicField
          key={campo.id}
          campo={campo}
          control={control}
          error={errors[campo.nombre]?.message as string | undefined}
        />
      ))}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Enviando...' : submitLabel}
      </Button>
    </form>
  );
}

interface DynamicFieldProps {
  campo: FormularioCampo;
  control: ReturnType<typeof useForm>['control'];
  error?: string;
}

function DynamicField({ campo, control, error }: DynamicFieldProps) {
  switch (campo.tipo) {
    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.nombre}>
            {campo.label}
            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Controller
            name={campo.nombre}
            control={control}
            render={({ field }) => (
              <Input
                id={campo.nombre}
                type="number"
                min={campo.valorMinimo ?? undefined}
                max={campo.valorMaximo ?? undefined}
                placeholder={campo.placeholder}
                {...field}
                onChange={(e) => field.onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
            )}
          />
          {campo.valorMinimo !== null && campo.valorMaximo !== null && (
            <p className="text-xs text-gray-500">
              Valor entre {campo.valorMinimo} y {campo.valorMaximo}
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          <Controller
            name={campo.nombre}
            control={control}
            render={({ field }) => (
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={campo.nombre}
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor={campo.nombre} className="cursor-pointer">
                  {campo.label}
                  {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                </Label>
              </div>
            )}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.nombre}>
            {campo.label}
            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Controller
            name={campo.nombre}
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value as string}>
                <SelectTrigger id={campo.nombre}>
                  <SelectValue placeholder={campo.placeholder || 'Selecciona una opción'} />
                </SelectTrigger>
                <SelectContent>
                  {campo.opciones?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    case 'rating':
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.nombre}>
            {campo.label}
            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Controller
            name={campo.nombre}
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => field.onChange(star)}
                    className={`text-2xl transition-colors ${
                      (field.value as number) >= star
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={campo.nombre}>
            {campo.label}
            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Controller
            name={campo.nombre}
            control={control}
            render={({ field }) => (
              <Input
                id={campo.nombre}
                type="text"
                placeholder={campo.placeholder}
                {...field}
                value={field.value as string}
              />
            )}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
  }
}
