import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface PuertaSuccessOverlayProps {
  nombre: string;
  tipo: 'asistencia' | 'visita' | 'nuevo_miembro';
  onDismiss: () => void;
}

const labels: Record<string, string> = {
  asistencia: 'Asistencia registrada',
  visita: 'Visita registrada',
  nuevo_miembro: 'Miembro registrado',
};

export function PuertaSuccessOverlay({ nombre, tipo, onDismiss }: PuertaSuccessOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 1500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onDismiss}
    >
      <div className="animate-in zoom-in-50 duration-300 bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-3 max-w-sm mx-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <p className="text-xl font-bold text-gray-900 text-center">{nombre}</p>
        <p className="text-sm text-gray-500">{labels[tipo]}</p>
      </div>
    </div>
  );
}
