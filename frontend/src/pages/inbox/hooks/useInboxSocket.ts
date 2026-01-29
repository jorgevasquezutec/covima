import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  SocketMensajeNuevo,
  SocketConversacionActualizada,
  SocketTyping,
} from '../types/inbox.types';

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

interface UseInboxSocketOptions {
  onMensajeNuevo?: (conversacionId: number, mensaje: SocketMensajeNuevo) => void;
  onConversacionActualizada?: (data: SocketConversacionActualizada) => void;
  onConversacionNueva?: (conversacion: any) => void;
  onTyping?: (data: SocketTyping) => void;
  onAdminJoined?: (data: { odId: number; nombre: string; conversacionId: number }) => void;
  onAdminLeft?: (data: { odId: number; conversacionId: number }) => void;
}

export function useInboxSocket(options: UseInboxSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Store callbacks in refs to avoid dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionError('No hay token de autenticación');
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    const socketUrl = getSocketUrl();
    socketRef.current = io(`${socketUrl}/inbox`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      console.log('[InboxSocket] Connected');
    });

    socketRef.current.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[InboxSocket] Disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      setConnectionError(error.message);
      reconnectAttempts.current++;
      console.error('[InboxSocket] Connection error:', error.message);
    });

    socketRef.current.on('error', (error: { message: string }) => {
      setConnectionError(error.message);
      console.error('[InboxSocket] Error:', error.message);
    });

    // Event listeners - use optionsRef to get latest callbacks
    socketRef.current.on('inbox:mensaje:nuevo', (mensaje: SocketMensajeNuevo & { conversacionId?: number }) => {
      if (mensaje.conversacionId && optionsRef.current.onMensajeNuevo) {
        optionsRef.current.onMensajeNuevo(mensaje.conversacionId, mensaje);
      }
    });

    socketRef.current.on('inbox:conversacion:actualizada', (data: SocketConversacionActualizada) => {
      optionsRef.current.onConversacionActualizada?.(data);
    });

    socketRef.current.on('inbox:conversacion:nueva', (conversacion: any) => {
      optionsRef.current.onConversacionNueva?.(conversacion);
    });

    socketRef.current.on('inbox:typing', (data: SocketTyping) => {
      optionsRef.current.onTyping?.(data);
    });

    socketRef.current.on('inbox:admin:joined', (data) => {
      optionsRef.current.onAdminJoined?.(data);
    });

    socketRef.current.on('inbox:admin:left', (data) => {
      optionsRef.current.onAdminLeft?.(data);
    });
  }, []); // No dependencies - uses refs for callbacks

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const joinConversation = useCallback((conversacionId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join', { conversacionId }, (response: any) => {
        if (!response.success) {
          console.error('[InboxSocket] Failed to join conversation:', response.error);
        }
      });
    }
  }, []);

  const leaveConversation = useCallback((conversacionId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave', { conversacionId });
    }
  }, []);

  const sendTyping = useCallback((conversacionId: number, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { conversacionId, isTyping });
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendTyping,
    reconnect: connect,
  };
}
