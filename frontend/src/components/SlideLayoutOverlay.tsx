import { useCallback, useRef, useState } from 'react';
import type { OBSElementId, OBSElementLayout } from '@/types';
import { DEFAULT_ELEMENT_POSITIONS } from '@/lib/obs-scene-export';

const ELEMENT_LABELS: Record<OBSElementId, string> = {
  logo: 'Logo',
  title: 'Título',
  subtitle: 'Subtítulo',
  items: 'Items',
  footer: 'Footer',
};

const ELEMENT_IDS: OBSElementId[] = ['logo', 'title', 'subtitle', 'items', 'footer'];

interface SlideLayoutOverlayProps {
  layout: Partial<Record<OBSElementId, OBSElementLayout>>;
  previewScale: number;
  selectedElement: OBSElementId | null;
  onSelectElement: (id: OBSElementId | null) => void;
  onLayoutChange: (id: OBSElementId, partial: Partial<OBSElementLayout>) => void;
}

export default function SlideLayoutOverlay({
  layout,
  previewScale,
  selectedElement,
  onSelectElement,
  onLayoutChange,
}: SlideLayoutOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<OBSElementId | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const getElementLayout = useCallback(
    (id: OBSElementId): OBSElementLayout => {
      return layout[id] ?? DEFAULT_ELEMENT_POSITIONS[id];
    },
    [layout],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: OBSElementId) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const el = getElementLayout(id);
      dragStartRef.current = { x: e.clientX, y: e.clientY, startX: el.x, startY: el.y };
      setDragging(id);
      onSelectElement(id);
    },
    [getElementLayout, onSelectElement],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragStartRef.current) return;
      e.preventDefault();
      const dx = (e.clientX - dragStartRef.current.x) / previewScale;
      const dy = (e.clientY - dragStartRef.current.y) / previewScale;
      // Convert pixel delta to percentage of canvas
      const pctX = (dx / 1920) * 100;
      const pctY = (dy / 1080) * 100;
      const newX = Math.max(0, Math.min(100, dragStartRef.current.startX + pctX));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.startY + pctY));
      onLayoutChange(dragging, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
    },
    [dragging, previewScale, onLayoutChange],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    dragStartRef.current = null;
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onSelectElement(null);
      }
    },
    [onSelectElement],
  );

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10"
      style={{ cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleOverlayClick}
    >
      {ELEMENT_IDS.map((id) => {
        const el = getElementLayout(id);
        if (el.visible === false) return null;
        const isSelected = selectedElement === id;
        const isDragging = dragging === id;
        const scale = el.scale ?? 1;

        // Size hints for handles
        const sizes: Record<OBSElementId, { w: number; h: number }> = {
          logo: { w: 140, h: 140 },
          title: { w: 800, h: 80 },
          subtitle: { w: 500, h: 45 },
          items: { w: 600, h: 120 },
          footer: { w: 1920, h: 60 },
        };
        const size = sizes[id];

        return (
          <div
            key={id}
            onPointerDown={(e) => handlePointerDown(e, id)}
            className={`absolute flex items-center justify-center select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: size.w * scale * previewScale,
              height: size.h * scale * previewScale,
              transform: 'translate(-50%, -50%)',
              border: isSelected
                ? '2px solid #3b82f6'
                : '2px dashed rgba(255,255,255,0.4)',
              borderRadius: 4,
              background: isSelected
                ? 'rgba(59,130,246,0.08)'
                : 'rgba(255,255,255,0.03)',
              transition: isDragging ? 'none' : 'border-color 0.15s, background 0.15s',
            }}
          >
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/50 text-white/70'
              }`}
              style={{ pointerEvents: 'none' }}
            >
              {ELEMENT_LABELS[id]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
