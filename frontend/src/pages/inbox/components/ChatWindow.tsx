import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { inboxApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TransferModal } from './TransferModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useMessages, useSendMessage, useTypingIndicator } from '../hooks';
import type { Conversacion, Mensaje, ModoRespuestaHandoff } from '../types/inbox.types';

interface ChatWindowProps {
  conversacion: Conversacion | null;
  onBack?: () => void;
  onConversacionUpdate?: (conversacion: Conversacion) => void;
  sendTyping: (conversacionId: number, isTyping: boolean) => void;
  typingUsers?: { odId: number; nombre: string }[];
  isMobile?: boolean;
  newMessage?: Mensaje | null;
}

export function ChatWindow({
  conversacion,
  onBack,
  onConversacionUpdate,
  sendTyping,
  typingUsers = [],
  isMobile = false,
  newMessage,
}: ChatWindowProps) {
  const { user } = useAuthStore();
  const [showTomarConfirm, setShowTomarConfirm] = useState(false);
  const [showCerrarConfirm, setShowCerrarConfirm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const lastMessageIdRef = useRef<number | null>(null);

  const {
    mensajes,
    loading: loadingMensajes,
    loadingMore,
    hasMore,
    fetchMensajes,
    loadMore,
    addMensaje,
    clear: clearMensajes,
  } = useMessages(conversacion?.id || null);

  const { sendMessage, sending } = useSendMessage({
    onSuccess: (mensaje) => {
      addMensaje(mensaje);
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const { typingText, handleInputChange, stopTyping } = useTypingIndicator({
    sendTyping,
  });

  // Cargar mensajes cuando cambia la conversación
  useEffect(() => {
    if (conversacion?.id) {
      clearMensajes();
      fetchMensajes(true);
      lastMessageIdRef.current = null;

      // Marcar como leído
      inboxApi.marcarComoLeido(conversacion.id).catch(console.error);
    }
  }, [conversacion?.id]);

  // Agregar mensaje nuevo del WebSocket
  useEffect(() => {
    if (newMessage && newMessage.id !== lastMessageIdRef.current) {
      addMensaje(newMessage);
      lastMessageIdRef.current = newMessage.id;

      // Marcar como leído si está viendo esta conversación
      if (conversacion?.id) {
        inboxApi.marcarComoLeido(conversacion.id).catch(console.error);
      }
    }
  }, [newMessage, addMensaje, conversacion?.id]);

  // Calcular typingText desde typingUsers externos
  const externalTypingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].nombre} está escribiendo...`
      : `${typingUsers.map((u) => u.nombre).join(', ')} están escribiendo...`
    : null;

  const handleSend = useCallback(async (content: string) => {
    if (!conversacion) return;

    stopTyping(conversacion.id);
    await sendMessage(conversacion.id, content);
  }, [conversacion, sendMessage, stopTyping]);

  const handleTyping = useCallback((hasText: boolean) => {
    if (conversacion) {
      handleInputChange(conversacion.id, hasText);
    }
  }, [conversacion, handleInputChange]);

  const handleTomarClick = useCallback(() => {
    setShowTomarConfirm(true);
  }, []);

  const handleTomarConfirm = useCallback(async () => {
    if (!conversacion) return;

    setActionLoading(true);
    try {
      const result = await inboxApi.tomarConversacion(conversacion.id);
      onConversacionUpdate?.(result.conversacion);
      toast.success('Conversación tomada');
      setShowTomarConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al tomar conversación');
    } finally {
      setActionLoading(false);
    }
  }, [conversacion, onConversacionUpdate]);

  const handleCerrarClick = useCallback(() => {
    setShowCerrarConfirm(true);
  }, []);

  const handleCerrarConfirm = useCallback(async () => {
    if (!conversacion) return;

    setActionLoading(true);
    try {
      await inboxApi.cerrarHandoff(conversacion.id);
      onConversacionUpdate?.({
        ...conversacion,
        modo: 'BOT',
        derivadaA: null,
        derivadaAt: undefined,
      });
      toast.success('Handoff cerrado');
      setShowCerrarConfirm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cerrar handoff');
    } finally {
      setActionLoading(false);
    }
  }, [conversacion, onConversacionUpdate]);

  const handleTransferClick = useCallback(() => {
    setShowTransferModal(true);
  }, []);

  const handleTransfer = useCallback(async (adminId: number, mensajeContexto?: string) => {
    if (!conversacion) return;

    try {
      await inboxApi.transferirConversacion(conversacion.id, { adminId, mensajeContexto });
      onConversacionUpdate?.({
        ...conversacion,
        modo: 'HANDOFF',
        derivadaA: { id: adminId, nombre: 'Transferido' },
      });
      toast.success('Conversación transferida');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al transferir conversación');
      throw err;
    }
  }, [conversacion, onConversacionUpdate]);

  const handleModoRespuestaChange = useCallback(async (modo: ModoRespuestaHandoff | null) => {
    if (!conversacion) return;

    try {
      const updated = await inboxApi.actualizarModoRespuesta(conversacion.id, modo);
      onConversacionUpdate?.(updated);
      const modoLabel = modo === 'WEB' ? 'Solo Web' : modo === 'WHATSAPP' ? 'Solo WhatsApp' : 'Ambos';
      toast.success(`Modo de respuesta: ${modoLabel}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cambiar modo');
    }
  }, [conversacion, onConversacionUpdate]);

  // Verificar permisos
  const isMyHandoff = conversacion?.modo === 'HANDOFF' &&
    conversacion?.derivadaA?.id === user?.id;

  const canTomar = conversacion?.modo !== 'HANDOFF';
  const canCerrar = isMyHandoff;
  const canTransferir = isMyHandoff;
  const canSendMessage = isMyHandoff;

  if (!conversacion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">Selecciona una conversación</p>
        <p className="text-sm mt-1">Elige una conversación de la lista para ver los mensajes</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
      <ChatHeader
        conversacion={conversacion}
        onBack={onBack}
        onTomar={handleTomarClick}
        onCerrar={handleCerrarClick}
        onTransferir={handleTransferClick}
        onModoRespuestaChange={isMyHandoff ? handleModoRespuestaChange : undefined}
        canTomar={canTomar}
        canCerrar={canCerrar}
        canTransferir={canTransferir}
        isMobile={isMobile}
      />

      <MessageList
        mensajes={mensajes}
        loading={loadingMensajes}
        loadingMore={loadingMore}
        hasMore={hasMore}
        typingText={externalTypingText || typingText}
        onLoadMore={loadMore}
      />

      {canSendMessage ? (
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          sending={sending}
          placeholder="Escribe un mensaje al usuario..."
        />
      ) : (
        <div className="p-4 border-t border-gray-200 bg-yellow-50 text-center flex-shrink-0">
          <p className="text-sm text-yellow-700">
            {conversacion.modo === 'BOT'
              ? 'Toma la conversación para responder al usuario'
              : conversacion.modo === 'HANDOFF'
              ? 'Esta conversación está siendo atendida por otro administrador'
              : 'La conversación está en espera'}
          </p>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showTomarConfirm}
        onOpenChange={setShowTomarConfirm}
        onConfirm={handleTomarConfirm}
        title="Tomar conversación"
        description="Vas a tomar esta conversación. El bot dejará de responder y podrás chatear directamente con el usuario."
        confirmText="Tomar conversación"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showCerrarConfirm}
        onOpenChange={setShowCerrarConfirm}
        onConfirm={handleCerrarConfirm}
        title="Cerrar handoff"
        description="Vas a devolver esta conversación al bot. El usuario podrá seguir interactuando con el chatbot automáticamente."
        confirmText="Cerrar handoff"
        variant="destructive"
        loading={actionLoading}
      />

      {/* Transfer Modal */}
      <TransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        onTransfer={handleTransfer}
        currentAdminId={user?.id}
      />
    </div>
  );
}
