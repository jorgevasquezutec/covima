import { Progress } from '@/components/ui/progress';
import type { NivelBiblico } from '@/types';

interface ProgresoXPProps {
  xpActual: number;
  nivelActual: NivelBiblico;
  nivelSiguiente: NivelBiblico | null;
  progresoXp: number;
}

export function ProgresoXP({ xpActual, nivelActual, nivelSiguiente, progresoXp }: ProgresoXPProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span>{nivelActual.icono}</span>
          <span className="font-medium">{nivelActual.nombre}</span>
        </div>
        {nivelSiguiente && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{nivelSiguiente.nombre}</span>
            <span>{nivelSiguiente.icono}</span>
          </div>
        )}
      </div>

      <Progress value={progresoXp} className="h-3" />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{xpActual.toLocaleString()} XP</span>
        {nivelSiguiente && <span>{nivelSiguiente.xpRequerido.toLocaleString()} XP</span>}
      </div>
    </div>
  );
}
