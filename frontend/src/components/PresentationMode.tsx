import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import { resolveSceneTheme } from '@/lib/obs-scene-export';
import { buildSourceTabs } from '@/components/OBSThemeEditor';
import type { SceneData, SourceTab } from '@/components/OBSThemeEditor';
import type { OBSThemeWithOverrides } from '@/types';

interface PresentationModeProps {
  scenes: SceneData[];
  theme: OBSThemeWithOverrides;
  onExit: () => void;
}

interface FlatSlide {
  sceneIndex: number;
  sceneName: string;
  sourceIndex: number;
  source: SourceTab;
}

export default function PresentationMode({ scenes, theme, onExit }: PresentationModeProps) {
  // Flatten all sources into a linear sequence
  const flatSlides = useMemo<FlatSlide[]>(() => {
    const slides: FlatSlide[] = [];
    scenes.forEach((scene, sceneIdx) => {
      const resolved = resolveSceneTheme(theme, scene.parteId);
      const sources = buildSourceTabs(scene, resolved);
      sources.forEach((src, srcIdx) => {
        slides.push({
          sceneIndex: sceneIdx,
          sceneName: scene.nombre,
          sourceIndex: srcIdx,
          source: src,
        });
      });
    });
    return slides;
  }, [scenes, theme]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [hudVisible, setHudVisible] = useState(true);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeIndex = Math.min(currentSlideIndex, flatSlides.length - 1);
  const current = flatSlides[safeIndex];

  // Fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // HUD auto-hide
  const showHud = useCallback(() => {
    setHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), 2000);
  }, []);

  useEffect(() => {
    showHud();
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [showHud]);

  const goNext = useCallback(() => {
    setCurrentSlideIndex((i) => Math.min(flatSlides.length - 1, i + 1));
    showHud();
  }, [flatSlides.length, showHud]);

  const goPrev = useCallback(() => {
    setCurrentSlideIndex((i) => Math.max(0, i - 1));
    showHud();
  }, [showHud]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'Backspace':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
        case 'Home':
          e.preventDefault();
          setCurrentSlideIndex(0);
          showHud();
          break;
        case 'End':
          e.preventDefault();
          setCurrentSlideIndex(flatSlides.length - 1);
          showHud();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onExit, flatSlides.length, showHud]);

  // Mouse click navigation
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking the exit button
      if ((e.target as HTMLElement).closest('[data-exit-btn]')) return;
      if (e.button === 2 || e.clientX > window.innerWidth / 2) {
        goNext();
      } else {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  // Mouse move shows HUD
  const handleMouseMove = useCallback(() => {
    showHud();
  }, [showHud]);

  // Preview scale
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const sx = width / 1920;
      const sy = height / 1080;
      setScale(Math.min(sx, sy));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!current) return null;

  const progress = flatSlides.length > 1
    ? ((safeIndex) / (flatSlides.length - 1)) * 100
    : 100;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center cursor-none"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Content */}
      <div ref={previewRef} className="relative w-full h-full">
        {current.source.type === 'foto' ? (
          <img
            src={current.source.content}
            alt={current.source.label}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : current.source.isIframeSrc ? (
          <iframe
            key={`pres-${safeIndex}-src`}
            src={current.source.content}
            title={current.source.label}
            className="absolute bg-black"
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay; encrypted-media"
            style={{
              width: 1920,
              height: 1080,
              border: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              top: '50%',
              left: '50%',
              marginTop: -(1080 * scale) / 2,
              marginLeft: -(1920 * scale) / 2,
              pointerEvents: current.source.allowInteraction ? 'auto' : 'none',
            }}
          />
        ) : (
          <iframe
            key={`pres-${safeIndex}-doc`}
            srcDoc={current.source.content}
            title={current.source.label}
            sandbox=""
            className="absolute bg-black pointer-events-none"
            style={{
              width: 1920,
              height: 1080,
              border: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              top: '50%',
              left: '50%',
              marginTop: -(1080 * scale) / 2,
              marginLeft: -(1920 * scale) / 2,
            }}
          />
        )}
      </div>

      {/* HUD overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 cursor-default ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-neutral-800">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Info bar */}
        <div className="bg-gradient-to-t from-black/80 to-transparent px-6 py-3 flex items-center justify-between">
          <div className="text-white/70 text-sm">
            <span className="text-white/90 font-medium">{current.sceneName}</span>
            {current.source.type !== 'slide' && (
              <span className="ml-2 text-white/50">/ {current.source.label}</span>
            )}
          </div>
          <span className="text-white/50 text-sm tabular-nums">
            {safeIndex + 1} / {flatSlides.length}
          </span>
        </div>
      </div>

      {/* Exit button */}
      <button
        data-exit-btn
        type="button"
        onClick={onExit}
        className={`absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white/60 hover:text-white transition-opacity duration-300 cursor-pointer ${
          hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
