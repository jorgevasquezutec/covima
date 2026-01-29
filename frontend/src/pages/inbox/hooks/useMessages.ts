import { useState, useCallback, useRef } from 'react';
import { inboxApi } from '@/services/api';
import type { Mensaje } from '../types/inbox.types';

export function useMessages(conversacionId: number | null) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | undefined>();
  const lastConversacionId = useRef<number | null>(null);

  const fetchMensajes = useCallback(async (reset = true) => {
    if (!conversacionId) return;

    try {
      if (reset) {
        setLoading(true);
        setMensajes([]);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params: any = {
        limit: 50,
        direccion: 'antes',
      };

      if (!reset && nextCursor) {
        params.cursor = nextCursor;
      }

      const response = await inboxApi.getMensajes(conversacionId, params);

      // Los mensajes vienen en orden desc, los revertimos para mostrar cronológicamente
      const newMensajes = [...response.data].reverse();

      if (reset) {
        setMensajes(newMensajes);
        if (response.totalCount !== undefined) {
          setTotalCount(response.totalCount);
        }
      } else {
        // Agregar al inicio (mensajes más antiguos)
        setMensajes((prev) => [...newMensajes, ...prev]);
      }

      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
      lastConversacionId.current = conversacionId;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar mensajes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversacionId, nextCursor]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      fetchMensajes(false);
    }
  }, [hasMore, loading, loadingMore, fetchMensajes]);

  // Agregar nuevo mensaje al final
  const addMensaje = useCallback((mensaje: Mensaje) => {
    setMensajes((prev) => {
      // Evitar duplicados
      if (prev.some((m) => m.id === mensaje.id)) {
        return prev;
      }
      return [...prev, mensaje];
    });
    if (totalCount !== undefined) {
      setTotalCount((prev) => (prev ?? 0) + 1);
    }
  }, [totalCount]);

  // Agregar mensaje optimista (antes de confirmación del servidor)
  const addOptimisticMensaje = useCallback((tempId: string, contenido: string, enviadoPorId: number, enviadoPorNombre: string) => {
    const optimisticMensaje: Mensaje = {
      id: parseInt(tempId, 10) || Date.now(),
      contenido,
      tipo: 'texto',
      direccion: 'SALIENTE',
      estado: 'PENDIENTE',
      createdAt: new Date().toISOString(),
      enviadoPor: {
        id: enviadoPorId,
        nombre: enviadoPorNombre,
      },
    };
    setMensajes((prev) => [...prev, optimisticMensaje]);
    return optimisticMensaje.id;
  }, []);

  // Actualizar estado de mensaje (ej: de PENDIENTE a ENVIADO)
  const updateMensajeEstado = useCallback((id: number, estado: Mensaje['estado']) => {
    setMensajes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado } : m))
    );
  }, []);

  // Reemplazar mensaje optimista con el real
  const replaceMensaje = useCallback((tempId: number, realMensaje: Mensaje) => {
    setMensajes((prev) =>
      prev.map((m) => (m.id === tempId ? realMensaje : m))
    );
  }, []);

  // Limpiar cuando cambia la conversación
  const clear = useCallback(() => {
    setMensajes([]);
    setNextCursor(null);
    setHasMore(false);
    setTotalCount(undefined);
    setError(null);
  }, []);

  return {
    mensajes,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    fetchMensajes,
    loadMore,
    addMensaje,
    addOptimisticMensaje,
    updateMensajeEstado,
    replaceMensaje,
    clear,
    refresh: () => fetchMensajes(true),
  };
}
