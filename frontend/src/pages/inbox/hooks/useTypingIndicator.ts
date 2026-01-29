import { useState, useCallback, useRef, useEffect } from 'react';

interface TypingUser {
  odId: number;
  nombre: string;
}

interface UseTypingIndicatorOptions {
  sendTyping: (conversacionId: number, isTyping: boolean) => void;
  debounceMs?: number;
  timeoutMs?: number;
}

export function useTypingIndicator(options: UseTypingIndicatorOptions) {
  const { sendTyping, debounceMs = 500, timeoutMs = 3000 } = options;

  // Usuarios que están escribiendo en la conversación actual
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Para controlar el debounce de envío
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const currentConversacionRef = useRef<number | null>(null);

  // Timeouts para limpiar usuarios que ya no escriben
  const userTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Cuando el usuario local empieza/deja de escribir
  const handleInputChange = useCallback((conversacionId: number, hasText: boolean) => {
    currentConversacionRef.current = conversacionId;

    // Limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (hasText && !isTypingRef.current) {
      // Empezó a escribir
      isTypingRef.current = true;
      sendTyping(conversacionId, true);
    }

    // Configurar timeout para indicar que dejó de escribir
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTyping(conversacionId, false);
      }
    }, debounceMs);
  }, [sendTyping, debounceMs]);

  // Cuando enviamos un mensaje, dejar de mostrar typing
  const stopTyping = useCallback((conversacionId: number) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversacionId, false);
    }
  }, [sendTyping]);

  // Recibir evento de typing de otro usuario
  const handleRemoteTyping = useCallback((odId: number, nombre: string, isTyping: boolean) => {
    // Limpiar timeout anterior para este usuario
    const existingTimeout = userTimeoutsRef.current.get(odId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      userTimeoutsRef.current.delete(odId);
    }

    if (isTyping) {
      // Agregar usuario si no está
      setTypingUsers((prev) => {
        if (prev.some((u) => u.odId === odId)) {
          return prev;
        }
        return [...prev, { odId, nombre }];
      });

      // Configurar timeout para remover automáticamente
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.odId !== odId));
        userTimeoutsRef.current.delete(odId);
      }, timeoutMs);
      userTimeoutsRef.current.set(odId, timeout);
    } else {
      // Remover usuario
      setTypingUsers((prev) => prev.filter((u) => u.odId !== odId));
    }
  }, [timeoutMs]);

  // Limpiar cuando cambia la conversación
  const clearTyping = useCallback(() => {
    setTypingUsers([]);
    userTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    userTimeoutsRef.current.clear();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      userTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  // Formatear texto de typing
  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].nombre} está escribiendo...`
      : `${typingUsers.map((u) => u.nombre).join(', ')} están escribiendo...`
    : null;

  return {
    typingUsers,
    typingText,
    handleInputChange,
    stopTyping,
    handleRemoteTyping,
    clearTyping,
  };
}
