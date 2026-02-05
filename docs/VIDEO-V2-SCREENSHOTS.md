# Video V2 - Con pantallas de la plataforma

## URL de la plataforma
**covima.jvasquez.me**

## Screenshots necesarios por escena

| # | Escena | Pantalla del sistema | Qué se vería | Archivo |
|---|--------|---------------------|--------------|---------|
| 1 | **Intro** | Login / Sidebar con logo | Logo "CO", "Covima Sistema", URL | `01-intro.png` |
| 2 | **Puntos** | Registro de asistencia | Cards de tipos (temprano/a tiempo/tarde) con badges de colores | `02-puntos.png` |
| 3 | **Participación** | Dashboard → "Acciones del Equipo" | Barras horizontales mostrando ASISTENCIA, PARTICIPACIÓN, EVENTO | `03-participacion.png` |
| 4 | **Espiritual** | Mi Progreso → "Camino de Fe" | Modal con niveles espirituales y emojis | `04-espiritual.png` |
| 5 | **Racha** | Mi Progreso → Card de racha | Flame icon, racha actual/mejor, fondo naranja | `05-racha.png` |
| 6 | **Niveles** | Mi Progreso → Nivel actual | Emoji grande, barra XP, "Te faltan X XP" | `06-niveles.png` |
| 7 | **Ranking** | Ranking → Top 3 + tabla | Podium con medallas + leaderboard | `07-ranking.png` |
| 8 | **Outro** | Dashboard completo | Vista general + URL prominente | `08-outro.png` |

## Instrucciones para tomar screenshots

1. Abrir `covima.jvasquez.me` en Chrome
2. Usar resolución **1920x1080** (o similar)
3. Para cada escena, navegar a la página indicada
4. Tomar screenshot (Cmd+Shift+4 en Mac o F12 → Device Toolbar → 1920x1080)
5. Guardar en `video/public/screenshots/` con el nombre indicado

## Cómo se usarán en el video

Cada escena tendrá dos capas:
- **Fondo**: Gradiente/color de la escena actual (V1)
- **Screenshot**: Imagen del sistema real, con borde redondeado y sombra, animada con spring (scale + slide)

El screenshot aparecerá ~1s después del título, con animación de entrada (scale from 0.8 → 1, opacity 0 → 1).

## Layout por escena

```
┌──────────────────────────────────────┐
│  [Título de la escena]               │
│                                       │
│   ┌─────────────────────────┐        │
│   │                         │        │
│   │   Screenshot del        │        │
│   │   sistema real          │        │
│   │                         │        │
│   └─────────────────────────┘        │
│                                       │
│  [Texto descriptivo / URL]           │
└──────────────────────────────────────┘
```

## URL visible

En intro y outro, mostrar prominentemente:
```
covima.jvasquez.me
```
Con estilo: fondo semi-transparente, texto grande, icono de link.

## Archivos a modificar/crear

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `video/src/scenes/*Scene.tsx` (todos) | MODIFY — agregar capa de screenshot |
| 2 | `video/src/components/ScreenshotFrame.tsx` | CREATE — componente reutilizable para mostrar screenshots |
| 3 | `video/src/Root.tsx` | MODIFY — agregar composición PromoVideoV2 |
| 4 | `video/src/PromoVideoV2.tsx` | CREATE — versión 2 con screenshots |

## V1 backup

La versión 1 (sin screenshots) está guardada en:
- `video/src/v1/PromoVideoV1.tsx`
- `video/src/v1/scenes/`
