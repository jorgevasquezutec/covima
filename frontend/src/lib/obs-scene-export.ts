/**
 * OBS Scene Collection Export
 *
 * Genera un archivo JSON importable como Scene Collection en OBS Studio.
 * Cada parte del programa se convierte en una escena con un browser source
 * que renderiza HTML estilizado con el logo adventista.
 */

import type { OBSTheme, OBSThemeWithOverrides, OBSElementId, OBSElementLayout } from '@/types';

// ── Theme ─────────────────────────────────────────────────────────────

export function resolveSceneTheme(global: OBSThemeWithOverrides, parteId?: number): OBSTheme {
  if (!parteId || !global.sceneOverrides?.[parteId]) return global;
  const { sceneOverrides, ...base } = global;
  return { ...base, ...sceneOverrides[parteId] };
}

export const DEFAULT_OBS_THEME: OBSTheme = {
  colorPrimario: '#0a1f14',
  colorSecundario: '#1e5438',
  colorTexto: '#ffffff',
  colorAccent: 'rgba(255,255,255,0.5)',
  footerTexto: 'Iglesia Adventista del Séptimo Día',
};

// ── Types ──────────────────────────────────────────────────────────────

export interface OBSExportParte {
  nombre: string;
  parteId?: number;
  participantes: string[];
  links: { nombre: string; url?: string | null; mediaUrl?: string | null }[];
  fotos: { url: string; nombre?: string }[];
}

export interface OBSExportInput {
  titulo: string;
  fecha: string;
  partes: OBSExportParte[];
  visitas?: { nombre: string; procedencia: string }[];
  theme?: OBSThemeWithOverrides;
}

// ── Helpers ────────────────────────────────────────────────────────────

const WIDTH = 1920;
const HEIGHT = 1080;

let itemIdCounter = 1;

function nextItemId() {
  return itemIdCounter++;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Convert any YouTube URL to watch format */
export function normalizeYouTubeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;

    if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
      videoId = u.searchParams.get('v');
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/embed/')) {
      videoId = u.pathname.split('/embed/')[1]?.split('?')[0] || null;
    } else if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/')) {
      videoId = u.pathname.split('/shorts/')[1]?.split('?')[0] || null;
    }

    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('youtube.com') || u.hostname === 'youtu.be';
  } catch {
    return false;
  }
}

/** Build full URL for server-hosted photos */
export function getServerUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${window.location.hostname}:3000`
      : 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ── Adventist Logo SVG ─────────────────────────────────────────────────

// Official Seventh-day Adventist Church logo: flame + cross + open Bible
const ADVENTIST_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" fill="none">
  <!-- Open Bible (dark green) -->
  <path d="M120 195 C90 195, 55 190, 45 185 L45 230 C55 235, 90 240, 120 240 C150 240, 185 235, 195 230 L195 185 C185 190, 150 195, 120 195Z" fill="rgba(255,255,255,0.2)"/>
  <path d="M120 195 L120 240" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
  <!-- Cross (white, center) -->
  <rect x="115" y="155" width="10" height="60" rx="2" fill="rgba(255,255,255,0.4)"/>
  <rect x="101" y="168" width="38" height="9" rx="2" fill="rgba(255,255,255,0.4)"/>
  <!-- Flame stripe 1 (leftmost, golden) -->
  <path d="M108 155 C108 155, 75 120, 82 80 C87 55, 100 35, 108 10 C104 40, 95 65, 93 85 C90 115, 102 145, 108 155Z" fill="rgba(207,171,66,0.5)"/>
  <!-- Flame stripe 2 (center, golden) -->
  <path d="M120 155 C120 155, 95 115, 100 75 C104 45, 115 25, 120 5 C118 30, 110 55, 108 80 C105 110, 115 140, 120 155Z" fill="rgba(207,171,66,0.6)"/>
  <path d="M120 155 C120 155, 145 115, 140 75 C136 45, 125 25, 120 5 C122 30, 130 55, 132 80 C135 110, 125 140, 120 155Z" fill="rgba(207,171,66,0.6)"/>
  <!-- Flame stripe 3 (rightmost, golden) -->
  <path d="M132 155 C132 155, 165 120, 158 80 C153 55, 140 35, 132 10 C136 40, 145 65, 147 85 C150 115, 138 145, 132 155Z" fill="rgba(207,171,66,0.5)"/>
</svg>`;

// ── HTML Slide Builder ─────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Positions that closely match the default flexbox-centered layout
export const DEFAULT_ELEMENT_POSITIONS: Record<OBSElementId, OBSElementLayout> = {
  logo: { x: 50, y: 42 },
  title: { x: 50, y: 54 },
  subtitle: { x: 50, y: 60 },
  items: { x: 50, y: 72 },
  footer: { x: 50, y: 97 },
};

function buildSlideHtml(opts: {
  title: string;
  subtitle?: string;
  items?: string[];
  logoSize?: number;
  theme?: OBSTheme;
}): string {
  const { title, subtitle, items, logoSize = 120, theme = DEFAULT_OBS_THEME } = opts;

  const fontFamily = theme.fontFamily ?? 'Inter';
  const fontImport = fontFamily === 'Inter'
    ? `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');`
    : `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;600;700&display=swap');`;

  // Use processed logo URL if available (white background removed via canvas)
  const effectiveLogoUrl = theme._processedLogoUrl ?? theme.logoUrl;
  const resolvedLogoUrl = effectiveLogoUrl
    ? (effectiveLogoUrl.startsWith('/') ? getServerUrl(effectiveLogoUrl) : effectiveLogoUrl)
    : undefined;
  const logoHtml = resolvedLogoUrl
    ? `<img src="${resolvedLogoUrl}" style="width:${logoSize}px; height:${logoSize}px; object-fit:contain;" alt="" />`
    : (theme.logoSvg ?? ADVENTIST_LOGO_SVG);

  const bgUrl = theme.backgroundImageUrl
    ? (theme.backgroundImageUrl.startsWith('/') ? getServerUrl(theme.backgroundImageUrl) : theme.backgroundImageUrl)
    : undefined;

  const itemsHtml = items && items.length > 0
    ? `<div class="items">${items.map((it) => `<div class="item">${escapeHtml(it)}</div>`).join('')}</div>`
    : '';

  const subtitleHtml = subtitle
    ? `<div class="subtitle">${escapeHtml(subtitle)}</div>`
    : '';

  const layout = theme.elementLayout;
  const isAbsolute = !!layout;

  // Helper to get element style for absolute positioning mode
  const elStyle = (id: OBSElementId): string => {
    if (!layout) return '';
    const el = layout[id] ?? DEFAULT_ELEMENT_POSITIONS[id];
    if (!el) return '';
    const visible = el.visible !== false;
    const scale = el.scale ?? 1;
    return `position:absolute; left:${el.x}%; top:${el.y}%; transform:translate(-50%,-50%) scale(${scale}); ${visible ? '' : 'display:none;'}`;
  };

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  ${fontImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    font-family: '${fontFamily}', 'Segoe UI', Arial, sans-serif;
    background: ${theme.backgroundMode === 'solid' ? theme.colorPrimario : `linear-gradient(135deg, ${theme.colorPrimario} 0%, ${theme.colorSecundario} 100%)`};
    color: ${theme.colorTexto};${isAbsolute ? '' : ' display: flex; align-items: center; justify-content: center;'}
    position: relative;
  }
  /* Decorative circles */
  body::before {
    content: ''; position: absolute; top: -200px; right: -200px;
    width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
  }
  body::after {
    content: ''; position: absolute; bottom: -300px; left: -100px;
    width: 800px; height: 800px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  }
  /* Top accent line */
  .accent {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, transparent, ${theme.colorAccent}, transparent);
  }
  /* Bottom bar */
  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 60px;
    background: rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center; gap: 12px;
    font-size: 16px; color: rgba(255,255,255,0.5); font-weight: 300;
    letter-spacing: 3px; text-transform: uppercase;
  }
  .bottom-bar svg { width: 24px; height: 24px; }
  .content {
    position: relative; z-index: 1; text-align: center;
    max-width: 1400px; padding: 0 80px;
  }
  .logo { margin-bottom: 30px; opacity: 0.9; }
  .logo svg { width: ${logoSize}px; height: ${logoSize}px; }
  .title {
    font-size: 64px; font-weight: 700; line-height: 1.15;
    text-shadow: 0 2px 20px rgba(0,0,0,0.4);
    letter-spacing: -0.5px;
  }
  .subtitle {
    margin-top: 16px; font-size: 28px; font-weight: 300;
    color: rgba(255,255,255,0.7); letter-spacing: 1px;
  }
  .items {
    margin-top: 40px; display: flex; flex-direction: column;
    align-items: center; gap: 12px;
  }
  .item {
    font-size: 32px; font-weight: 400; color: rgba(255,255,255,0.85);
    padding: 8px 32px; border-radius: 8px;
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .bg-image {
    position: absolute; inset: 0; z-index: 0;
    background-size: contain; background-position: center; background-repeat: no-repeat;
  }
</style></head><body>
  ${bgUrl ? `<div class="bg-image" style="background-image: url('${bgUrl}')"></div>` : ''}
  <div class="accent"></div>
  ${isAbsolute ? `
  <div class="logo" style="${elStyle('logo')}">${logoHtml}</div>
  <div class="title" style="${elStyle('title')}">${escapeHtml(title)}</div>
  ${subtitle ? `<div class="subtitle" style="${elStyle('subtitle')}">${escapeHtml(subtitle)}</div>` : ''}
  ${items && items.length > 0 ? `<div class="items" style="${elStyle('items')}">${items.map((it) => `<div class="item">${escapeHtml(it)}</div>`).join('')}</div>` : ''}
  <div class="bottom-bar" style="bottom:auto; ${elStyle('footer')}">${escapeHtml(theme.footerTexto)}</div>
  ` : `
  <div class="content">
    <div class="logo">${logoHtml}</div>
    <div class="title">${escapeHtml(title)}</div>
    ${subtitleHtml}
    ${itemsHtml}
  </div>
  <div class="bottom-bar">
    ${escapeHtml(theme.footerTexto)}
  </div>
  `}
</body></html>`;
}

/** Public wrapper for preview rendering */
export function buildSlideHtmlPublic(opts: {
  title: string;
  subtitle?: string;
  items?: string[];
  logoSize?: number;
  theme?: OBSTheme;
}): string {
  return buildSlideHtml(opts);
}

// ── OBS JSON Builders ──────────────────────────────────────────────────

function sourceBase(id: string, versionedId: string, name: string, settings: Record<string, unknown>) {
  return {
    balance: 0.5,
    deinterlace_field_order: 0,
    deinterlace_mode: 0,
    enabled: true,
    flags: 0,
    hotkeys: {},
    id,
    mixers: 255,
    monitoring_type: 0,
    mute: false,
    name,
    prev_ver: 503316480,
    private_settings: {},
    'push-to-mute': false,
    'push-to-mute-delay': 0,
    'push-to-talk': false,
    'push-to-talk-delay': 0,
    settings,
    sync: 0,
    uuid: uuid(),
    versioned_id: versionedId,
    volume: 1.0,
  };
}

function makeBrowserSource(name: string, url: string, w = WIDTH, h = HEIGHT, css?: string) {
  const settings: Record<string, unknown> = {
    url,
    width: w,
    height: h,
    fps: 30,
    reroute_audio: true,
    shutdown: true,
    restart_when_active: true,
  };
  if (css) settings.css = css;
  return sourceBase('browser_source', 'browser_source', name, settings);
}

const YOUTUBE_CSS = `
  #masthead-container, #secondary, #below, #comments, ytd-masthead,
  #guide-button, ytd-mini-guide-renderer, #related, ytd-watch-metadata,
  #info, #meta, #description, tp-yt-app-drawer, #chips-wrapper,
  ytd-engagement-panel-section-list-renderer, #panels,
  #page-manager > ytd-browse { display: none !important; }
  body { overflow: hidden !important; margin: 0 !important; background: #000 !important; }
  #page-manager, ytd-watch-flexy, #full-bleed-container,
  #player-theater-container, #player-container-outer,
  #player-container-inner, #player-container, ytd-player, #ytd-player,
  #movie_player {
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: 100vw !important; height: 100vh !important;
    max-height: none !important; min-height: 100vh !important;
    max-width: none !important; z-index: 9999 !important;
  }
`;

export function isBibleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes('biblegateway.com') || u.hostname.includes('bible.com');
  } catch {
    return false;
  }
}

export function parseBibleGatewayUrl(url: string): { search: string; version: string } | null {
  try {
    const u = new URL(url);
    const search = u.searchParams.get('search') || '';
    const version = u.searchParams.get('version') || 'NVI';
    if (search) return { search, version };
  } catch { /* ignore */ }
  return null;
}

/** Build backend URL that serves a styled Bible slide HTML page */
export function buildBibleSlideUrl(search: string, version: string): string {
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${window.location.hostname}:3000`
      : 'http://localhost:3000';
  return `${base}/api/programas/public/bible-slide?search=${encodeURIComponent(search)}&version=${encodeURIComponent(version)}`;
}

function makeMediaSource(name: string, url: string) {
  return sourceBase('ffmpeg_source', 'ffmpeg_source', name, {
    input: url,
    is_local_file: false,
    looping: false,
    restart_on_activate: true,
    hw_decode: true,
  });
}

function makeHtmlBrowserSource(name: string, html: string) {
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return makeBrowserSource(name, dataUrl);
}

interface SceneItemDef {
  sourceName: string;
  sourceUuid: string;
  bounds?: { x: number; y: number };
  pos?: { x: number; y: number };
  visible?: boolean;
}

function makeSceneItem(def: SceneItemDef) {
  return {
    name: def.sourceName,
    source_uuid: def.sourceUuid,
    id: nextItemId(),
    private_settings: {},
    rot: 0.0,
    pos: { x: def.pos?.x ?? 0.0, y: def.pos?.y ?? 0.0 },
    scale: { x: 1.0, y: 1.0 },
    align: 5,
    bounds_type: def.bounds ? 'OBS_BOUNDS_SCALE_INNER' : 'OBS_BOUNDS_NONE',
    bounds_align: 0,
    bounds: { x: def.bounds?.x ?? 0.0, y: def.bounds?.y ?? 0.0 },
    crop_left: 0,
    crop_right: 0,
    crop_top: 0,
    crop_bottom: 0,
    blend_type: 'OBS_BLEND_NORMAL',
    visible: def.visible !== false,
  };
}

function makeScene(name: string, sceneUuid: string, items: SceneItemDef[], idCounter: number) {
  return {
    balance: 0.5,
    deinterlace_field_order: 0,
    deinterlace_mode: 0,
    enabled: true,
    flags: 0,
    hotkeys: {},
    id: 'scene',
    mixers: 255,
    monitoring_type: 0,
    mute: false,
    name,
    prev_ver: 503316480,
    private_settings: {},
    'push-to-mute': false,
    'push-to-mute-delay': 0,
    'push-to-talk': false,
    'push-to-talk-delay': 0,
    settings: {
      id_counter: idCounter,
      items: items.map(makeSceneItem),
      custom_size: false,
    },
    sync: 0,
    uuid: sceneUuid,
    versioned_id: 'scene',
    volume: 1.0,
  };
}

// ── Main Generator ─────────────────────────────────────────────────────

export function generateOBSSceneCollection(input: OBSExportInput) {
  itemIdCounter = 1;

  const globalTheme = input.theme ?? DEFAULT_OBS_THEME;
  const sources: ReturnType<typeof sourceBase>[] = [];
  const sceneOrder: { name: string }[] = [];

  const addSource = <T extends { name: string; uuid: string }>(s: T): T => {
    sources.push(s as any);
    return s;
  };

  // ── Scene per parte ──

  input.partes.forEach((parte, idx) => {
    const sceneNum = String(idx + 1).padStart(2, '0');
    const sceneName = `${sceneNum} - ${parte.nombre}`;
    const sceneUuid = uuid();
    const items: SceneItemDef[] = [];

    const theme = resolveSceneTheme(globalTheme, parte.parteId);

    // Determine extra content for the slide
    const esBienvenida = parte.nombre.toLowerCase().includes('bienvenida');
    const visitaNames = esBienvenida && input.visitas && input.visitas.length > 0
      ? input.visitas.map((v) => `${v.nombre} — ${v.procedencia}`)
      : undefined;

    // Main HTML slide
    const slideHtml = buildSlideHtml({
      title: parte.nombre,
      items: visitaNames,
      theme,
    });
    const slideSrc = addSource(makeHtmlBrowserSource(`Slide ${sceneName}`, slideHtml));
    items.push({
      sourceName: slideSrc.name,
      sourceUuid: slideSrc.uuid,
      bounds: { x: WIDTH, y: HEIGHT },
    });

    // Links: downloaded video (ffmpeg_source), YouTube, Bible, or generic browser sources
    parte.links.forEach((link, li) => {
      const url = link.url || '';
      const isYt = url ? isYouTubeUrl(url) : false;
      const isBible = url ? isBibleUrl(url) : false;
      const label = link.nombre || (isYt ? 'YouTube' : isBible ? 'Biblia' : 'Link');
      const srcName = `${label} - ${sceneName}${li > 0 ? ` (${li + 1})` : ''}`;

      let src;
      if (link.mediaUrl) {
        // Downloaded video: use ffmpeg_source
        const mediaFullUrl = getServerUrl(link.mediaUrl);
        src = addSource(makeMediaSource(srcName, mediaFullUrl));
        (src as any).monitoring_type = 1; // monitor audio
      } else if (!url) {
        // No URL and no media — skip
        return;
      } else if (isBible) {
        // Bible: use backend endpoint that fetches and renders the text
        const parsed = parseBibleGatewayUrl(url);
        const ref = parsed?.search || link.nombre || 'Lectura Bíblica';
        const ver = parsed?.version || 'NVI';
        const bibleUrl = buildBibleSlideUrl(ref, ver);
        src = addSource(makeBrowserSource(srcName, bibleUrl));
      } else {
        const ytUrl = isYt ? normalizeYouTubeUrl(url) : null;
        const finalUrl = ytUrl ?? url;
        src = addSource(makeBrowserSource(srcName, finalUrl, WIDTH, HEIGHT, isYt ? YOUTUBE_CSS : undefined));
        if (isYt) (src as any).monitoring_type = 1;
      }

      items.push({
        sourceName: src.name,
        sourceUuid: src.uuid,
        bounds: { x: WIDTH, y: HEIGHT },
        visible: false,
      });
    });

    // Photos
    parte.fotos.forEach((foto, fi) => {
      const fotoUrl = getServerUrl(foto.url);
      const srcName = `Foto ${foto.nombre || fi + 1} - ${sceneName}`;
      const bs = addSource(makeBrowserSource(srcName, fotoUrl));
      items.push({
        sourceName: bs.name,
        sourceUuid: bs.uuid,
        bounds: { x: WIDTH, y: HEIGHT },
        visible: false,
      });
    });

    const scene = makeScene(sceneName, sceneUuid, items, itemIdCounter);
    sources.push(scene as any);
    sceneOrder.push({ name: sceneName });
  });

  // ── Build collection ──

  const collectionName = `${input.titulo} - ${input.fecha}`;
  return {
    name: collectionName,
    scene_order: sceneOrder,
    sources,
    current_scene: sceneOrder[0]?.name ?? '',
    current_program_scene: sceneOrder[0]?.name ?? '',
  };
}

// ── Download helper ────────────────────────────────────────────────────

export function downloadOBSSceneCollection(input: OBSExportInput) {
  const collection = generateOBSSceneCollection(input);
  const json = JSON.stringify(collection, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const slug = input.titulo
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
  const filename = `obs-${slug}-${input.fecha}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
