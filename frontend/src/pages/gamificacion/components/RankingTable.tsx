import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import type { RankingUsuario } from '@/types';

interface RankingTableProps {
  usuarios: RankingUsuario[];
  usuarioActualId?: number;
  startFrom?: number;
}

export function RankingTable({ usuarios, usuarioActualId, startFrom = 4 }: RankingTableProps) {
  const lista = startFrom > 1 ? usuarios.slice(startFrom - 1) : usuarios;

  if (lista.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-6 text-sm">No hay más participantes en el ranking</p>
    );
  }

  return (
    <div className="space-y-2">
      {lista.map((usuario) => (
        <div
          key={usuario.usuarioId}
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${
            usuario.usuarioId === usuarioActualId
              ? 'bg-primary/10 ring-1 ring-primary/30'
              : 'bg-muted/50'
          }`}
        >
          {/* Posición */}
          <div className="w-6 sm:w-8 text-center font-bold text-sm sm:text-base text-muted-foreground shrink-0">
            {usuario.posicion}
          </div>

          {/* Avatar */}
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            <AvatarImage src={usuario.fotoUrl} alt={usuario.nombre} />
            <AvatarFallback className="text-xs sm:text-sm">{usuario.nombre.charAt(0)}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm truncate">
                {usuario.nombre}
              </p>
              {usuario.usuarioId === usuarioActualId && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  Tú
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
              <span>{usuario.nivel?.icono || '🌱'} {usuario.nivel?.nombre}</span>
              {usuario.rachaActual > 0 && (
                <span className="flex items-center gap-0.5 text-orange-500">
                  <Flame className="w-3 h-3" />
                  {usuario.rachaActual}
                </span>
              )}
            </div>
          </div>

          {/* Puntos */}
          <div className="text-right shrink-0">
            <p className="font-bold text-sm sm:text-base">{usuario.puntosPeriodo.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}
