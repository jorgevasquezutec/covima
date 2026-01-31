import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import type { RankingUsuario } from '@/types';

interface RankingTop3Props {
  usuarios: RankingUsuario[];
}

export function RankingTop3({ usuarios }: RankingTop3Props) {
  const top3 = usuarios.slice(0, 3);

  // Reordenar para mostrar: 2do - 1ro - 3ro
  const ordenados = [top3[1], top3[0], top3[2]].filter(Boolean);

  const getMedalColor = (posicion: number) => {
    switch (posicion) {
      case 1:
        return 'text-yellow-500';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-500';
    }
  };

  const getPodiumHeight = (posicion: number) => {
    switch (posicion) {
      case 1:
        return 'h-24 sm:h-28';
      case 2:
        return 'h-16 sm:h-20';
      case 3:
        return 'h-12 sm:h-16';
      default:
        return 'h-10 sm:h-12';
    }
  };

  if (top3.length === 0) return null;

  return (
    <div className="flex justify-center items-end gap-2 sm:gap-4 py-4 sm:py-6">
      {ordenados.map((usuario) => (
        <div key={usuario.usuarioId} className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[140px]">
          <div className="relative mb-1.5 sm:mb-2">
            <Avatar className={usuario.posicion === 1 ? 'w-14 h-14 sm:w-20 sm:h-20 ring-2 sm:ring-4 ring-yellow-400' : 'w-11 h-11 sm:w-16 sm:h-16'}>
              <AvatarImage src={usuario.fotoUrl} alt={usuario.nombre} />
              <AvatarFallback className="text-sm sm:text-lg">{usuario.nombre.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-background flex items-center justify-center shadow-md ${getMedalColor(usuario.posicion)}`}
            >
              <Trophy className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>

          <p className="font-semibold text-xs sm:text-sm text-center w-full truncate px-1">{usuario.nombre}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{usuario.nivel?.nombre || 'Nivel 1'}</p>

          <div
            className={`${getPodiumHeight(usuario.posicion)} w-full mt-1.5 sm:mt-2 rounded-t-lg flex items-center justify-center`}
            style={{
              backgroundColor:
                usuario.posicion === 1
                  ? '#fbbf24'
                  : usuario.posicion === 2
                    ? '#9ca3af'
                    : '#d97706',
            }}
          >
            <span className="text-white font-bold text-lg sm:text-xl">{usuario.posicion}</span>
          </div>

          <p className="text-xs sm:text-sm font-semibold mt-1.5 sm:mt-2">{usuario.puntosPeriodo.toLocaleString()} pts</p>
        </div>
      ))}
    </div>
  );
}
