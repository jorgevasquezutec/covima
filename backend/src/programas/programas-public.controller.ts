import { Controller, Get, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProgramasService } from './programas.service';

@ApiTags('Programas (Público)')
@Controller('programas/public')
export class ProgramasPublicController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get('bible-slide')
  @ApiOperation({ summary: 'Slide HTML con texto bíblico para OBS' })
  async bibleSlide(
    @Query('search') search: string,
    @Query('version') version: string,
    @Res() res: Response,
  ) {
    const ver = version || 'NVI';
    const ref = search || '';

    let passageHtml = '';
    try {
      const printUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${encodeURIComponent(ver)}&interface=print`;
      const response = await fetch(printUrl);
      const html = await response.text();

      // Extract passage text from print page
      const passageMatch = html.match(
        /<div\s+class="passage-text">([\s\S]*?)<\/div>\s*<div\s+class="passage-other-trans/,
      );
      if (passageMatch) {
        passageHtml = passageMatch[1]
          .replace(/<sup[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
          .replace(/<sup[^>]*class="[^"]*crossreference[^"]*"[^>]*>[\s\S]*?<\/sup>/gi, '')
          .replace(/<div[^>]*class="[^"]*footnotes[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class="[^"]*crossrefs[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<h3>[\s\S]*?<\/h3>/gi, '')
          .replace(/<a[^>]*class="[^"]*full-chap-link[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
          .replace(/<span\s+class="chapternum">[^<]*<\/span>/gi, '')
          .replace(/<a\b/gi, '<span')
          .replace(/<\/a>/gi, '</span>')
          .trim();
      } else {
        // Try broader match
        const broader = html.match(/<div\s+class="passage-text">([\s\S]*?)<\/div>/);
        if (broader) {
          passageHtml = broader[1]
            .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
            .replace(/<h3>[\s\S]*?<\/h3>/gi, '')
            .replace(/<a\b/gi, '<span')
            .replace(/<\/a>/gi, '</span>')
            .trim();
        }
      }
    } catch {
      // If fetch fails, passageHtml stays empty
    }

    const fallback = passageHtml
      ? ''
      : `<p style="font-size:56px;font-weight:700;">${ref.replace(/</g, '&lt;')}</p>`;

    const slideHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px; overflow: hidden;
    font-family: 'Merriweather', Georgia, serif;
    background: linear-gradient(135deg, #0a1f14 0%, #14352a 30%, #1a4731 60%, #1e5438 100%);
    color: white; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px 140px; text-align: center; position: relative;
  }
  body::before {
    content: ''; position: absolute; top: -200px; right: -200px;
    width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
  }
  .accent { position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); }
  .reference {
    font-family: 'Inter', sans-serif;
    font-size: 30px; font-weight: 300;
    color: rgba(255,255,255,0.5);
    letter-spacing: 4px; text-transform: uppercase;
    margin-bottom: 36px;
  }
  .passage {
    font-size: 36px; line-height: 1.8;
    color: rgba(255,255,255,0.92);
    max-width: 1500px; font-weight: 300; position: relative; z-index: 1;
  }
  .passage p { margin-bottom: 12px; }
  .versenum {
    font-family: 'Inter', sans-serif;
    font-size: 20px; color: rgba(255,255,255,0.3);
    vertical-align: super; margin: 0 3px; font-weight: 600;
  }
  .bottom-bar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 50px;
    background: rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif; font-size: 15px;
    color: rgba(255,255,255,0.4); letter-spacing: 3px; text-transform: uppercase;
  }
</style></head><body>
  <div class="accent"></div>
  <div class="reference">${ref.replace(/</g, '&lt;')} &mdash; ${ver}</div>
  <div class="passage">${passageHtml || fallback}</div>
</body></html>`;

    res.type('text/html').send(slideHtml);
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'Ver programa público por código' })
  async findByCodigo(@Param('codigo') codigo: string) {
    const programa = await this.programasService.findByCodigo(codigo);
    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }
    return programa;
  }
}
