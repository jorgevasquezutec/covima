import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import type { Asistencia, RoomUser, RoomState } from '@/types';

interface UseAsistenciaSocketOptions {
  qrCode: string;
  onNuevaAsistencia?: (asistencia: Asistencia) => void;
  onAsistenciaActualizada?: (asistencia: Asistencia) => void;
  onUsuarioEntro?: (data: { usuario: RoomUser; totalEnRoom: number }) => void;
  onUsuarioSalio?: (data: { odId: number; totalEnRoom: number }) => void;
  onEstadoRoom?: (data: RoomState) => void;
}

export function useAsistenciaSocket(options: UseAsistenciaSocketOptions) {
  const { qrCode } = options;

  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(options);

  // Mantener callbacks actualizados sin causar re-renders
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const [isConnected, setIsConnected] = useState(false);
  const [usuariosEnRoom, setUsuariosEnRoom] = useState<RoomUser[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);

  useEffect(() => {
    if (!token || !qrCode) return;

    // Si ya hay una conexión, no crear otra
    if (socketRef.current?.connected) return;

    // Obtener URL del WebSocket
    const getWsUrl = (): string => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
      }
      // En desarrollo, usar el mismo host que el frontend pero puerto 3000
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return `http://${window.location.hostname}:3000`;
      }
      return 'http://localhost:3000';
    };
    const wsUrl = getWsUrl();

    const socket = io(`${wsUrl}/asistencia`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      socket.emit('joinRoom', { qrCode });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('estadoRoom', (data: RoomState) => {
      setUsuariosEnRoom(data.usuarios);
      callbacksRef.current.onEstadoRoom?.(data);
    });

    socket.on('usuarioEntro', (data: { usuario: RoomUser; totalEnRoom: number }) => {
      setUsuariosEnRoom((prev) => {
        // Evitar duplicados
        if (prev.some((u) => u.id === data.usuario.id)) return prev;
        return [...prev, data.usuario];
      });
      callbacksRef.current.onUsuarioEntro?.(data);
    });

    socket.on('usuarioSalio', (data: { odId: number; totalEnRoom: number }) => {
      setUsuariosEnRoom((prev) => prev.filter((u) => u.id !== data.odId));
      callbacksRef.current.onUsuarioSalio?.(data);
    });

    socket.on('nuevaAsistencia', (asistencia: Asistencia) => {
      setAsistencias((prev) => {
        // Evitar duplicados
        if (prev.some((a) => a.id === asistencia.id)) return prev;
        return [asistencia, ...prev];
      });
      callbacksRef.current.onNuevaAsistencia?.(asistencia);
    });

    socket.on('asistenciaActualizada', (asistencia: Asistencia) => {
      setAsistencias((prev) =>
        prev.map((a) => (a.id === asistencia.id ? asistencia : a))
      );
      callbacksRef.current.onAsistenciaActualizada?.(asistencia);
    });

    return () => {
      console.log('[Socket] Cleanup');
      socket.emit('leaveRoom', { qrCode });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, qrCode]); // Solo dependencias estables

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { qrCode });
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [qrCode]);

  return {
    isConnected,
    usuariosEnRoom,
    asistencias,
    setAsistencias,
    socket: socketRef.current,
    disconnect,
  };
}
