import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  isConnected: boolean;
  error?: string | null;
  onReconnect?: () => void;
}

export function ConnectionStatus({ isConnected, error, onReconnect }: ConnectionStatusProps) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Wifi className="w-3.5 h-3.5" />
        <span>Conectado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <WifiOff className="w-3.5 h-3.5" />
        <span>{error || 'Desconectado'}</span>
      </div>
      {onReconnect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reconectar
        </Button>
      )}
    </div>
  );
}
