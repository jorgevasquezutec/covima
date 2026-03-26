import type { TurnoRolServicio } from '@/types';

// Adventist logo — flame + open bible + cross
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" width="80" height="73">
  <!-- Flame -->
  <g>
    <path d="M60 2 C50 18, 38 28, 36 42 C34 56, 44 66, 60 66 C76 66, 86 56, 84 42 C82 28, 70 18, 60 2z" fill="#c8a62c" opacity="0.9"/>
    <path d="M60 12 C53 24, 45 32, 44 42 C43 52, 50 58, 60 58 C70 58, 77 52, 76 42 C75 32, 67 24, 60 12z" fill="#d4b84a"/>
    <path d="M60 24 C56 32, 52 37, 51 43 C50 49, 54 53, 60 53 C66 53, 70 49, 69 43 C68 37, 64 32, 60 24z" fill="#e8d48a"/>
  </g>
  <!-- Open Bible -->
  <path d="M30 62 L60 72 L90 62 L90 95 L60 105 L30 95 Z" fill="none" stroke="#2d5a27" stroke-width="3"/>
  <line x1="60" y1="72" x2="60" y2="105" stroke="#2d5a27" stroke-width="2"/>
  <!-- Cross on bible -->
  <line x1="60" y1="76" x2="60" y2="88" stroke="#2d5a27" stroke-width="2.5"/>
  <line x1="55" y1="80" x2="65" y2="80" stroke="#2d5a27" stroke-width="2.5"/>
</svg>`;

interface TurnoImageData {
  turno: TurnoRolServicio;
  tipoNombre: string;
  tipoIcono?: string;
  opcionesTexto?: string;
  coordinadorNombre?: string;
}

export async function generarImagenTurno(data: TurnoImageData): Promise<void> {
  const { turno, tipoNombre, opcionesTexto, coordinadorNombre } = data;

  const nombres = turno.asignaciones.map(
    (a) => (a.miembro?.usuario?.nombre || a.miembro?.nombreLibre || 'Sin nombre').toUpperCase(),
  );

  // Landscape aspect ratio matching reference image
  const W = 1400;
  const H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Colors matching reference
  const gold = '#b8952a';
  const goldLine = '#c8a43a';
  const cream = '#faf7f0';
  const black = '#1a1a1a';

  // Background
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, W, H);

  // Decorative geometric lines
  drawGeometricPattern(ctx, W, H, goldLine);

  // Draw logos
  await drawLogo(ctx, 35, 20);
  await drawLogo(ctx, W - 115, 20);

  // Title — "ROL DE [NOMBRE]" in gold serif
  const titulo = `ROL DE ${tipoNombre.toUpperCase()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = gold;
  ctx.font = 'bold 72px Georgia, "Times New Roman", serif';
  ctx.fillText(titulo, W / 2, 160);

  // "IGLESIA" below
  ctx.font = 'bold 64px Georgia, "Times New Roman", serif';
  ctx.fillText('IGLESIA', W / 2, 240);

  // Name boxes — black text, gold border
  const boxY = 340;
  const boxHeight = 100;
  const gap = 28;
  const maxPerRow = Math.min(nombres.length, 4);
  const margin = 100;

  const rows: string[][] = [];
  for (let i = 0; i < nombres.length; i += maxPerRow) {
    rows.push(nombres.slice(i, i + maxPerRow));
  }

  let currentY = boxY;
  for (const row of rows) {
    const totalBoxWidth = W - margin * 2;
    const boxWidth = (totalBoxWidth - gap * (row.length - 1)) / row.length;
    const startX = margin;

    for (let i = 0; i < row.length; i++) {
      const x = startX + i * (boxWidth + gap);
      drawNameBox(ctx, x, currentY, boxWidth, boxHeight, row[i], goldLine, black);
    }
    currentY += boxHeight + gap;
  }

  // Options text box — black text, gold double border
  let nextY = currentY + 20;
  if (opcionesTexto && opcionesTexto.trim()) {
    const lines = opcionesTexto.split('\n').map((l) => l.trim()).filter(Boolean);
    const lineHeight = 40;
    const padding = 24;
    const optBoxHeight = lines.length * lineHeight + padding * 2;
    const optBoxWidth = Math.min(W - 300, 700);
    const optBoxX = (W - optBoxWidth) / 2;

    // Double border effect
    ctx.strokeStyle = goldLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(optBoxX, nextY, optBoxWidth, optBoxHeight);
    ctx.strokeRect(optBoxX - 4, nextY - 4, optBoxWidth + 8, optBoxHeight + 8);

    ctx.fillStyle = black;
    ctx.font = '28px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(
        lines[i].toUpperCase(),
        W / 2,
        nextY + padding + lineHeight / 2 + i * lineHeight,
      );
    }

    nextY += optBoxHeight + 50;
  } else {
    nextY += 30;
  }

  // Coordinator — black text
  if (coordinadorNombre) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = black;
    ctx.font = '30px Georgia, "Times New Roman", serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(`COORDINAR CON: ${coordinadorNombre.toUpperCase()}`, W / 2, nextY);
  }

  // Download
  const link = document.createElement('a');
  const fechaRaw = turno.semana.includes('T') ? turno.semana.split('T')[0] : turno.semana;
  const semanaStr = fechaRaw.replace(/-/g, '');
  link.download = `turno_${tipoNombre.toLowerCase().replace(/\s+/g, '_')}_${semanaStr}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function drawNameBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  borderColor: string,
  textColor: string,
) {
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-size font to fit
  let fontSize = 32;
  ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
  while (ctx.measureText(name).width > w - 40 && fontSize > 16) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
  }

  // Wrap if still too wide
  const words = name.split(' ');
  if (words.length > 1 && ctx.measureText(name).width > w - 40) {
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    ctx.fillText(line1, x + w / 2, y + h / 2 - fontSize * 0.6);
    ctx.fillText(line2, x + w / 2, y + h / 2 + fontSize * 0.6);
  } else {
    ctx.fillText(name, x + w / 2, y + h / 2);
  }
}

function drawGeometricPattern(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.35;

  const cx = W / 2;
  const cy = H / 2;

  // Draw multiple nested irregular polygons (matching the reference octagon-star pattern)
  // The reference shows ~3 overlapping polygonal shapes rotated slightly
  for (let layer = 0; layer < 3; layer++) {
    const rx = W * (0.48 - layer * 0.04);
    const ry = H * (0.48 - layer * 0.04);
    const sides = 7 + layer; // 7, 8, 9 sides for slight variation
    const rotation = layer * 0.12; // slight rotation per layer

    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2 + rotation;
      const x = cx + rx * Math.cos(angle);
      const y = cy + ry * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Diagonal lines from corners toward center (matching reference)
  const reach = 0.45;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(0, 0);
  ctx.lineTo(W * reach, H * reach);
  // Top-right
  ctx.moveTo(W, 0);
  ctx.lineTo(W * (1 - reach), H * reach);
  // Bottom-left
  ctx.moveTo(0, H);
  ctx.lineTo(W * reach, H * (1 - reach));
  // Bottom-right
  ctx.moveTo(W, H);
  ctx.lineTo(W * (1 - reach), H * (1 - reach));
  ctx.stroke();

  // Side accent lines
  ctx.beginPath();
  ctx.moveTo(0, H * 0.35);
  ctx.lineTo(W * 0.18, H * 0.5);
  ctx.moveTo(0, H * 0.65);
  ctx.lineTo(W * 0.18, H * 0.5);
  ctx.moveTo(W, H * 0.35);
  ctx.lineTo(W * 0.82, H * 0.5);
  ctx.moveTo(W, H * 0.65);
  ctx.lineTo(W * 0.82, H * 0.5);
  ctx.stroke();

  ctx.restore();
}

async function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);
  });
}
