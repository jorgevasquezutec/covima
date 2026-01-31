import React, { useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import type { Mensaje } from '../types/inbox.types';

interface MessageListProps {
  mensajes: Mensaje[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  typingText?: string | null;
  onLoadMore: () => void;
}

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) {
    return 'Hoy';
  }
  if (isYesterday(date)) {
    return 'Ayer';
  }
  return format(date, "EEEE, d 'de' MMMM", { locale: es });
};

export function MessageList({
  mensajes,
  loading,
  loadingMore,
  hasMore,
  typingText,
  onLoadMore,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMensajesLengthRef = useRef(mensajes.length);
  const isInitialLoad = useRef(true);
  const isNearBottomRef = useRef(true);

  // Función para obtener el viewport del ScrollArea
  const getScrollViewport = useCallback(() => {
    return scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Verificar si está cerca del fondo cuando el usuario hace scroll
  useEffect(() => {
    const viewport = getScrollViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = viewport;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [getScrollViewport]);

  // Resetear estados cuando se cambia de conversación (mensajes se vacían)
  useEffect(() => {
    if (mensajes.length === 0) {
      isInitialLoad.current = true;
      isNearBottomRef.current = true;
      prevMensajesLengthRef.current = 0;
    }
  }, [mensajes.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (mensajes.length > 0 && (mensajes.length > prevMensajesLengthRef.current || isInitialLoad.current)) {
      // Solo scroll automático si el usuario está cerca del final o es carga inicial
      if (isNearBottomRef.current || isInitialLoad.current) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'auto' : 'smooth' });
        }, 50);
      }
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
    }
    prevMensajesLengthRef.current = mensajes.length;
  }, [mensajes.length]);

  // Renderizar mensajes con separadores de fecha
  const renderMessages = () => {
    const elements: React.ReactElement[] = [];
    let lastDate: Date | null = null;

    mensajes.forEach((mensaje, index) => {
      const messageDate = new Date(mensaje.createdAt);

      // Agregar separador de fecha si es un día diferente
      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        elements.push(
          <div key={`date-${mensaje.id}`} className="flex items-center justify-center my-4">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDateSeparator(messageDate)}
            </div>
          </div>
        );
        lastDate = messageDate;
      }

      elements.push(
        <MessageBubble
          key={mensaje.id}
          mensaje={mensaje}
          showSender={
            // Mostrar sender si es el primer mensaje o si el sender anterior era diferente
            index === 0 ||
            mensajes[index - 1].enviadoPor?.id !== mensaje.enviadoPor?.id ||
            mensajes[index - 1].direccion !== mensaje.direccion
          }
        />
      );
    });

    return elements;
  };

  if (loading && mensajes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 px-4">
      <div className="min-h-full flex flex-col justify-end">
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="text-gray-500"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ChevronUp className="w-4 h-4 mr-2" />
              )}
              Cargar mensajes anteriores
            </Button>
          </div>
        )}

        {/* Messages */}
        <div className="py-4">
          {mensajes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p className="text-sm">No hay mensajes</p>
              <p className="text-xs mt-1">Los mensajes aparecerán aquí</p>
            </div>
          ) : (
            renderMessages()
          )}

          {/* Typing indicator */}
          {typingText && (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs">{typingText}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </ScrollArea>
  );
}
