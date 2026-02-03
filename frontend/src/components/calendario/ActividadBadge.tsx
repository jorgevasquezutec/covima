import { Badge } from '@/components/ui/badge';
import type { ActividadCalendario } from '@/types';
import * as LucideIcons from 'lucide-react';

interface ActividadBadgeProps {
  actividad: ActividadCalendario;
  compact?: boolean;
  showTime?: boolean;
  onClick?: () => void;
}

export default function ActividadBadge({
  actividad,
  compact = false,
  showTime = false,
  onClick,
}: ActividadBadgeProps) {
  // Guard against null/undefined actividad
  if (!actividad) {
    return null;
  }

  // Get the icon component dynamically
  const iconName = actividad.icono as keyof typeof LucideIcons;
  const IconComponent = LucideIcons[iconName] as React.ComponentType<{ className?: string }>;

  // Use color from actividad
  const bgColor = actividad.color;

  // Generate a lighter version of the color for background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(bgColor);
  const bgColorLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
  const textColor = bgColor;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
        style={{ color: textColor }}
      >
        {IconComponent && <IconComponent className="w-3 h-3" />}
        <span className="truncate max-w-[80px]">{actividad.titulo}</span>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap"
      style={{
        backgroundColor: bgColorLight,
        borderColor: bgColor,
        color: textColor,
      }}
      onClick={onClick}
    >
      {IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate">
        {showTime && actividad.hora && (
          <span className="font-medium">{actividad.hora} </span>
        )}
        {actividad.titulo}
      </span>
      {actividad.esCumpleanos && actividad.usuarioCumpleanos && (
        <span className="text-xs opacity-75">
          - {actividad.usuarioCumpleanos.nombre.split(' ')[0]}
        </span>
      )}
    </Badge>
  );
}
