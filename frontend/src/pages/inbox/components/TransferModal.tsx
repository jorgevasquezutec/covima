import { useState, useEffect } from 'react';
import { Loader2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { inboxApi } from '@/services/api';
import type { AdminDisponible } from '../types/inbox.types';

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (adminId: number, mensajeContexto?: string) => Promise<void>;
  currentAdminId?: number;
}

export function TransferModal({
  open,
  onOpenChange,
  onTransfer,
  currentAdminId,
}: TransferModalProps) {
  const [admins, setAdmins] = useState<AdminDisponible[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [mensajeContexto, setMensajeContexto] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (open) {
      loadAdmins();
    } else {
      // Reset state when modal closes
      setSelectedAdminId(null);
      setMensajeContexto('');
    }
  }, [open]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await inboxApi.getAdminsDisponibles();
      // Filtrar el admin actual
      setAdmins(data.filter((a) => a.id !== currentAdminId));
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAdminId) return;

    setTransferring(true);
    try {
      await onTransfer(selectedAdminId, mensajeContexto || undefined);
      onOpenChange(false);
    } finally {
      setTransferring(false);
    }
  };

  const getInitials = (nombre: string) =>
    nombre
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Transferir conversación
          </DialogTitle>
          <DialogDescription>
            Selecciona el administrador al que deseas transferir esta conversación.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay otros administradores disponibles
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {admins.map((admin) => (
                  <button
                    key={admin.id}
                    onClick={() => setSelectedAdminId(admin.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left
                      ${
                        selectedAdminId === admin.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={admin.fotoUrl} alt={admin.nombre} />
                      <AvatarFallback className="bg-gray-200 text-gray-600">
                        {getInitials(admin.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{admin.nombre}</p>
                      <p className="text-sm text-gray-500">{admin.rol}</p>
                    </div>
                    {selectedAdminId === admin.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedAdminId && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje de contexto (opcional)
                  </label>
                  <Textarea
                    value={mensajeContexto}
                    onChange={(e) => setMensajeContexto(e.target.value)}
                    placeholder="Añade información relevante para el siguiente administrador..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transferring}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedAdminId || transferring}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {transferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transfiriendo...
              </>
            ) : (
              'Transferir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
