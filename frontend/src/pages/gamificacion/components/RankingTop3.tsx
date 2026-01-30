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
        return 'h-28';
      case 2:
        return 'h-20';
      case 3:
        return 'h-16';
      default:
        return 'h-12';
    }
  };

  if (top3.length === 0) return null;

  return (
    <div className="flex justify-center items-end gap-4 py-6">
      {ordenados.map((usuario) => (
        <div key={usuario.usuarioId} className="flex flex-col items-center">
          <div className="relative mb-2">
            <Avatar className={usuario.posicion === 1 ? 'w-20 h-20 ring-4 ring-yellow-400' : 'w-16 h-16'}>
              <AvatarImage src={usuario.fotoUrl} alt={usuario.nombre} />
              <AvatarFallback className="text-lg">{usuario.nombre.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-md ${getMedalColor(usuario.posicion)}`}
            >
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <p className="font-semibold text-sm text-center max-w-24 truncate">{usuario.nombre}</p>
          <p className="text-xs text-muted-foreground">{usuario.nivel?.nombre || 'Nivel 1'}</p>

          <div
            className={`${getPodiumHeight(usuario.posicion)} w-20 mt-2 rounded-t-lg flex items-center justify-center`}
            style={{
              backgroundColor:
                usuario.posicion === 1
                  ? '#fbbf24'
                  : usuario.posicion === 2
                    ? '#9ca3af'
                    : '#d97706',
            }}
          >
            <span className="text-white font-bold text-xl">{usuario.posicion}</span>
          </div>

          <p className="text-sm font-semibold mt-2">{usuario.puntosPeriodo.toLocaleString()} pts</p>
        </div>
      ))}
    </div>
  );
}
