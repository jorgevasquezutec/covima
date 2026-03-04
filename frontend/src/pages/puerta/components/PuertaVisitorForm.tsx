import { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { programasApi } from '@/services/api';

interface VisitaForm {
  nombre: string;
  procedencia: string;
  telefono?: string;
  direccion?: string;
}

interface PuertaVisitorFormProps {
  programaId: number;
  onSuccess: (nombre: string) => void;
}

export function PuertaVisitorForm({ programaId, onSuccess }: PuertaVisitorFormProps) {
  const nombreRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<VisitaForm>();

  useEffect(() => {
    nombreRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: (data: VisitaForm) => programasApi.createVisita(programaId, data),
    onSuccess: (_, data) => {
      reset();
      onSuccess(data.nombre);
      setTimeout(() => nombreRef.current?.focus(), 100);
    },
    onError: () => {
      toast.error('Error al registrar visita');
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div>
        <Label htmlFor="v-nombre">Nombre</Label>
        <Input
          id="v-nombre"
          placeholder="Nombre del visitante"
          className="h-14 text-lg mt-1"
          {...register('nombre', { required: 'El nombre es obligatorio' })}
          ref={(e) => {
            register('nombre').ref(e);
            (nombreRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
          }}
        />
        {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre.message}</p>}
      </div>
      <div>
        <Label htmlFor="v-procedencia">De dónde nos visita?</Label>
        <Input
          id="v-procedencia"
          placeholder="Iglesia, ciudad, etc."
          className="h-14 text-lg mt-1"
          {...register('procedencia', { required: 'La procedencia es obligatoria' })}
        />
        {errors.procedencia && <p className="text-sm text-red-500 mt-1">{errors.procedencia.message}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="v-telefono">Teléfono <span className="text-gray-400 font-normal">(opcional)</span></Label>
          <Input id="v-telefono" placeholder="987 654 321" className="h-14 text-lg mt-1" {...register('telefono')} />
        </div>
        <div>
          <Label htmlFor="v-direccion">Dirección <span className="text-gray-400 font-normal">(opcional)</span></Label>
          <Input id="v-direccion" placeholder="Av. Los Olivos 123" className="h-14 text-lg mt-1" {...register('direccion')} />
        </div>
      </div>
      <Button type="submit" className="w-full h-14 text-base" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <UserPlus className="w-5 h-5 mr-2" />
        )}
        Registrar Visita
      </Button>
    </form>
  );
}
