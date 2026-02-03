import { Phone, User, Bot, Headphones, MoreVertical, ArrowLeft, Monitor, Smartphone, RefreshCw, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Conversacion, ModoRespuestaHandoff } from '../types/inbox.types';

interface ChatHeaderProps {
  conversacion: Conversacion;
  onBack?: () => void;
  onTomar?: () => void;
  onCerrar?: () => void;
  onTransferir?: () => void;
  onDeleteHistory?: () => void;
  onModoRespuestaChange?: (modo: ModoRespuestaHandoff | null) => void;
  canTomar?: boolean;
  canCerrar?: boolean;
  canTransferir?: boolean;
  isMobile?: boolean;
}

export function ChatHeader({
  conversacion,
  onBack,
  onTomar,
  onCerrar,
  onTransferir,
  onDeleteHistory,
  onModoRespuestaChange,
  canTomar = false,
  canCerrar = false,
  canTransferir = false,
  isMobile = false,
}: ChatHeaderProps) {
  const nombre = conversacion.usuario?.nombre ||
    conversacion.usuario?.nombreWhatsapp ||
    conversacion.telefono;

  const initials = nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const getModoInfo = () => {
    switch (conversacion.modo) {
      case 'BOT':
        return { icon: Bot, label: 'Bot activo', color: 'bg-green-100 text-green-700' };
      case 'HANDOFF':
        return { icon: Headphones, label: `Atendiendo: ${conversacion.derivadaA?.nombre || 'Admin'}`, color: 'bg-blue-100 text-blue-700' };
      case 'PAUSADO':
        return { icon: User, label: 'En espera', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  const modoInfo = getModoInfo();
  const ModoIcon = modoInfo.icon;

  return (
    <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
      {/* Back button (mobile) */}
      {isMobile && onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={conversacion.usuario?.fotoUrl} alt={nombre} />
        <AvatarFallback className="bg-gray-200 text-gray-600">{initials}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{nombre}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', modoInfo.color)}>
            <ModoIcon className="w-3 h-3 mr-1" />
            {modoInfo.label}
          </Badge>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {conversacion.telefono}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {canTomar && conversacion.modo !== 'HANDOFF' && (
          <Button
            size="sm"
            onClick={onTomar}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Headphones className="w-4 h-4 mr-1" />
            Tomar
          </Button>
        )}

        {(canCerrar || canTransferir || onDeleteHistory) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Modo de respuesta */}
              {onModoRespuestaChange && (
                <>
                  <DropdownMenuLabel className="text-xs text-gray-500">
                    Modo de respuesta
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={conversacion.modoRespuesta || conversacion.derivadaA?.modoHandoffDefault || 'WEB'}
                    onValueChange={(value) => onModoRespuestaChange(value === 'DEFAULT' ? null : value as ModoRespuestaHandoff)}
                  >
                    <DropdownMenuRadioItem value="WEB" className="text-sm">
                      <Monitor className="w-4 h-4 mr-2" />
                      Solo Web
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="WHATSAPP" className="text-sm">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Solo WhatsApp
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="AMBOS" className="text-sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Ambos
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                </>
              )}

              {canTransferir && (
                <DropdownMenuItem onClick={onTransferir}>
                  Transferir conversación
                </DropdownMenuItem>
              )}
              {canCerrar && (
                <>
                  {canTransferir && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={onCerrar} className="text-red-600">
                    Cerrar handoff
                  </DropdownMenuItem>
                </>
              )}
              {onDeleteHistory && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDeleteHistory} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar historial
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
