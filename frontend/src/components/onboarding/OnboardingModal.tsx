import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const TOTAL_SLIDES = 6;

function SlideIntro() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <span className="text-7xl animate-bounce">🎮</span>
      <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Sistema de Puntos JA
      </h2>
      <p className="text-gray-500 text-base sm:text-lg max-w-sm">
        ¡Gana puntos, sube de nivel y compite con tu sociedad!
      </p>
    </div>
  );
}

function SlidePuntos() {
  const cards = [
    { emoji: '📅', titulo: 'Asistencia', puntos: '+1 a +5', desc: 'pts por venir', color: 'from-green-50 to-emerald-50 border-green-200' },
    { emoji: '🎤', titulo: 'Participación', puntos: '+3 a +10', desc: 'pts por participar', color: 'from-purple-50 to-violet-50 border-purple-200' },
    { emoji: '⛺', titulo: 'Eventos', puntos: '+3 a +20', desc: 'pts especiales', color: 'from-amber-50 to-yellow-50 border-amber-200' },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">¿Cómo gano puntos?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {cards.map((card) => (
          <div
            key={card.titulo}
            className={`bg-gradient-to-br ${card.color} border rounded-xl p-4 flex flex-col items-center gap-2`}
          >
            <span className="text-3xl">{card.emoji}</span>
            <p className="font-semibold text-gray-900 text-sm">{card.titulo}</p>
            <p className="text-xl font-bold text-green-600">{card.puntos}</p>
            <p className="text-xs text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideRacha() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <span className="text-7xl">🔥</span>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">¡Mantén tu Racha!</h2>
      <div className="flex items-center gap-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-orange-500">7</p>
          <p className="text-sm text-gray-500 mt-1">Racha Actual</p>
        </div>
        <div className="w-px h-16 bg-orange-200" />
        <div className="text-center">
          <p className="text-4xl font-bold text-yellow-500">12</p>
          <p className="text-sm text-gray-500 mt-1">Mejor Racha</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 max-w-xs">
        Cada semana que vienes consecutivamente suma a tu racha. ¡No la pierdas!
      </p>
    </div>
  );
}

function SlideNiveles() {
  const niveles = [
    { icono: '🌱', nombre: 'Discípulo', activo: true },
    { icono: '🤝', nombre: 'Diácono', activo: false },
    { icono: '📖', nombre: 'Anciano', activo: false },
    { icono: '🎵', nombre: 'Levita', activo: false },
    { icono: '🙏', nombre: 'Sacerdote', activo: false },
    { icono: '🕊️', nombre: 'Serafín', activo: false },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">⬆️ Sube de Nivel</h2>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {niveles.map((nivel, i) => (
          <div key={nivel.nombre} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 flex items-center justify-center text-2xl bg-white shadow-sm ${nivel.activo
                    ? 'border-blue-500 shadow-blue-200 shadow-md'
                    : 'border-gray-200 opacity-50 grayscale'
                  }`}
              >
                {nivel.icono}
              </div>
              <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{nivel.nombre}</span>
            </div>
            {i < niveles.length - 1 && (
              <span className="text-gray-300 text-sm">→</span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">Y más: Profeta, Apóstol, Evangelista, Querubín...</p>
      <div className="w-full max-w-xs bg-white rounded-lg p-3 border">
        <p className="text-xs text-gray-600 mb-2">Tu progreso hacia el siguiente nivel</p>
        <Progress value={65} className="h-2.5" />
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>250 XP</span>
          <span>Meta: 400 XP</span>
        </div>
      </div>
    </div>
  );
}

function SlideRanking() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🏆 Ranking Trimestral</h2>
      <div className="flex items-end gap-4">
        {/* 2do lugar */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl text-white border-3 border-gray-400">
            👤
          </div>
          <p className="text-xs font-medium mt-1">María G.</p>
          <p className="text-xs text-green-600 font-bold">285 pts</p>
          <div className="w-16 h-16 rounded-t-lg bg-gradient-to-b from-gray-400 to-gray-500 flex items-center justify-center text-white text-xl font-bold mt-1">
            2
          </div>
        </div>
        {/* 1er lugar */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl text-white border-3 border-yellow-400">
            👤
          </div>
          <p className="text-xs font-medium mt-1">Carlos R.</p>
          <p className="text-xs text-green-600 font-bold">342 pts</p>
          <div className="w-16 h-24 rounded-t-lg bg-gradient-to-b from-yellow-400 to-yellow-500 flex items-center justify-center text-white text-2xl font-bold mt-1">
            1
          </div>
        </div>
        {/* 3er lugar */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl text-white border-3 border-amber-600">
            👤
          </div>
          <p className="text-xs font-medium mt-1">Ana L.</p>
          <p className="text-xs text-green-600 font-bold">251 pts</p>
          <div className="w-16 h-12 rounded-t-lg bg-gradient-to-b from-amber-600 to-amber-700 flex items-center justify-center text-white text-xl font-bold mt-1">
            3
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500 max-w-xs">
        El ranking se reinicia cada trimestre. ¿Llegarás al Top 3?
      </p>
    </div>
  );
}

function SlideCTA() {
  const items = [
    { emoji: '✅', texto: 'Participa del ministerio JA' },
    { emoji: '🎤', texto: 'Colabora en el programa' },
    { emoji: '🔥', texto: 'Mantén tu racha semanal' },
    { emoji: '🏆', texto: '¡Compite en el ranking!' },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-4">
      <span className="text-6xl">🚀</span>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">¡Empieza a ganar puntos!</h2>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 w-full max-w-sm">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.texto} className="flex items-center gap-3 text-left">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-sm text-gray-700">{item.texto}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        ¡Te esperamos!
      </p>
    </div>
  );
}

const SLIDES = [SlideIntro, SlidePuntos, SlideRacha, SlideNiveles, SlideRanking, SlideCTA];

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      onClose();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlide((s) => s - 1);
    }
  };

  const CurrentSlide = SLIDES[currentSlide];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <CurrentSlide />

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide
                  ? 'bg-indigo-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
                }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={isFirstSlide}
            className="text-gray-500"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {isLastSlide ? (
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6"
            >
              ¡Empezar!
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 text-center transition-colors"
        >
          Omitir
        </button>
      </DialogContent>
    </Dialog>
  );
}
