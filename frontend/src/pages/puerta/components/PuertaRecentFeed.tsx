import { ClipboardCheck, UserPlus, Users } from 'lucide-react';

export interface RecentRegistration {
  id: string;
  nombre: string;
  tipo: 'asistencia' | 'visita' | 'nuevo_miembro';
  detalle?: string;
  hora: string;
}

interface PuertaRecentFeedProps {
  registrations: RecentRegistration[];
}

const config: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  asistencia: { label: 'Asistencia', color: 'bg-green-100 text-green-700', icon: ClipboardCheck },
  visita: { label: 'Visita', color: 'bg-blue-100 text-blue-700', icon: Users },
  nuevo_miembro: { label: 'Nuevo miembro', color: 'bg-purple-100 text-purple-700', icon: UserPlus },
};

export function PuertaRecentFeed({ registrations }: PuertaRecentFeedProps) {
  if (registrations.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No hay registros aún.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {registrations.map((r) => {
        const c = config[r.tipo];
        const Icon = c.icon;
        return (
          <div
            key={r.id}
            className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
          >
            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{r.nombre}</p>
              {r.detalle && (
                <p className="text-xs text-gray-500 truncate">{r.detalle}</p>
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${c.color}`}>
              {c.label}
            </span>
            <span className="text-xs text-gray-400 shrink-0">{r.hora}</span>
          </div>
        );
      })}
    </div>
  );
}
