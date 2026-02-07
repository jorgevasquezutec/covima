import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PwaInstallBannerProps {
  isIos: boolean;
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({
  isIos,
  canInstall,
  onInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden animate-in slide-in-from-bottom duration-300">
      <div className="bg-white border-t shadow-lg px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">JA</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Instalar Covima</p>
            {isIos ? (
              <p className="text-xs text-gray-500 mt-0.5">
                Toca{' '}
                <Share className="inline h-3.5 w-3.5 -mt-0.5 text-blue-600" />{' '}
                y luego "Agregar a inicio"
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                Acceso directo desde tu celular
              </p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="shrink-0 p-1 -mt-0.5 -mr-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Install button (Android/Chrome only) */}
        {canInstall && !isIos && (
          <Button
            onClick={onInstall}
            className="w-full mt-3 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Instalar
          </Button>
        )}
      </div>
    </div>
  );
}
