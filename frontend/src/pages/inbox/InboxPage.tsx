import { useState, useCallback, useEffect, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { useConversations, useInboxSocket } from './hooks';
import { ConversationList, ChatWindow, ConnectionStatus } from './components';
import type { Conversacion, SocketMensajeNuevo, SocketConversacionActualizada, SocketTyping, Mensaje } from './types/inbox.types';

export default function InboxPage() {
  const [selectedConversacion, setSelectedConversacion] = useState<Conversacion | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, { odId: number; nombre: string }[]>>(new Map());
  const [newMessageForChat, setNewMessageForChat] = useState<Mensaje | null>(null);
  const selectedConversacionRef = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversacionRef.current = selectedConversacion?.id || null;
  }, [selectedConversacion?.id]);

  const {
    conversaciones,
    loading,
    hasMore,
    filters,
    loadMore,
    refresh,
    updateFilters,
    updateConversacion,
    addConversacion,
    moveToTop,
  } = useConversations();

  // Socket handlers
  const handleMensajeNuevo = useCallback((conversacionId: number, mensaje: SocketMensajeNuevo) => {
    // Si es la conversación seleccionada, no incrementar no leídos
    const isCurrentConv = conversacionId === selectedConversacionRef.current;

    // Actualizar último mensaje y mover al inicio
    updateConversacion(conversacionId, {
      ultimoMensaje: mensaje.contenido.substring(0, 100),
      updatedAt: mensaje.createdAt,
      // Solo incrementar no leídos si es entrante Y no está seleccionada
      mensajesNoLeidos: (mensaje.direccion === 'ENTRANTE' && !isCurrentConv) ? 1 : 0,
    });
    moveToTop(conversacionId);

    // Si es la conversación seleccionada, pasar el mensaje al chat
    if (isCurrentConv) {
      setNewMessageForChat(mensaje as Mensaje);
    }
  }, [updateConversacion, moveToTop]);

  const handleConversacionActualizada = useCallback((data: SocketConversacionActualizada) => {
    updateConversacion(data.id, data);

    // Si es la conversación seleccionada, actualizar también
    if (selectedConversacion?.id === data.id) {
      setSelectedConversacion((prev) => prev ? { ...prev, ...data } : null);
    }
  }, [updateConversacion, selectedConversacion?.id]);

  const handleConversacionNueva = useCallback((conversacion: Conversacion) => {
    addConversacion(conversacion);
  }, [addConversacion]);

  const handleTyping = useCallback((data: SocketTyping) => {
    setTypingUsers((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(data.conversacionId) || [];

      if (data.isTyping) {
        // Agregar usuario si no está
        if (!current.some((u) => u.odId === data.odId)) {
          newMap.set(data.conversacionId, [...current, { odId: data.odId, nombre: data.nombre }]);
        }
      } else {
        // Remover usuario
        newMap.set(data.conversacionId, current.filter((u) => u.odId !== data.odId));
      }

      return newMap;
    });
  }, []);

  const {
    isConnected,
    connectionError,
    joinConversation,
    leaveConversation,
    sendTyping,
    reconnect,
  } = useInboxSocket({
    onMensajeNuevo: handleMensajeNuevo,
    onConversacionActualizada: handleConversacionActualizada,
    onConversacionNueva: handleConversacionNueva,
    onTyping: handleTyping,
  });

  // Detectar vista móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Join/leave room cuando cambia la conversación seleccionada
  useEffect(() => {
    if (selectedConversacion?.id) {
      joinConversation(selectedConversacion.id);
      return () => {
        leaveConversation(selectedConversacion.id);
      };
    }
  }, [selectedConversacion?.id, joinConversation, leaveConversation]);

  const handleSelectConversacion = useCallback((conversacion: Conversacion) => {
    setSelectedConversacion(conversacion);
    // Limpiar contador de no leídos en la lista (comportamiento WhatsApp)
    if (conversacion.mensajesNoLeidos > 0) {
      updateConversacion(conversacion.id, { mensajesNoLeidos: 0 });
    }
    if (isMobileView) {
      setShowChat(true);
    }
  }, [isMobileView, updateConversacion]);

  const handleBack = useCallback(() => {
    setShowChat(false);
  }, []);

  const handleConversacionUpdate = useCallback((updated: Conversacion) => {
    setSelectedConversacion(updated);
    updateConversacion(updated.id, updated);
  }, [updateConversacion]);

  // Get typing users for selected conversation
  const currentTypingUsers = selectedConversacion
    ? typingUsers.get(selectedConversacion.id) || []
    : [];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
        </div>
        <ConnectionStatus
          isConnected={isConnected}
          error={connectionError}
          onReconnect={reconnect}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Conversation list - hidden on mobile when chat is open */}
        <div
          className={`
            ${isMobileView ? (showChat ? 'hidden' : 'w-full') : 'w-80 lg:w-96'}
            flex-shrink-0 min-h-0
          `}
        >
          <ConversationList
            conversaciones={conversaciones}
            loading={loading}
            hasMore={hasMore}
            filters={filters}
            selectedId={selectedConversacion?.id || null}
            onSelect={handleSelectConversacion}
            onLoadMore={loadMore}
            onRefresh={refresh}
            onFilterChange={updateFilters}
          />
        </div>

        {/* Chat window - full width on mobile when open */}
        <div
          className={`
            ${isMobileView ? (showChat ? 'w-full' : 'hidden') : 'flex-1'}
            flex flex-col min-h-0
          `}
        >
          <ChatWindow
            conversacion={selectedConversacion}
            onBack={isMobileView ? handleBack : undefined}
            onConversacionUpdate={handleConversacionUpdate}
            sendTyping={sendTyping}
            typingUsers={currentTypingUsers}
            isMobile={isMobileView}
            newMessage={newMessageForChat}
          />
        </div>
      </div>
    </div>
  );
}
