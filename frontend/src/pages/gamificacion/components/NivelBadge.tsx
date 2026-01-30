import type { NivelBiblico } from '@/types';

interface NivelBadgeProps {
  nivel: NivelBiblico;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function NivelBadge({ nivel, size = 'md', showName = true }: NivelBadgeProps) {
  const sizeClasses = {
    sm: 'text-lg w-8 h-8',
    md: 'text-2xl w-12 h-12',
    lg: 'text-4xl w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
        style={{ backgroundColor: `${nivel.color}20` }}
      >
        <span>{nivel.icono || '🌟'}</span>
      </div>
      {showName && (
        <div>
          <p className={`font-semibold ${textSizeClasses[size]}`} style={{ color: nivel.color }}>
            {nivel.nombre}
          </p>
          <p className="text-xs text-muted-foreground">Nivel {nivel.numero}</p>
        </div>
      )}
    </div>
  );
}
