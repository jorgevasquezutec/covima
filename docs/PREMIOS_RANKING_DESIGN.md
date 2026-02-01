# Sistema de Premios por Ranking

## 1. Resumen Ejecutivo

Sistema para configurar y gestionar premios físicos que se otorgan a los ganadores de los rankings al finalizar cada período. Los premios se configuran por período y pueden asignarse a:
- **Ranking por Nivel**: Premios para los mejores de cada nivel bíblico (Discípulo, Diácono, etc.)
- **Ranking de Grupos**: Premios para grupos específicos (Líderes, Equipo Música, etc.)

### Lo que YA existe (no modificar):

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ NivelBiblico (10 niveles)                               │
│     Discípulo → Diácono → Anciano → Levita → Sacerdote     │
│     → Profeta → Apóstol → Evangelista → Querubín → Serafín │
│                                                             │
│  ✅ Ranking por Nivel                                       │
│     Los usuarios compiten con otros de su mismo nivel       │
│                                                             │
│  ✅ Grupos de Ranking                                       │
│     General, Líderes, personalizados                        │
│                                                             │
│  ✅ Períodos de Ranking                                     │
│     Configurables con fecha inicio/fin                      │
└─────────────────────────────────────────────────────────────┘
```

### Lo que se AGREGA:

```
┌─────────────────────────────────────────────────────────────┐
│  🆕 PremioRanking                                           │
│     Configurar premios por período/nivel/grupo              │
│                                                             │
│  🆕 PremioGanador                                           │
│     Registrar ganadores y estado de entrega                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF01 | Los premios se configuran por período de ranking | Alta |
| RF02 | Premios pueden asignarse a niveles bíblicos específicos | Alta |
| RF03 | Premios pueden asignarse a grupos de ranking | Alta |
| RF04 | La cantidad de posiciones premiadas es configurable (1°, 2°, 3°...) | Alta |
| RF05 | Al cerrar período, se registran ganadores automáticamente | Alta |
| RF06 | Se debe poder marcar un premio como "entregado" | Alta |
| RF07 | Historial de premios ganados por usuario | Media |
| RF08 | Notificación por WhatsApp a ganadores | Media |
| RF09 | Reportes de premios pendientes de entrega | Baja |

---

## 3. Modelo de Datos

### 3.1 Diagrama Entidad-Relación

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PeriodoRanking  │     │   NivelBiblico   │     │   GrupoRanking   │
│  ──────────────  │     │   ────────────   │     │   ────────────   │
│  id              │     │   id             │     │   id             │
│  nombre          │     │   nombre         │     │   codigo         │
│  estado          │     │   numero         │     │   nombre         │
│  fechaInicio     │     │   icono          │     │   tipo           │
│  fechaFin        │     │                  │     │                  │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │         ┌──────────────┴────────────────────────┘
         │         │
         ▼         ▼
┌──────────────────────────────────────────────────────────────┐
│                      PremioRanking                            │
│                      ──────────────                           │
│  id                                                          │
│  periodoId          → PeriodoRanking.id                      │
│  nivelId?           → NivelBiblico.id (null = no aplica)     │
│  grupoRankingId?    → GrupoRanking.id (null = no aplica)     │
│  posicion           (1 = 1° lugar, 2 = 2° lugar, etc.)       │
│  nombre             ("Biblia de Estudio")                    │
│  descripcion        ("Biblia RVR1960 tapa dura")             │
│  imagenUrl?         (foto del premio)                        │
│  activo             (true/false)                             │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ (se crea al cerrar período)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                      PremioGanador                            │
│                      ─────────────                            │
│  id                                                          │
│  premioRankingId    → PremioRanking.id                       │
│  usuarioId          → Usuario.id                             │
│  posicionFinal      (posición en que quedó)                  │
│  puntosFinales      (puntos al cerrar período)               │
│  estado             (PENDIENTE / ENTREGADO)                  │
│  fechaRegistro      (cuando se cerró el período)             │
│  fechaEntrega?      (cuando se entregó físicamente)          │
│  entregadoPorId?    → Usuario.id (admin que entregó)         │
│  notas?             (observaciones)                          │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Esquema Prisma

```prisma
// Configuración de premios por período
model PremioRanking {
  id              Int           @id @default(autoincrement())

  // Período al que pertenece
  periodoId       Int
  periodo         PeriodoRanking @relation(fields: [periodoId], references: [id])

  // A quién aplica el premio (solo uno debe tener valor)
  nivelId         Int?          // Premio para ranking de este nivel
  nivel           NivelBiblico? @relation(fields: [nivelId], references: [id])

  grupoRankingId  Int?          // Premio para este grupo de ranking
  grupoRanking    GrupoRanking? @relation(fields: [grupoRankingId], references: [id])

  // Configuración del premio
  posicion        Int           // 1 = primer lugar, 2 = segundo, etc.
  nombre          String        @db.VarChar(100)
  descripcion     String?       @db.Text
  imagenUrl       String?       @db.VarChar(500)

  activo          Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Ganadores de este premio
  ganadores       PremioGanador[]

  // Un premio por posición por nivel/grupo en un período
  @@unique([periodoId, nivelId, posicion])
  @@unique([periodoId, grupoRankingId, posicion])
  @@index([periodoId])
  @@map("premios_ranking")
}

// Registro de ganadores
model PremioGanador {
  id               Int            @id @default(autoincrement())

  // Relaciones
  premioRankingId  Int
  premioRanking    PremioRanking  @relation(fields: [premioRankingId], references: [id])

  usuarioId        Int
  usuario          Usuario        @relation(fields: [usuarioId], references: [id])

  // Snapshot del momento de ganar
  posicionFinal    Int            // Posición en que quedó
  puntosFinales    Int            // Puntos al cerrar período

  // Estado de entrega
  estado           EstadoPremio   @default(PENDIENTE)
  fechaRegistro    DateTime       @default(now())
  fechaEntrega     DateTime?
  entregadoPorId   Int?
  entregadoPor     Usuario?       @relation("PremioEntregadoPor", fields: [entregadoPorId], references: [id])
  notas            String?        @db.Text

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([premioRankingId, usuarioId])
  @@index([usuarioId])
  @@index([estado])
  @@map("premios_ganadores")
}

enum EstadoPremio {
  PENDIENTE
  ENTREGADO
}
```

---

## 4. Flujos de Trabajo

### 4.1 Configuración de Premios (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin abre configuración del período                    │
│                           │                                  │
│                           ▼                                  │
│  2. Selecciona "Gestionar Premios"                          │
│                           │                                  │
│                           ▼                                  │
│  3. Configura premios por nivel bíblico:                    │
│     ┌─────────────────────────────────────────────┐        │
│     │  Nivel Sacerdote:                            │        │
│     │  • 1° lugar: Biblia de Estudio [+ imagen]   │        │
│     │  • 2° lugar: Libro devocional  [+ imagen]   │        │
│     │  [+ Agregar posición]                        │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  4. Configura premios por grupo:                            │
│     ┌─────────────────────────────────────────────┐        │
│     │  Grupo Líderes:                              │        │
│     │  • 1° lugar: Kit de liderazgo [+ imagen]    │        │
│     │  [+ Agregar posición]                        │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  5. Guardar configuración                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Cierre de Período (Automático)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin cierra el período de ranking                      │
│                           │                                  │
│                           ▼                                  │
│  2. Sistema procesa premios por NIVEL:                      │
│     ┌─────────────────────────────────────────────┐        │
│     │  Para cada nivel con premios configurados:  │        │
│     │  a. Obtener ranking del nivel               │        │
│     │  b. Para cada posición premiada:            │        │
│     │     - Obtener usuario en esa posición       │        │
│     │     - Crear PremioGanador (PENDIENTE)       │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  3. Sistema procesa premios por GRUPO:                      │
│     ┌─────────────────────────────────────────────┐        │
│     │  Para cada grupo con premios configurados:  │        │
│     │  a. Obtener ranking del grupo               │        │
│     │  b. Para cada posición premiada:            │        │
│     │     - Obtener usuario en esa posición       │        │
│     │     - Crear PremioGanador (PENDIENTE)       │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  4. Notificar ganadores por WhatsApp                        │
│     "🎉 ¡Felicidades! Ganaste el 1° lugar..."              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Entrega de Premios (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin ve lista de premios pendientes                    │
│                           │                                  │
│                           ▼                                  │
│  2. Filtrar por período / nivel / grupo / estado            │
│                           │                                  │
│                           ▼                                  │
│  3. Seleccionar premio a entregar                           │
│                           │                                  │
│                           ▼                                  │
│  4. Marcar como "Entregado"                                 │
│     ┌─────────────────────────────────────────────┐        │
│     │  • Fecha de entrega: [auto: hoy]            │        │
│     │  • Notas: [opcional]                        │        │
│     │  • Entregado por: [auto: admin actual]      │        │
│     └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

### 5.1 Gestión de Premios (Admin)

```
POST   /api/gamificacion/premios
       Crear premio para un período
       Body: { periodoId, nivelId?, grupoRankingId?, posicion, nombre, descripcion?, imagenUrl? }

GET    /api/gamificacion/premios?periodoId=X
       Listar premios configurados para un período

GET    /api/gamificacion/premios/:id
       Obtener detalle de un premio

PUT    /api/gamificacion/premios/:id
       Actualizar premio

DELETE /api/gamificacion/premios/:id
       Eliminar premio (solo si no tiene ganadores)
```

### 5.2 Gestión de Ganadores (Admin)

```
GET    /api/gamificacion/premios/ganadores?periodoId=X&estado=PENDIENTE
       Listar ganadores (filtrable por período, nivel, grupo, estado)

PUT    /api/gamificacion/premios/ganadores/:id/entregar
       Marcar premio como entregado
       Body: { notas? }

GET    /api/gamificacion/premios/ganadores/pendientes
       Resumen de premios pendientes de entrega
```

### 5.3 Vista Usuario

```
GET    /api/gamificacion/mis-premios
       Historial de premios ganados por el usuario actual

GET    /api/gamificacion/premios/disponibles?periodoId=X
       Ver premios disponibles en el período actual (para motivación)
```

---

## 6. Interfaces de Usuario

### 6.1 Usuario: Vista en Ranking

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Ranking Sacerdotes - Enero 2026                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏆 PREMIOS DISPONIBLES                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🥇 1° lugar: Biblia de Estudio Thompson             │   │
│  │ 🥈 2° lugar: Libro "El Conflicto"                   │   │
│  │ 🥉 3° lugar: Cuaderno de notas premium              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RANKING:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥇 1. María García      ████████████████  850 pts  │   │
│  │  🥈 2. Juan Pérez        ██████████████    720 pts  │   │
│  │  🥉 3. Pedro López       █████████████     680 pts  │   │
│  │     4. Ana Martínez      ████████████      620 pts  │   │
│  │     ...                                              │   │
│  │    12. TÚ                ████████          420 pts ◄│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Usuario: Mis Premios

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Mis Premios                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Enero 2026 ───────────────────────────────────────┐  │
│  │ 🥇 1° lugar en Ranking Sacerdotes                    │  │
│  │    🎁 Biblia de Estudio Thompson                     │  │
│  │    ✅ Entregado el 15 de febrero 2026                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── Diciembre 2025 ───────────────────────────────────┐  │
│  │ 🥉 3° lugar en Ranking Líderes                       │  │
│  │    🎁 Cuaderno de notas premium                      │  │
│  │    ⏳ Pendiente de entrega                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Admin: Configuración de Premios

```
┌─────────────────────────────────────────────────────────────┐
│  Premios - Período Enero 2026                     [+ Nuevo] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POR NIVEL BÍBLICO:                                         │
│  ┌─── 🙏 Sacerdote ─────────────────────────────────────┐  │
│  │ 🥇 1° lugar: Biblia de Estudio Thompson  [Editar][X] │  │
│  │ 🥈 2° lugar: Libro "El Conflicto"        [Editar][X] │  │
│  │                                  [+ Agregar premio]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── 📜 Profeta ───────────────────────────────────────┐  │
│  │ 🥇 1° lugar: Viaje a retiro          [Editar][X]     │  │
│  │                                  [+ Agregar premio]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  POR GRUPO:                                                 │
│  ┌─── 👑 Líderes ───────────────────────────────────────┐  │
│  │ 🥇 1° lugar: Kit de liderazgo        [Editar][X]     │  │
│  │ 🥈 2° lugar: Libro "Liderazgo 101"   [Editar][X]     │  │
│  │                                  [+ Agregar premio]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Admin: Entrega de Premios

```
┌─────────────────────────────────────────────────────────────┐
│  Entrega de Premios                                         │
├─────────────────────────────────────────────────────────────┤
│  Período: [Enero 2026 ▼]  Estado: [Pendiente ▼]             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 👤 María García                                       │ │
│  │    🏆 1° lugar - Ranking Sacerdotes                   │ │
│  │    🎁 Biblia de Estudio Thompson                      │ │
│  │    📊 850 puntos                                      │ │
│  │    ⏳ Pendiente                     [Marcar Entregado] │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 👤 Juan Pérez                                         │ │
│  │    🏆 1° lugar - Grupo Líderes                        │ │
│  │    🎁 Kit de liderazgo                                │ │
│  │    📊 1,280 puntos                                    │ │
│  │    ⏳ Pendiente                     [Marcar Entregado] │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Consideraciones Técnicas

### 7.1 Integración con Cierre de Período

Modificar `GamificacionService.cerrarPeriodo()`:

```typescript
async cerrarPeriodo(periodoId: number, adminId: number) {
  // ... código existente ...

  // NUEVO: Asignar premios a ganadores
  await this.asignarPremiosGanadores(periodoId);

  // ... resto del código ...
}

private async asignarPremiosGanadores(periodoId: number) {
  // 1. Obtener todos los premios configurados para este período
  const premios = await this.prisma.premioRanking.findMany({
    where: { periodoId, activo: true },
    include: { nivel: true, grupoRanking: true }
  });

  for (const premio of premios) {
    let ranking: any[];

    // 2. Obtener ranking correspondiente
    if (premio.nivelId) {
      // Premio por nivel bíblico
      ranking = await this.getRankingNivel(premio.nivelId, periodoId);
    } else if (premio.grupoRankingId) {
      // Premio por grupo
      ranking = await this.getRankingGrupo(premio.grupoRankingId, periodoId);
    } else {
      continue; // No tiene nivel ni grupo, saltar
    }

    // 3. Obtener usuario en la posición del premio
    const ganador = ranking.find(r => r.posicion === premio.posicion);

    if (ganador) {
      // 4. Crear registro de ganador
      await this.prisma.premioGanador.create({
        data: {
          premioRankingId: premio.id,
          usuarioId: ganador.usuarioId,
          posicionFinal: ganador.posicion,
          puntosFinales: ganador.puntosPeriodo,
          estado: 'PENDIENTE'
        }
      });

      // 5. Notificar por WhatsApp
      await this.notificarPremioGanado(ganador.usuarioId, premio);
    }
  }
}
```

### 7.2 Validaciones

- Premio debe tener `nivelId` O `grupoRankingId`, no ambos
- No se puede eliminar un `PremioRanking` si tiene `PremioGanador` asociados
- No se pueden crear premios para períodos ya cerrados
- No se puede marcar como entregado un premio que ya está entregado
- Posición debe ser >= 1

### 7.3 Índices de Base de Datos

```sql
-- Búsqueda rápida por período
CREATE INDEX idx_premios_ranking_periodo ON premios_ranking(periodo_id);

-- Búsqueda de ganadores pendientes
CREATE INDEX idx_premios_ganadores_estado ON premios_ganadores(estado);

-- Historial de premios por usuario
CREATE INDEX idx_premios_ganadores_usuario ON premios_ganadores(usuario_id);
```

---

## 8. Plan de Implementación

### Fase 1: Base de Datos
- [ ] Crear modelo `PremioRanking` en Prisma
- [ ] Crear modelo `PremioGanador` en Prisma
- [ ] Crear enum `EstadoPremio`
- [ ] Agregar relaciones a `NivelBiblico`, `GrupoRanking`, `PeriodoRanking`
- [ ] Crear y ejecutar migración

### Fase 2: API Backend
- [ ] CRUD de PremioRanking
- [ ] Endpoints de gestión de PremioGanador
- [ ] Integrar con `cerrarPeriodo()` para asignar ganadores
- [ ] Endpoint `/mis-premios` para usuarios
- [ ] Endpoint `/premios/disponibles` para mostrar en rankings

### Fase 3: Notificaciones
- [ ] Mensaje WhatsApp cuando gana un premio
- [ ] Mensaje WhatsApp cuando se entrega el premio

### Fase 4: Frontend Admin
- [ ] Página de configuración de premios por período
- [ ] Página de entrega de premios (lista + marcar entregado)
- [ ] Integrar en menú de administración

### Fase 5: Frontend Usuario
- [ ] Mostrar premios disponibles en vista de ranking
- [ ] Sección "Mis Premios" en Mi Progreso
- [ ] Badge/indicador cuando tiene premio pendiente

---

## 9. Preguntas Resueltas

| Pregunta | Decisión |
|----------|----------|
| ¿Notificar ganadores por WhatsApp? | ✅ Sí |
| ¿Sistema de ligas con descenso? | ❌ No - El ranking por nivel ya funciona bien |
| ¿Premios digitales o físicos? | Físicos (entrega manual) |

## 10. Preguntas Pendientes

1. ¿Se requiere foto de evidencia al entregar el premio?
2. ¿Los premios deben tener un valor monetario estimado para reportes?
3. ¿Se necesita un catálogo de premios reutilizables entre períodos?
4. ¿Qué pasa si hay empate en puntos para una posición premiada?
