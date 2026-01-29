import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bot, Headphones, Pause } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Conversacion, ModoConversacion } from '../types/inbox.types';

interface ConversationItemProps {
  conversacion: Conversacion;
  isSelected: boolean;
  onClick: () => void;
}

const getModoIcon = (modo: ModoConversacion) => {
  switch (modo) {
    case 'BOT':
      return <Bot className="w-3 h-3" />;
    case 'HANDOFF':
      return <Headphones className="w-3 h-3" />;
    case 'PAUSADO':
      return <Pause className="w-3 h-3" />;
  }
};

const getModoColor = (modo: ModoConversacion) => {
  switch (modo) {
    case 'BOT':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'HANDOFF':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'PAUSADO':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }
};

const getModoLabel = (modo: ModoConversacion) => {
  switch (modo) {
    case 'BOT':
      return 'Bot';
    case 'HANDOFF':
      return 'Atendiendo';
    case 'PAUSADO':
      return 'En espera';
  }
};

export function ConversationItem({ conversacion, isSelected, onClick }: ConversationItemProps) {
  const nombre = conversacion.usuario?.nombre ||
    conversacion.usuario?.nombreWhatsapp ||
    conversacion.telefono;

  const initials = nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(conversacion.updatedAt), {
    addSuffix: true,
    locale: es,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 flex items-start gap-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-100',
        isSelected && 'bg-blue-50 hover:bg-blue-50 border-l-2 border-l-blue-500'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversacion.usuario?.fotoUrl} alt={nombre} />
          <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Indicador de modo */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white',
            conversacion.modo === 'BOT' && 'bg-green-500',
            conversacion.modo === 'HANDOFF' && 'bg-blue-500',
            conversacion.modo === 'PAUSADO' && 'bg-yellow-500'
          )}
        >
          {getModoIcon(conversacion.modo)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900 truncate">{nombre}</span>
          <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo}</span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-gray-500 truncate">
            {conversacion.ultimoMensaje || 'Sin mensajes'}
          </p>

          {/* Badge de no leídos */}
          {conversacion.mensajesNoLeidos > 0 && (
            <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {conversacion.mensajesNoLeidos > 99 ? '99+' : conversacion.mensajesNoLeidos}
            </span>
          )}
        </div>

        {/* Info adicional */}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getModoColor(conversacion.modo))}>
            {getModoIcon(conversacion.modo)}
            <span className="ml-1">{getModoLabel(conversacion.modo)}</span>
          </Badge>

          {conversacion.derivadaA && (
            <span className="text-[10px] text-gray-500">
              {conversacion.derivadaA.nombre}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
