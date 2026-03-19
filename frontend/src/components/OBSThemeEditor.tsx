import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Download, ArrowLeft, Save, Play, X, Image, Undo2, Palette, ChevronDown, Lock, Unlock, Move, Eye, EyeOff } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DEFAULT_OBS_THEME,
  DEFAULT_ELEMENT_POSITIONS,
  buildSlideHtmlPublic,
  resolveSceneTheme,
  isYouTubeUrl,
  normalizeYouTubeUrl,
  isBibleUrl,
  parseBibleGatewayUrl,
  buildBibleSlideUrl,
  getServerUrl,
} from '@/lib/obs-scene-export';
import MediaPickerDialog from '@/components/MediaPickerDialog';
import PresentationMode from '@/components/PresentationMode';
import SlideLayoutOverlay from '@/components/SlideLayoutOverlay';
import type { OBSTheme, OBSThemeWithOverrides, OBSElementId, OBSElementLayout } from '@/types';

// ── Remove white background via Canvas ──────────────────────────────

async function removeWhiteBackground(imageUrl: string): Promise<string> {
  // Convert absolute backend URLs to relative paths so they go through the Vite proxy
  let fetchUrl = imageUrl;
  try {
    const u = new URL(imageUrl);
    if (u.hostname === 'localhost' || u.hostname === window.location.hostname) {
      fetchUrl = u.pathname;
    }
  } catch {
    // already a relative path, fine
  }

  const response = await fetch(fetchUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise<string>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const threshold = 240;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r >= threshold && g >= threshold && b >= threshold) {
          data[i + 3] = 0;
        } else {
          const brightness = (r + g + b) / 3;
          if (brightness > 200) {
            const factor = 1 - (brightness - 200) / (threshold - 200);
            data[i + 3] = Math.round(data[i + 3] * Math.max(0, factor));
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = blobUrl;
  });
}

// ── Scaled Iframe ────────────────────────────────────────────────────

export function ScaledIframe({
  srcDoc,
  className,
  title,
  style,
}: {
  srcDoc: string;
  className?: string;
  title: string;
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setScale(width / 1920);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ overflow: 'hidden', ...style }}>
      <iframe
        srcDoc={srcDoc}
        title={title}
        sandbox=""
        tabIndex={-1}
        className="pointer-events-none"
        style={{
          width: 1920,
          height: 1080,
          border: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}

// ── Color Picker ──────────────────────────────────────────────────────

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRevert?: () => void;
}

function ColorPickerField({ label, value, onChange, onRevert }: ColorPickerFieldProps) {
  const hexValue = value.startsWith('#') ? value : '#ffffff';

  return (
    <div className="flex items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-8 h-8 rounded-md border border-neutral-600 shadow-sm cursor-pointer flex-shrink-0"
            style={{ backgroundColor: value }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start" side="left">
          <HexColorPicker color={hexValue} onChange={onChange} />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 h-7 text-xs font-mono"
          />
        </PopoverContent>
      </Popover>
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-neutral-400">{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono bg-neutral-800 border-neutral-700 text-neutral-200"
        />
      </div>
      {onRevert && (
        <button
          type="button"
          onClick={onRevert}
          className="text-neutral-500 hover:text-neutral-300 p-1 shrink-0"
          title="Volver al valor global"
        >
          <Undo2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Background Image Field ──────────────────────────────────────────

function BackgroundImageField({
  value,
  onChange,
  onRevert,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  onRevert?: () => void;
}) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-neutral-400">Imagen de fondo</Label>
        {onRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="text-neutral-500 hover:text-neutral-300 p-0.5"
            title="Volver al valor global"
          >
            <Undo2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {value ? (
        <div className="relative group">
          <img
            src={value.startsWith('/') ? getServerUrl(value) : value}
            alt="Fondo"
            className="w-full h-20 object-cover rounded-md border border-neutral-700"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute top-1 right-1 bg-black/70 hover:bg-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Input
            placeholder="URL de imagen..."
            className="h-7 text-xs bg-neutral-800 border-neutral-700 text-neutral-200 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) onChange(val);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-neutral-400 hover:text-neutral-200"
            onClick={() => setMediaPickerOpen(true)}
          >
            <Image className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(item) => {
          onChange(item.url);
          setMediaPickerOpen(false);
        }}
      />
    </div>
  );
}

// ── Logo Field ───────────────────────────────────────────────────────

function LogoField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-400">Logo</Label>
      {value ? (
        <div className="relative group flex items-center gap-2">
          <img
            src={value.startsWith('/') ? getServerUrl(value) : value}
            alt="Logo"
            className="h-12 w-12 object-contain rounded-md border border-neutral-700 bg-neutral-800 p-1"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-neutral-500 hover:text-neutral-300 text-xs"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Input
            placeholder="URL de imagen..."
            className="h-7 text-xs bg-neutral-800 border-neutral-700 text-neutral-200 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) onChange(val);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-neutral-400 hover:text-neutral-200"
            onClick={() => setMediaPickerOpen(true)}
          >
            <Image className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(item) => {
          onChange(item.url);
          setMediaPickerOpen(false);
        }}
      />
    </div>
  );
}

// ── Override Row (per-scene lock/unlock) ─────────────────────────────

function OverrideRow({
  label,
  isColor,
  globalValue,
  overrideValue,
  onOverride,
  onRevert,
}: {
  label: string;
  isColor?: boolean;
  globalValue: string | undefined;
  overrideValue: string | undefined;
  onOverride: (value: string | undefined) => void;
  onRevert: () => void;
}) {
  const hasOverride = overrideValue !== undefined;

  if (!hasOverride) {
    // Locked: compact dimmed row, click to unlock
    return (
      <button
        type="button"
        onClick={() => onOverride(globalValue)}
        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-left hover:bg-neutral-800/60 transition-colors group"
      >
        <Lock className="h-3 w-3 text-neutral-600 group-hover:text-neutral-400 shrink-0" />
        {isColor ? (
          <>
            <span
              className="w-5 h-5 rounded border border-neutral-700 shrink-0 opacity-50"
              style={{ backgroundColor: globalValue }}
            />
            <span className="text-xs text-neutral-500 truncate">{label}</span>
          </>
        ) : globalValue ? (
          <>
            <span className="text-xs text-neutral-500 truncate flex-1">{label}</span>
            <img
              src={globalValue.startsWith('/') ? getServerUrl(globalValue) : globalValue}
              alt=""
              className="h-6 w-10 rounded border border-neutral-700 object-cover shrink-0 opacity-50"
            />
          </>
        ) : (
          <>
            <span className="w-5 h-5 rounded border border-neutral-700 border-dashed shrink-0 opacity-50 flex items-center justify-center">
              <Image className="h-3 w-3 text-neutral-600" />
            </span>
            <span className="text-xs text-neutral-500 truncate">{label}</span>
          </>
        )}
      </button>
    );
  }

  // Unlocked: expanded editable field with revert button
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Unlock className="h-3 w-3 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300 font-medium">{label}</span>
        </div>
        <button
          type="button"
          onClick={onRevert}
          className="text-neutral-500 hover:text-neutral-300 p-0.5"
          title="Volver al valor global"
        >
          <Undo2 className="h-3 w-3" />
        </button>
      </div>
      {isColor ? (
        <ColorPickerField
          label=""
          value={overrideValue ?? globalValue ?? '#ffffff'}
          onChange={(v) => onOverride(v)}
        />
      ) : (
        <BackgroundImageField
          value={overrideValue ?? globalValue}
          onChange={(url) => onOverride(url)}
        />
      )}
    </div>
  );
}

// ── Scene Data ────────────────────────────────────────────────────────

export interface SceneData {
  nombre: string;
  parteId?: number;
  visitas?: string[];
  links?: { nombre: string; url?: string | null; mediaUrl?: string | null }[];
  fotos?: { url: string; nombre?: string }[];
}

export type SlideData = SceneData;

// ── Source helpers ────────────────────────────────────────────────────

export interface SourceTab {
  label: string;
  type: 'slide' | 'youtube' | 'bible' | 'link' | 'foto' | 'media';
  content: string;
  isIframeSrc?: boolean;
  allowInteraction?: boolean;
}

export function buildSourceTabs(scene: SceneData, theme: OBSTheme): SourceTab[] {
  const tabs: SourceTab[] = [];

  tabs.push({
    label: 'Slide',
    type: 'slide',
    content: buildSlideHtmlPublic({
      title: scene.nombre,
      items: scene.visitas,
      theme,
    }),
  });

  if (scene.links) {
    for (const link of scene.links) {
      const url = link.url || '';
      if (link.mediaUrl) {
        const mediaFullUrl = getServerUrl(link.mediaUrl);
        tabs.push({
          label: link.nombre || 'Video',
          type: 'media',
          content: mediaFullUrl,
          isIframeSrc: true,
          allowInteraction: true,
        });
      } else if (!url) {
        // No URL and no media — skip
        continue;
      } else if (isYouTubeUrl(url)) {
        const ytUrl = normalizeYouTubeUrl(url);
        if (ytUrl) {
          const videoId = new URL(ytUrl).searchParams.get('v');
          tabs.push({
            label: link.nombre || 'YouTube',
            type: 'youtube',
            content: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
            isIframeSrc: true,
            allowInteraction: true,
          });
        }
      } else if (isBibleUrl(url)) {
        const parsed = parseBibleGatewayUrl(url);
        const ref = parsed?.search || link.nombre || 'Lectura';
        const ver = parsed?.version || 'NVI';
        tabs.push({
          label: link.nombre || 'Biblia',
          type: 'bible',
          content: buildBibleSlideUrl(ref, ver),
          isIframeSrc: true,
        });
      } else {
        tabs.push({
          label: link.nombre || 'Link',
          type: 'link',
          content: url,
          isIframeSrc: true,
        });
      }
    }
  }

  if (scene.fotos) {
    scene.fotos.forEach((foto, i) => {
      const url = getServerUrl(foto.url);
      tabs.push({
        label: foto.nombre || `Foto ${i + 1}`,
        type: 'foto',
        content: url,
      });
    });
  }

  return tabs;
}

// ── Props ─────────────────────────────────────────────────────────────

interface OBSThemeEditorProps {
  partes: SceneData[];
  theme: OBSThemeWithOverrides;
  onChange: (theme: OBSThemeWithOverrides) => void;
  onSave?: (theme: OBSThemeWithOverrides) => void;
  onExport?: () => void;
  onBack: () => void;
  open?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────

export default function OBSThemeEditor({
  partes,
  theme,
  onChange,
  onSave,
  onExport,
  onBack,
  open,
}: OBSThemeEditorProps) {
  if (open !== undefined && !open) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeSource, setActiveSource] = useState(0);
  const [saving, setSaving] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [globalOpen, setGlobalOpen] = useState(true);
  const [sceneOpen, setSceneOpen] = useState(true);
  const [editLayoutMode, setEditLayoutMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<OBSElementId | null>(null);

  const scenes = partes.length > 0 ? partes : [{ nombre: 'Bienvenida' }];
  const safeIndex = Math.min(currentIndex, scenes.length - 1);
  const currentScene = scenes[safeIndex];
  const hasParteId = !!currentScene.parteId;
  const sceneOverride = hasParteId ? theme.sceneOverrides?.[currentScene.parteId!] : undefined;

  useEffect(() => {
    setActiveSource(0);
  }, [safeIndex]);

  // Auto-save theme with debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestThemeRef = useRef(theme);
  latestThemeRef.current = theme;

  const triggerSave = useCallback(() => {
    if (!onSave) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      onSave(latestThemeRef.current);
      setTimeout(() => setSaving(false), 800);
    }, 1000);
  }, [onSave]);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => () => {
    // Flush pending save on unmount instead of discarding it
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      onSaveRef.current?.(latestThemeRef.current);
    }
  }, []);

  // Process logo to remove white background when logoRemoveBg is toggled
  const processedLogoCache = useRef<{ url: string; dataUrl: string } | null>(null);

  useEffect(() => {
    if (!theme.logoRemoveBg || !theme.logoUrl) {
      // Clear processed URL when disabled
      if (theme._processedLogoUrl) {
        onChange({ ...theme, _processedLogoUrl: undefined });
      }
      return;
    }

    const logoUrl = theme.logoUrl.startsWith('/')
      ? getServerUrl(theme.logoUrl)
      : theme.logoUrl;

    // Use cache if same URL
    if (processedLogoCache.current?.url === logoUrl) {
      if (theme._processedLogoUrl !== processedLogoCache.current.dataUrl) {
        onChange({ ...theme, _processedLogoUrl: processedLogoCache.current.dataUrl });
      }
      return;
    }

    removeWhiteBackground(logoUrl).then((dataUrl) => {
      processedLogoCache.current = { url: logoUrl, dataUrl };
      onChange({ ...latestThemeRef.current, _processedLogoUrl: dataUrl });
    }).catch((err) => {
      console.error('Error removing logo background:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.logoRemoveBg, theme.logoUrl]);

  const updateGlobal = useCallback(
    (partial: Partial<OBSTheme>) => {
      onChange({ ...theme, ...partial });
      triggerSave();
    },
    [theme, onChange, triggerSave],
  );

  const updateSceneOverride = useCallback(
    (parteId: number, partial: Partial<OBSTheme>) => {
      const overrides = { ...theme.sceneOverrides };
      overrides[parteId] = { ...(overrides[parteId] || {}), ...partial };
      onChange({ ...theme, sceneOverrides: overrides });
      triggerSave();
    },
    [theme, onChange, triggerSave],
  );

  const clearSceneOverride = useCallback(
    (parteId: number, field?: keyof OBSTheme) => {
      const overrides = { ...theme.sceneOverrides };
      if (field) {
        const current = { ...overrides[parteId] };
        delete current[field];
        if (Object.keys(current).length === 0) {
          delete overrides[parteId];
        } else {
          overrides[parteId] = current;
        }
      } else {
        delete overrides[parteId];
      }
      const hasAny = Object.keys(overrides).length > 0;
      onChange({ ...theme, sceneOverrides: hasAny ? overrides : undefined });
      triggerSave();
    },
    [theme, onChange, triggerSave],
  );

  const handleReset = () => {
    onChange({ ...DEFAULT_OBS_THEME });
    triggerSave();
  };

  const handleEnterLayoutMode = useCallback(() => {
    // Don't initialize elementLayout yet — keep flexbox until user drags
    setEditLayoutMode(true);
    setSelectedElement(null);
  }, []);

  const handleExitLayoutMode = useCallback(() => {
    setEditLayoutMode(false);
    setSelectedElement(null);
  }, []);

  const handleLayoutChange = useCallback(
    (id: OBSElementId, partial: Partial<OBSElementLayout>) => {
      // Initialize all positions on first interaction (switches from flexbox to absolute)
      const current = theme.elementLayout ?? { ...DEFAULT_ELEMENT_POSITIONS };
      const existing = current[id] ?? DEFAULT_ELEMENT_POSITIONS[id];
      const updated = { ...current, [id]: { ...existing, ...partial } };
      onChange({ ...theme, elementLayout: updated });
      triggerSave();
    },
    [theme, onChange, triggerSave],
  );

  const handleResetLayout = useCallback(() => {
    const { elementLayout: _, ...rest } = theme;
    onChange(rest as OBSThemeWithOverrides);
    triggerSave();
    setEditLayoutMode(false);
    setSelectedElement(null);
  }, [theme, onChange, triggerSave]);

  const handleResetElementPosition = useCallback(
    (id: OBSElementId) => {
      handleLayoutChange(id, DEFAULT_ELEMENT_POSITIONS[id]);
    },
    [handleLayoutChange],
  );

  // Resolve theme for current scene
  const resolvedTheme = useMemo(
    () => resolveSceneTheme(theme, currentScene.parteId),
    [theme, currentScene.parteId],
  );

  const currentSources = useMemo(
    () => buildSourceTabs(scenes[safeIndex], resolvedTheme),
    [scenes, safeIndex, resolvedTheme],
  );

  const safeSourceIndex = Math.min(activeSource, currentSources.length - 1);
  const currentSource = currentSources[safeSourceIndex];

  // Debounce srcDoc updates to prevent black flash from iframe reloads
  const [debouncedSrcDoc, setDebouncedSrcDoc] = useState(currentSource?.content ?? '');
  const srcDocTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSourceKeyRef = useRef(`${safeIndex}-${safeSourceIndex}`);

  useEffect(() => {
    if (!currentSource || currentSource.isIframeSrc) return;

    const sourceKey = `${safeIndex}-${safeSourceIndex}`;
    const sourceChanged = sourceKey !== prevSourceKeyRef.current;
    prevSourceKeyRef.current = sourceKey;

    // Immediately update on scene/source tab change, debounce theme edits
    if (sourceChanged) {
      if (srcDocTimerRef.current) clearTimeout(srcDocTimerRef.current);
      setDebouncedSrcDoc(currentSource.content);
      return;
    }

    if (srcDocTimerRef.current) clearTimeout(srcDocTimerRef.current);
    srcDocTimerRef.current = setTimeout(() => {
      setDebouncedSrcDoc(currentSource.content);
    }, 300);
    return () => { if (srcDocTimerRef.current) clearTimeout(srcDocTimerRef.current); };
  }, [currentSource, safeIndex, safeSourceIndex]);

  const thumbnailHtmlsRaw = useMemo(
    () =>
      scenes.map((s) =>
        buildSlideHtmlPublic({
          title: s.nombre,
          theme: resolveSceneTheme(theme, s.parteId),
        }),
      ),
    [scenes, theme],
  );

  // Debounce thumbnails to avoid black flash on every change
  const [thumbnailHtmls, setThumbnailHtmls] = useState(thumbnailHtmlsRaw);
  const thumbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (thumbTimerRef.current) clearTimeout(thumbTimerRef.current);
    thumbTimerRef.current = setTimeout(() => {
      setThumbnailHtmls(thumbnailHtmlsRaw);
    }, 500);
    return () => { if (thumbTimerRef.current) clearTimeout(thumbTimerRef.current); };
  }, [thumbnailHtmlsRaw]);

  // Immediately update thumbnails on scene list change
  const scenesKey = scenes.map((s) => s.nombre).join(',');
  useEffect(() => {
    setThumbnailHtmls(thumbnailHtmlsRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenesKey]);

  // Keyboard
  useEffect(() => {
    if (presentationMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scenes.length, onBack, presentationMode]);

  // Main preview scale
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const scaleX = width / 1920;
      const scaleY = height / 1080;
      setPreviewScale(Math.min(scaleX, scaleY));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-800 shrink-0 bg-neutral-900">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 gap-1.5"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="h-5 w-px bg-neutral-700" />
          <span className="font-semibold text-sm text-neutral-200">Preview OBS</span>
          {saving ? (
            <span className="flex items-center gap-1 text-xs text-neutral-500 animate-pulse">
              <Save className="h-3 w-3" />
              Guardando...
            </span>
          ) : onSave ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 gap-1"
              onClick={() => {
                setSaving(true);
                onSave(theme);
                setTimeout(() => setSaving(false), 800);
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={editLayoutMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }
            onClick={editLayoutMode ? handleExitLayoutMode : handleEnterLayoutMode}
          >
            <Move className="h-4 w-4 mr-1.5" />
            {editLayoutMode ? 'Salir Layout' : 'Editar Layout'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            onClick={() => setPresentationMode(true)}
          >
            <Play className="h-4 w-4 mr-1.5" />
            Presentar
          </Button>
          {onExport && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Exportar OBS
            </Button>
          )}
        </div>
      </div>

      {/* Body: 3 panels */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT: Scene sidebar */}
        <div className="w-48 border-r border-neutral-800 bg-neutral-900/50 overflow-y-auto shrink-0">
          <div className="p-2 space-y-1">
            {scenes.map((scene, idx) => {
              const extraSources = (scene.links?.length ?? 0) + (scene.fotos?.length ?? 0);
              const sceneHasOverride = !!scene.parteId && scene.parteId in (theme.sceneOverrides ?? {});
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-full text-left rounded-md overflow-hidden transition-all group ${
                    idx === safeIndex
                      ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-neutral-900'
                      : 'hover:ring-1 hover:ring-neutral-600'
                  }`}
                >
                  <div className="relative">
                    <ScaledIframe
                      srcDoc={thumbnailHtmls[idx]}
                      title={`Escena ${idx + 1}`}
                      className="w-full bg-black"
                      style={{ aspectRatio: '16/9' }}
                    />
                    {extraSources > 0 && (
                      <span className="absolute top-1 right-1 bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {extraSources}
                      </span>
                    )}
                    {sceneHasOverride && (
                      <span className="absolute top-1 left-1">
                        <Palette className="h-3 w-3 text-amber-400 drop-shadow" />
                      </span>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 text-[11px] truncate ${
                      idx === safeIndex
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-neutral-800/50 text-neutral-400 group-hover:text-neutral-300'
                    }`}
                  >
                    <span className="font-mono text-[10px] mr-1 opacity-60">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {scene.nombre}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER: Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-900">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {currentSource?.type === 'foto' ? (
              <div className="flex items-center justify-center w-full h-full">
                <img
                  src={currentSource.content}
                  alt={currentSource.label}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            ) : currentSource?.isIframeSrc ? (
              <div
                ref={previewContainerRef}
                className="relative w-full h-full"
              >
                <iframe
                  key={`${safeIndex}-${safeSourceIndex}-src`}
                  src={currentSource.content}
                  title="OBS Preview"
                  className="rounded-lg border border-neutral-700 bg-black"
                  sandbox="allow-scripts allow-same-origin"
                  allow="autoplay; encrypted-media"
                  style={{
                    width: 1920,
                    height: 1080,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: -(1080 * previewScale) / 2,
                    marginLeft: -(1920 * previewScale) / 2,
                    pointerEvents: currentSource.allowInteraction ? 'auto' : 'none',
                  }}
                />
              </div>
            ) : (
              <div
                ref={previewContainerRef}
                className="relative w-full h-full"
              >
                <iframe
                  key={`${safeIndex}-${safeSourceIndex}-doc`}
                  srcDoc={debouncedSrcDoc}
                  title="OBS Slide Preview"
                  sandbox=""
                  className="rounded-lg border border-neutral-700 bg-black pointer-events-none"
                  style={{
                    width: 1920,
                    height: 1080,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: -(1080 * previewScale) / 2,
                    marginLeft: -(1920 * previewScale) / 2,
                  }}
                />
                {editLayoutMode && currentSource?.type === 'slide' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 1920 * previewScale,
                      height: 1080 * previewScale,
                      marginTop: -(1080 * previewScale) / 2,
                      marginLeft: -(1920 * previewScale) / 2,
                    }}
                  >
                    <SlideLayoutOverlay
                      layout={theme.elementLayout ?? DEFAULT_ELEMENT_POSITIONS}
                      previewScale={previewScale}
                      selectedElement={selectedElement}
                      onSelectElement={setSelectedElement}
                      onLayoutChange={handleLayoutChange}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Source tabs */}
          <div className="border-t border-neutral-800 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 mr-1 shrink-0">
              Sources
            </span>
            {currentSources.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSource(i)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors shrink-0 ${
                  i === safeSourceIndex
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
                }`}
              >
                {src.label}
              </button>
            ))}
            {currentSources.length === 1 && (
              <span className="text-[10px] text-neutral-600 ml-1">
                (sin links ni fotos en esta escena)
              </span>
            )}
          </div>

          {/* Scene info bar */}
          <div className="border-t border-neutral-800 px-4 py-1.5 flex items-center justify-between shrink-0">
            <span className="text-xs text-neutral-500 truncate">
              {scenes[safeIndex].nombre}
            </span>
            <span className="text-xs text-neutral-600 tabular-nums">
              {safeIndex + 1} / {scenes.length}
            </span>
          </div>
        </div>

        {/* RIGHT: Properties panel */}
        <div className="w-72 border-l border-neutral-800 bg-neutral-900/50 overflow-y-auto shrink-0">
          <div className="p-4 space-y-3">
            {/* Section A: Global Theme (collapsible) */}
            <Collapsible open={globalOpen} onOpenChange={setGlobalOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group">
                <h3 className="font-semibold text-neutral-200 text-sm">Tema Global</h3>
                <ChevronDown className={`h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-transform ${globalOpen ? '' : '-rotate-90'}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => updateGlobal({ backgroundMode: 'solid' })}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        theme.backgroundMode === 'solid'
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      Color sólido
                    </button>
                    <button
                      type="button"
                      onClick={() => updateGlobal({ backgroundMode: 'gradient' })}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        !theme.backgroundMode || theme.backgroundMode === 'gradient'
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      Degradado
                    </button>
                  </div>
                  <ColorPickerField
                    label={theme.backgroundMode === 'solid' ? 'Color de fondo' : 'Primario (inicio gradiente)'}
                    value={theme.colorPrimario}
                    onChange={(v) => updateGlobal({ colorPrimario: v })}
                  />
                  {(!theme.backgroundMode || theme.backgroundMode === 'gradient') && (
                    <ColorPickerField
                      label="Secundario (fin gradiente)"
                      value={theme.colorSecundario}
                      onChange={(v) => updateGlobal({ colorSecundario: v })}
                    />
                  )}
                  <ColorPickerField
                    label="Color del texto"
                    value={theme.colorTexto}
                    onChange={(v) => updateGlobal({ colorTexto: v })}
                  />
                  <ColorPickerField
                    label="Linea superior"
                    value={theme.colorAccent}
                    onChange={(v) => updateGlobal({ colorAccent: v })}
                  />

                  <LogoField
                    value={theme.logoUrl}
                    onChange={(url) => updateGlobal({ logoUrl: url })}
                  />
                  {theme.logoUrl && (
                    <label className="flex items-center gap-2 pl-1">
                      <Checkbox
                        checked={!!theme.logoRemoveBg}
                        onCheckedChange={(checked) => updateGlobal({ logoRemoveBg: !!checked })}
                      />
                      <span className="text-xs text-neutral-400">Quitar fondo</span>
                    </label>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-400">Texto del footer</Label>
                    <Input
                      value={theme.footerTexto}
                      onChange={(e) => updateGlobal({ footerTexto: e.target.value })}
                      placeholder="Iglesia Adventista del Septimo Dia"
                      className="h-8 text-sm bg-neutral-800 border-neutral-700 text-neutral-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-400">Fuente (Google Fonts)</Label>
                    <Input
                      value={theme.fontFamily || ''}
                      onChange={(e) => updateGlobal({ fontFamily: e.target.value || undefined })}
                      placeholder="Inter (default)"
                      className="h-8 text-sm bg-neutral-800 border-neutral-700 text-neutral-200"
                    />
                  </div>

                  <BackgroundImageField
                    value={theme.backgroundImageUrl}
                    onChange={(url) => updateGlobal({ backgroundImageUrl: url })}
                  />

                  <div className="pt-3 border-t border-neutral-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 w-full justify-center"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar defaults
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Section B: Per-Scene Override (collapsible, lock/unlock rows) */}
            {/* Section: Layout Position Panel */}
            {editLayoutMode && selectedElement && (() => {
              const layoutMap = theme.elementLayout ?? DEFAULT_ELEMENT_POSITIONS;
              const el = layoutMap[selectedElement] ?? DEFAULT_ELEMENT_POSITIONS[selectedElement];
              const ELEMENT_LABELS: Record<OBSElementId, string> = {
                logo: 'Logo', title: 'Título', subtitle: 'Subtítulo', items: 'Items', footer: 'Footer',
              };
              return (
                <div className="pt-3 border-t border-neutral-800">
                  <h3 className="font-semibold text-neutral-200 text-sm mb-3">
                    {ELEMENT_LABELS[selectedElement]}
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-neutral-400">X (%)</Label>
                        <Input
                          type="number"
                          min={0} max={100} step={0.1}
                          value={el.x}
                          onChange={(e) => handleLayoutChange(selectedElement, { x: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs font-mono bg-neutral-800 border-neutral-700 text-neutral-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-neutral-400">Y (%)</Label>
                        <Input
                          type="number"
                          min={0} max={100} step={0.1}
                          value={el.y}
                          onChange={(e) => handleLayoutChange(selectedElement, { y: parseFloat(e.target.value) || 0 })}
                          className="h-7 text-xs font-mono bg-neutral-800 border-neutral-700 text-neutral-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-neutral-400">Escala</Label>
                        <span className="text-xs text-neutral-500 font-mono">{(el.scale ?? 1).toFixed(1)}x</span>
                      </div>
                      <Slider
                        min={0.1}
                        max={3}
                        step={0.1}
                        value={[el.scale ?? 1]}
                        onValueChange={([v]) => handleLayoutChange(selectedElement, { scale: v })}
                        className="py-1"
                      />
                    </div>

                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={el.visible !== false}
                        onCheckedChange={(checked) => handleLayoutChange(selectedElement, { visible: !!checked })}
                      />
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        {el.visible !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        Visible
                      </span>
                    </label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetElementPosition(selectedElement)}
                      className="text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 w-full justify-center text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar posición
                    </Button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetLayout}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full justify-center text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar todo el layout
                    </Button>
                  </div>
                </div>
              );
            })()}

            {hasParteId && (() => {
              const pid = currentScene.parteId!;
              const ov = sceneOverride ?? {};
              // Determine background mode for this scene (override or inherit from global)
              const sceneMode = ov.backgroundMode ?? theme.backgroundMode;
              const isSceneGradient = !sceneMode || sceneMode === 'gradient';

              const OVERRIDE_FIELDS: { key: keyof OBSTheme; label: string; isColor?: boolean }[] = [
                { key: 'colorPrimario', label: isSceneGradient ? 'Primario' : 'Fondo', isColor: true },
                ...(isSceneGradient ? [{ key: 'colorSecundario' as keyof OBSTheme, label: 'Secundario', isColor: true }] : []),
                { key: 'colorTexto', label: 'Texto', isColor: true },
                { key: 'colorAccent', label: 'Linea sup.', isColor: true },
                { key: 'backgroundImageUrl', label: 'Imagen fondo' },
              ];
              const overrideCount = OVERRIDE_FIELDS.filter((f) => f.key in ov).length
                + (ov.backgroundMode !== undefined ? 1 : 0);

              return (
                <div className="pt-3 border-t border-neutral-800">
                  <Collapsible open={sceneOpen} onOpenChange={setSceneOpen}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full group">
                      <h3 className="font-semibold text-neutral-200 text-sm truncate flex-1 text-left">
                        Escena: {currentScene.nombre}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {overrideCount > 0 && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                            {overrideCount}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-neutral-500 group-hover:text-neutral-300 transition-transform ${sceneOpen ? '' : '-rotate-90'}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2">
                        {/* Background mode toggle per scene */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateSceneOverride(pid, { backgroundMode: 'solid' })}
                            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                              sceneMode === 'solid'
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                                : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                            }`}
                          >
                            Sólido
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSceneOverride(pid, { backgroundMode: 'gradient' })}
                            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                              isSceneGradient && sceneMode !== undefined
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                                : !sceneMode
                                  ? 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                                  : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                            }`}
                          >
                            Degradado
                          </button>
                          {ov.backgroundMode !== undefined && (
                            <button
                              type="button"
                              onClick={() => clearSceneOverride(pid, 'backgroundMode')}
                              className="text-neutral-500 hover:text-neutral-300 p-0.5"
                              title="Volver al valor global"
                            >
                              <Undo2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {OVERRIDE_FIELDS.map((f) => (
                          <OverrideRow
                            key={f.key}
                            label={f.label}
                            isColor={f.isColor}
                            globalValue={theme[f.key] as string | undefined}
                            overrideValue={ov[f.key] as string | undefined}
                            onOverride={(v) => updateSceneOverride(pid, { [f.key]: v })}
                            onRevert={() => clearSceneOverride(pid, f.key)}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Presentation Mode */}
      {presentationMode && (
        <PresentationMode
          scenes={scenes}
          theme={theme}
          onExit={() => setPresentationMode(false)}
        />
      )}
    </div>
  );
}
