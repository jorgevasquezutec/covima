import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  nivel?: { numero: number; nombre: string } | null;
  insignias?: Array<{ codigo: string; nombre: string; icono: string }>;
}

export function LevelUpModal({ open, onClose, nivel, insignias }: LevelUpModalProps) {

  if (!nivel && (!insignias || insignias.length === 0)) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {nivel ? '🎉 ¡Subiste de nivel!' : '🏆 ¡Logro desbloqueado!'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {nivel && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl animate-bounce">🌟</div>
              <div>
                <p className="text-3xl font-bold">{nivel.nombre}</p>
                <p className="text-muted-foreground">Nivel {nivel.numero}</p>
              </div>
            </div>
          )}

          {insignias && insignias.length > 0 && (
            <div className="space-y-4">
              {nivel && <div className="border-t pt-4" />}
              <p className="font-semibold text-lg">
                {nivel ? 'Además desbloqueaste:' : 'Desbloqueaste:'}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {insignias.map((insignia) => (
                  <div key={insignia.codigo} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="text-4xl">{insignia.icono}</span>
                    <span className="font-medium text-sm">{insignia.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full">
          ¡Genial!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
