import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { QRAsistencia } from '@/types';

interface ProgramaContext {
  id: number;
  titulo: string;
  qr: QRAsistencia | null;
  isActive: boolean;
}

interface PuertaContextBarProps {
  programas: ProgramaContext[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function PuertaContextBar({ programas, selectedId, onSelect }: PuertaContextBarProps) {
  const [clock, setClock] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => setClock(formatTime(new Date())), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {programas.map((p) => {
        const isSelected = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all',
              isSelected
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {p.isActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isSelected ? 'bg-green-300' : 'bg-green-400'
                )} />
                <span className={cn(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  isSelected ? 'bg-green-300' : 'bg-green-500'
                )} />
              </span>
            )}
            {shortenTitle(p.titulo)}
          </button>
        );
      })}
      <span className="ml-auto text-sm font-mono text-gray-400">{clock}</span>
    </div>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function shortenTitle(titulo: string): string {
  const lower = titulo.toLowerCase();
  if (lower.includes('escuela sab')) return 'Escuela Sab.';
  if (lower.includes('culto divino')) return 'Culto Divino';
  if (lower.includes('programa ja')) return 'Programa JA';
  if (titulo.length > 20) return titulo.slice(0, 18) + '…';
  return titulo;
}
