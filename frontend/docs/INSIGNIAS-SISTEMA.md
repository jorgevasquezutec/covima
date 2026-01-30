# Sistema de Insignias (Badges)

## Resumen

Las insignias son logros permanentes que los usuarios desbloquean al cumplir ciertas condiciones. Una vez desbloqueadas, **no se pierden** aunque se cierre el período de ranking.

---

## Modelo de Datos

### Tabla: `insignias`

```prisma
model Insignia {
  id              Int       @id @default(autoincrement())
  codigo          String    @unique   // 'madrugador', 'constante', etc.
  nombre          String               // Nombre visible
  descripcion     String?              // Descripción del logro
  icono           String?              // Emoji o código de icono
  color           String?              // Color hex para UI
  condicionTipo   String               // Tipo de condición (ver tabla abajo)
  condicionValor  Int                  // Valor numérico a alcanzar
  puntosBonus     Int       @default(0)  // Puntos extra al desbloquear
  xpBonus         Int       @default(0)  // XP extra al desbloquear
  activo          Boolean   @default(true)
  usuariosConInsignia UsuarioInsignia[]
}
```

### Tabla: `usuarios_insignias`

```prisma
model UsuarioInsignia {
  id              Int       @id @default(autoincrement())
  usuarioGamId    Int       // FK a UsuarioGamificacion
  insigniaId      Int       // FK a Insignia
  desbloqueadaAt  DateTime  @default(now())
  notificado      Boolean   @default(false)  // Para mostrar notificación

  @@unique([usuarioGamId, insigniaId])  // Un usuario solo puede tener cada insignia una vez
}
```

---

## Tipos de Condiciones

| `condicionTipo` | Descripción | Cómo se verifica |
|-----------------|-------------|------------------|
| `asistencias_tempranas` | Llegar temprano X veces | Cuenta registros en `historial_puntos` con código `asistencia_temprana` |
| `racha_semanas` | Mantener racha de X semanas | Compara con `rachaMejor` del perfil |
| `asistencias_totales` | Asistir X veces en total | Compara con `asistenciasTotales` del perfil |
| `temas_centrales` | Presentar X temas centrales | Cuenta registros con código `tema_central` |
| `direcciones` | Dirigir X programas | Cuenta registros con código `direccion_programa` |
| `especiales` | Participar en X especiales | Cuenta registros con código `especial` |

---

## Insignias Actuales (Seed)

| Código | Nombre | Icono | Condición | Valor | Bonus Pts | Bonus XP |
|--------|--------|-------|-----------|-------|-----------|----------|
| `madrugador` | Madrugador | 🌅 | asistencias_tempranas | 10 | 10 | 20 |
| `constante` | Constante | 🔄 | racha_semanas | 4 | 15 | 30 |
| `orador` | Orador | 🎤 | temas_centrales | 5 | 20 | 40 |
| `lider` | Líder | 👑 | direcciones | 10 | 25 | 50 |
| `fiel` | Fiel | ⭐ | racha_semanas | 12 | 50 | 100 |
| `musico` | Músico | 🎵 | especiales | 5 | 15 | 25 |

---

## Flujo de Verificación

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario registra asistencia o participación                │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  asignarPuntos() actualiza perfil                           │
│  - puntosTotal, puntosTrimestre, xpTotal                    │
│  - asistenciasTotales, participacionesTotales               │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  verificarInsignias(perfilId) - AUTOMÁTICO                  │
│                                                             │
│  1. Obtener insignias que el usuario YA tiene               │
│  2. Para cada insignia activa no desbloqueada:              │
│     - Evaluar condición según condicionTipo                 │
│     - Si cumple condicionValor → desbloquear                │
│  3. Si desbloquea:                                          │
│     - Crear registro en usuarios_insignias                  │
│     - Otorgar puntosBonus y xpBonus                         │
│     - Registrar en historial_puntos                         │
└─────────────────────────────┬───────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Retorna: insigniasDesbloqueadas[]                          │
│  { codigo, nombre, icono }                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Código Backend Relevante

### Archivo: `backend/src/gamificacion/gamificacion.service.ts`

```typescript
// Línea 413-524: verificarInsignias()
async verificarInsignias(perfilId: number): Promise<Array<{ codigo: string; nombre: string; icono: string }>> {
  const perfil = await this.prisma.usuarioGamificacion.findUnique({
    where: { id: perfilId },
    include: { insignias: true },
  });

  const insigniasExistentes = new Set(perfil.insignias.map((i) => i.insigniaId));
  const insignias = await this.prisma.insignia.findMany({ where: { activo: true } });
  const desbloqueadas = [];

  for (const insignia of insignias) {
    if (insigniasExistentes.has(insignia.id)) continue;

    let cumpleCondicion = false;

    switch (insignia.condicionTipo) {
      case 'asistencias_tempranas':
        const tempranas = await this.prisma.historialPuntos.count({
          where: { usuarioGamId: perfilId, configPuntaje: { codigo: 'asistencia_temprana' } },
        });
        cumpleCondicion = tempranas >= insignia.condicionValor;
        break;

      case 'racha_semanas':
        cumpleCondicion = perfil.rachaMejor >= insignia.condicionValor;
        break;

      // ... más casos
    }

    if (cumpleCondicion) {
      // Crear registro y otorgar bonus
    }
  }

  return desbloqueadas;
}
```

---

## Frontend - Visualización Actual

### Archivo: `frontend/src/pages/gamificacion/MiProgresoPage.tsx`

Las insignias se muestran en un grid:
- **Desbloqueadas**: Con color e icono original
- **Bloqueadas**: En escala de grises con candado

---

## TODO: Mantenedor Admin de Insignias

### Endpoints a crear

```typescript
// En gamificacion.controller.ts
GET    /gamificacion/insignias           // Listar todas (admin)
GET    /gamificacion/insignias/:id       // Obtener una
POST   /gamificacion/insignias           // Crear nueva
PUT    /gamificacion/insignias/:id       // Actualizar
DELETE /gamificacion/insignias/:id       // Eliminar (soft delete = activo: false)
```

### DTOs necesarios

```typescript
// dto/insignia.dto.ts
export class CrearInsigniaDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  condicionTipo: string;  // Validar que sea uno de los tipos permitidos

  @IsNumber()
  @Min(1)
  condicionValor: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  puntosBonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  xpBonus?: number;
}

export class ActualizarInsigniaDto extends PartialType(CrearInsigniaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
```

### Página Frontend

```
frontend/src/pages/admin/gamificacion/InsigniasPage.tsx
```

**Funcionalidades:**
- Tabla con todas las insignias
- Modal para crear/editar
- Selector de condicionTipo (dropdown)
- Input numérico para condicionValor
- Color picker para color
- Emoji picker o input para icono
- Toggle activo/inactivo
- Ver cuántos usuarios tienen cada insignia

### Agregar al Sidebar

```typescript
// En Sidebar.tsx, sección Gamificación
{ label: 'Insignias', icon: Award, href: '/admin/gamificacion/insignias', roles: ['admin'] },
```

### Agregar ruta

```typescript
// En App.tsx
<Route
  path="/admin/gamificacion/insignias"
  element={
    <ProtectedRoute>
      <MainLayout>
        <InsigniasPage />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

---

## Mejoras Futuras Opcionales

### 1. Notificación al desbloquear
Mostrar modal/toast cuando `insigniasDesbloqueadas.length > 0` en la respuesta de asistencia.

### 2. Insignias por nivel
Agregar insignias que se desbloquean al alcanzar cierto nivel:
```typescript
case 'nivel_alcanzado':
  const nivelActual = await this.getNivelUsuario(perfilId);
  cumpleCondicion = nivelActual.numero >= insignia.condicionValor;
  break;
```

### 3. Insignias por eventos especiales
```typescript
case 'eventos_d13':
  const eventosD13 = await this.prisma.eventoEspecialRegistro.count({
    where: { usuarioGamId: perfilId, evento: { codigo: 'd13' } },
  });
  cumpleCondicion = eventosD13 >= insignia.condicionValor;
  break;
```

### 4. Insignias temporales/de temporada
Agregar campo `fechaExpiracion` para insignias que solo se pueden obtener en cierto período.

### 5. Rareza de insignias
Agregar campo `rareza` ('comun', 'raro', 'epico', 'legendario') para mostrar visualmente.

---

## Notas Importantes

1. **Las insignias son permanentes** - No se pierden al cerrar períodos de ranking
2. **Se verifican automáticamente** - No requiere acción manual del admin
3. **Solo se pueden obtener una vez** - Constraint unique en usuarios_insignias
4. **Los bonus se otorgan inmediatamente** - Al desbloquear, se suman puntos y XP
5. **activo: false** no quita la insignia a quienes ya la tienen, solo evita que nuevos usuarios la obtengan
