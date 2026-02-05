# Heatmap de Asistencias (estilo GitHub)

## Resumen

Componente visual tipo GitHub contribution graph pero **por semana** (1 fila de 52 celdas). La intensidad del color refleja cuántas asistencias tuvo el usuario esa semana.

## Ubicación

**MiProgresoPage.tsx** — después de las estadísticas de racha.

## Diseño visual

```
┌──────────────────────────────────────────────────────┐
│  42 asistencias en el último año                     │
│                                                       │
│  Ene   Feb   Mar   Abr   May   Jun   Jul  ...  Dic  │
│  ■■□■  ██■■  ■□██  ■■■□  □□■■  ██■□  ...  ■██■     │
│                                                       │
│                          Menos □ ■ ■ ██ Más          │
└──────────────────────────────────────────────────────┘
```

### Escala de color

| Asistencias/semana | Color        |
|--------------------|--------------|
| 0                  | `gray-100`   |
| 1                  | `green-200`  |
| 2                  | `green-400`  |
| 3+                 | `green-600`  |

### Tooltip al hover

```
Semana del 18 Ene 2025
━━━━━━━━━━━━━━━━━━━━━
● Programa JA
● Estudio Bíblico
● Evento Especial
─────────────────
3 asistencias
```

## Backend

### Nuevo endpoint

```
GET /asistencia/mi-heatmap?year=2025
```

**Respuesta:**

```json
{
  "year": 2025,
  "totalAsistencias": 42,
  "datos": {
    "2025-01-18": { "count": 2, "tipos": ["Programa JA", "Estudio Bíblico"] },
    "2025-01-25": { "count": 1, "tipos": ["Programa JA"] }
  }
}
```

**Implementación** en `asistencia.service.ts`:

- Query: `asistencia.findMany({ where: { usuarioId, estado: 'confirmado', fecha >= inicio_año, fecha <= fin_año } })`
- Agrupar por `semanaInicio` (fecha de la semana)
- Contar asistencias por semana y listar los tipos

### Controller

```typescript
@Get('mi-heatmap')
@ApiOperation({ summary: 'Heatmap de asistencias del usuario autenticado' })
@ApiQuery({ name: 'year', required: false, type: Number })
async getMiHeatmap(@Request() req: any, @Query('year') year?: string)
```

## Frontend

### Archivos

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `backend/src/asistencia/asistencia.service.ts` | MODIFY — método `getMiHeatmap()` |
| 2 | `backend/src/asistencia/asistencia.controller.ts` | MODIFY — endpoint `GET /asistencia/mi-heatmap` |
| 3 | `frontend/src/types/index.ts` | MODIFY — tipo `HeatmapAsistencia` |
| 4 | `frontend/src/services/api.ts` | MODIFY — `asistenciaApi.getMiHeatmap()` |
| 5 | `frontend/src/components/asistencia/AsistenciaHeatmap.tsx` | CREATE — componente heatmap |
| 6 | `frontend/src/pages/gamificacion/MiProgresoPage.tsx` | MODIFY — integrar heatmap |

### Componente `AsistenciaHeatmap.tsx`

- CSS Grid puro (sin librería extra): 52 columnas, 1 fila
- Cada celda = 1 semana, tamaño ~12x12px con gap de 2px
- Labels de meses arriba alineados a la semana correspondiente
- Leyenda "Menos / Más" abajo a la derecha
- Tooltip con `@/components/ui/tooltip` de shadcn
- Responsive: en mobile scroll horizontal con `overflow-x-auto`

### Tipo

```typescript
interface HeatmapAsistencia {
  year: number;
  totalAsistencias: number;
  datos: Record<string, { count: number; tipos: string[] }>;
}
```

### API

```typescript
getMiHeatmap: async (year?: number): Promise<HeatmapAsistencia> => {
  const response = await api.get('/asistencia/mi-heatmap', {
    params: year ? { year } : undefined,
  });
  return response.data;
},
```
