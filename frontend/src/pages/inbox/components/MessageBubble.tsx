import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, Clock, AlertCircle, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mensaje, EstadoMensaje } from '../types/inbox.types';

interface MessageBubbleProps {
  mensaje: Mensaje;
  showSender?: boolean;
}

const getEstadoIcon = (estado: EstadoMensaje) => {
  switch (estado) {
    case 'PENDIENTE':
      return <Clock className="w-3 h-3 text-gray-400" />;
    case 'ENVIADO':
      return <Check className="w-3 h-3 text-gray-400" />;
    case 'ENTREGADO':
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case 'LEIDO':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'FALLIDO':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
  }
};

export function MessageBubble({ mensaje, showSender = true }: MessageBubbleProps) {
  const isOutgoing = mensaje.direccion === 'SALIENTE';
  const time = format(new Date(mensaje.createdAt), 'HH:mm', { locale: es });

  // Determinar quién envió el mensaje
  const senderName = mensaje.enviadoPor?.nombre || (isOutgoing ? 'Bot' : null);
  const isBot = isOutgoing && !mensaje.enviadoPor;

  return (
    <div
      className={cn(
        'flex w-full mb-2',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 shadow-sm',
          isOutgoing
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
        )}
      >
        {/* Sender info */}
        {showSender && senderName && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mb-1',
              isOutgoing ? 'text-blue-200' : 'text-gray-500'
            )}
          >
            {isBot ? (
              <Bot className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
            <span>{senderName}</span>
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">{mensaje.contenido}</p>

        {/* Footer: time + status */}
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1',
            isOutgoing ? 'text-blue-200' : 'text-gray-400'
          )}
        >
          <span className="text-[10px]">{time}</span>
          {isOutgoing && getEstadoIcon(mensaje.estado)}
        </div>
      </div>
    </div>
  );
}
