import { useState, useCallback, useEffect } from 'react';
import { inboxApi } from '@/services/api';
import type { Conversacion, ConversacionesFilters, ModoFiltro } from '../types/inbox.types';

export function useConversations() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversacionesFilters>({});

  const fetchConversaciones = useCallback(async (reset = true) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: 20,
      };

      if (!reset && nextCursor) {
        params.cursor = nextCursor;
      }

      if (filters.modo && filters.modo !== 'TODOS') {
        params.modo = filters.modo;
      }

      if (filters.misConversaciones) {
        params.misConversaciones = 'true';
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await inboxApi.getConversaciones(params);

      if (reset) {
        setConversaciones(response.data);
      } else {
        setConversaciones((prev) => [...prev, ...response.data]);
      }

      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar conversaciones');
    } finally {
      setLoading(false);
    }
  }, [filters, nextCursor]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchConversaciones(false);
    }
  }, [hasMore, loading, fetchConversaciones]);

  const updateFilters = useCallback((newFilters: Partial<ConversacionesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const setModoFilter = useCallback((modo: ModoFiltro) => {
    setFilters((prev) => ({ ...prev, modo }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const toggleMisConversaciones = useCallback(() => {
    setFilters((prev) => ({ ...prev, misConversaciones: !prev.misConversaciones }));
  }, []);

  // Actualizar una conversación localmente
  const updateConversacion = useCallback((id: number, updates: Partial<Conversacion>) => {
    setConversaciones((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, ...updates } : conv))
    );
  }, []);

  // Agregar nueva conversación al inicio
  const addConversacion = useCallback((conversacion: Conversacion) => {
    setConversaciones((prev) => {
      // Evitar duplicados
      if (prev.some((c) => c.id === conversacion.id)) {
        return prev;
      }
      return [conversacion, ...prev];
    });
  }, []);

  // Mover conversación al inicio (cuando hay actividad)
  const moveToTop = useCallback((id: number) => {
    setConversaciones((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index <= 0) return prev;

      const [conv] = prev.splice(index, 1);
      return [conv, ...prev];
    });
  }, []);

  // Refrescar al cambiar filtros
  useEffect(() => {
    fetchConversaciones(true);
  }, [filters]);

  return {
    conversaciones,
    loading,
    error,
    hasMore,
    filters,
    fetchConversaciones,
    loadMore,
    updateFilters,
    setModoFilter,
    setSearch,
    toggleMisConversaciones,
    updateConversacion,
    addConversacion,
    moveToTop,
    refresh: () => fetchConversaciones(true),
  };
}
