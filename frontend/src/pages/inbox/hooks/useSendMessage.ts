import { useState, useCallback } from 'react';
import { inboxApi } from '@/services/api';
import type { Mensaje } from '../types/inbox.types';

interface UseSendMessageOptions {
  onSuccess?: (mensaje: Mensaje) => void;
  onError?: (error: string) => void;
}

export function useSendMessage(options: UseSendMessageOptions = {}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    conversacionId: number,
    contenido: string,
    tipo: string = 'TEXTO'
  ): Promise<Mensaje | null> => {
    if (!contenido.trim()) {
      setError('El mensaje no puede estar vacío');
      return null;
    }

    try {
      setSending(true);
      setError(null);

      const response = await inboxApi.enviarMensaje(conversacionId, {
        contenido: contenido.trim(),
        tipo,
      });

      options.onSuccess?.(response.mensaje);
      return response.mensaje;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Error al enviar mensaje';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    } finally {
      setSending(false);
    }
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    sending,
    error,
    clearError,
  };
}
