import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      <p className="text-center text-muted-foreground py-8">No hay más participantes en el ranking</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Participante</TableHead>
          <TableHead className="text-center">Nivel</TableHead>
          <TableHead className="text-center">Racha</TableHead>
          <TableHead className="text-right">Puntos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lista.map((usuario) => (
          <TableRow
            key={usuario.usuarioId}
            className={usuario.usuarioId === usuarioActualId ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
          >
            <TableCell className="font-medium">{usuario.posicion}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={usuario.fotoUrl} alt={usuario.nombre} />
                  <AvatarFallback className="text-xs">{usuario.nombre.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {usuario.nombre}
                    {usuario.usuarioId === usuarioActualId && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Tú
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{usuario.asistenciasTotales} asistencias</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span>{usuario.nivel?.icono || '🌱'}</span>
                <span className="text-xs text-muted-foreground">{usuario.nivel?.nombre}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              {usuario.rachaActual > 0 && (
                <div className="flex items-center justify-center gap-1 text-orange-500">
                  <Flame className="w-4 h-4" />
                  <span className="font-medium">{usuario.rachaActual}</span>
                </div>
              )}
            </TableCell>
            <TableCell className="text-right font-semibold">{usuario.puntosPeriodo.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
