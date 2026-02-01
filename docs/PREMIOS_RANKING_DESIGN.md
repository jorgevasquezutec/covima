# Sistema de Premios por Ranking

## 1. Resumen Ejecutivo

Sistema para gestionar premios físicos que se otorgan a los ganadores de los rankings al finalizar cada período. Los premios se configuran por período y pueden variar según el grupo de ranking.

---

## 2. Requisitos

### 2.1 Requisitos Funcionales

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF01 | Los premios se configuran por período de ranking | Alta |
| RF02 | Cada grupo de ranking puede tener premios diferentes | Alta |
| RF03 | La cantidad de posiciones premiadas es configurable | Alta |
| RF04 | Los premios son físicos (no digitales) | Alta |
| RF05 | La entrega de premios es manual (no automática) | Alta |
| RF06 | Al cerrar un período, se registran los ganadores automáticamente | Alta |
| RF07 | Se debe poder marcar un premio como "entregado" | Alta |
| RF08 | Historial de premios ganados por usuario | Media |
| RF09 | Reportes de premios pendientes de entrega | Media |

### 2.2 Casos de Uso

```
┌─────────────────────────────────────────────────────────────┐
│                        ADMIN                                 │
├─────────────────────────────────────────────────────────────┤
│  • Crear/editar premios para un período                     │
│  • Asignar premios a grupos de ranking específicos          │
│  • Definir qué posiciones reciben qué premio                │
│  • Cerrar período (auto-registra ganadores)                 │
│  • Marcar premio como entregado                             │
│  • Ver reportes de premios pendientes                       │
├─────────────────────────────────────────────────────────────┤
│                       USUARIO                                │
├─────────────────────────────────────────────────────────────┤
│  • Ver premios disponibles del período actual               │
│  • Ver historial de premios ganados                         │
│  • Ver estado de entrega de sus premios                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos

### 3.1 Diagrama Entidad-Relación

```
┌──────────────────┐         ┌──────────────────┐
│  PeriodoRanking  │         │   GrupoRanking   │
│  ──────────────  │         │   ────────────   │
│  id              │         │   id             │
│  nombre          │         │   codigo         │
│  estado          │         │   nombre         │
│  fechaInicio     │         │   tipo           │
│  fechaFin        │         │                  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │    ┌───────────────────────┘
         │    │
         ▼    ▼
┌──────────────────────────────────────────────────┐
│              PremioRanking                        │
│              ──────────────                       │
│  id                                              │
│  periodoId        → PeriodoRanking.id            │
│  grupoRankingId?  → GrupoRanking.id (nullable)   │
│  posicion         (1, 2, 3, etc.)                │
│  nombre           ("Biblia de Estudio")          │
│  descripcion      ("Biblia RVR1960 tapa dura")   │
│  imagenUrl?       (foto del premio)              │
│  activo           (true/false)                   │
│  createdAt                                       │
│  updatedAt                                       │
└────────────────────┬─────────────────────────────┘
                     │
                     │ (se crea al cerrar período)
                     ▼
┌──────────────────────────────────────────────────┐
│              PremioGanador                        │
│              ─────────────                        │
│  id                                              │
│  premioRankingId  → PremioRanking.id             │
│  usuarioId        → Usuario.id                   │
│  posicionFinal    (posición en que quedó)        │
│  puntosFinales    (puntos al cerrar período)     │
│  estado           (PENDIENTE/ENTREGADO)          │
│  fechaRegistro    (cuando se cerró el período)   │
│  fechaEntrega?    (cuando se entregó)            │
│  entregadoPorId?  → Usuario.id (admin)           │
│  notas?           (observaciones de entrega)     │
│  createdAt                                       │
│  updatedAt                                       │
└──────────────────────────────────────────────────┘
```

### 3.2 Esquema Prisma

```prisma
// Configuración de premios por período y grupo
model PremioRanking {
  id              Int           @id @default(autoincrement())

  // Relaciones
  periodoId       Int
  periodo         PeriodoRanking @relation(fields: [periodoId], references: [id])

  grupoRankingId  Int?          // null = aplica a TODOS los grupos
  grupoRanking    GrupoRanking? @relation(fields: [grupoRankingId], references: [id])

  // Configuración del premio
  posicion        Int           // 1 = primer lugar, 2 = segundo, etc.
  nombre          String        // "Biblia de Estudio"
  descripcion     String?       // Descripción detallada
  imagenUrl       String?       // URL de imagen del premio

  activo          Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Ganadores de este premio
  ganadores       PremioGanador[]

  @@unique([periodoId, grupoRankingId, posicion]) // Un premio por posición por grupo
  @@map("premios_ranking")
}

// Registro de ganadores (se crea al cerrar período)
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
  fechaRegistro    DateTime       @default(now()) // Cuando se cerró el período
  fechaEntrega     DateTime?      // Cuando se entregó físicamente
  entregadoPorId   Int?
  entregadoPor     Usuario?       @relation("PremioEntregadoPor", fields: [entregadoPorId], references: [id])
  notas            String?        // Observaciones

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([premioRankingId, usuarioId]) // Un usuario solo puede ganar un premio específico una vez
  @@map("premios_ganadores")
}

enum EstadoPremio {
  PENDIENTE   // Aún no se ha entregado
  ENTREGADO   // Ya se entregó físicamente
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
│  3. Para cada grupo de ranking (o "Todos"):                 │
│     ┌─────────────────────────────────────────────┐        │
│     │  • Posición 1: [Nombre] [Descripción] [Foto]│        │
│     │  • Posición 2: [Nombre] [Descripción] [Foto]│        │
│     │  • Posición 3: [Nombre] [Descripción] [Foto]│        │
│     │  • + Agregar posición                        │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  4. Guardar configuración                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Cierre de Período y Asignación de Ganadores

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin cierra el período de ranking                      │
│                           │                                  │
│                           ▼                                  │
│  2. Sistema obtiene ranking final de cada grupo             │
│                           │                                  │
│                           ▼                                  │
│  3. Para cada PremioRanking configurado:                    │
│     ┌─────────────────────────────────────────────┐        │
│     │  a. Obtener usuario en esa posición         │        │
│     │  b. Crear registro PremioGanador            │        │
│     │     - estado: PENDIENTE                     │        │
│     │     - posicionFinal: posición del usuario   │        │
│     │     - puntosFinales: puntos del usuario     │        │
│     └─────────────────────────────────────────────┘        │
│                           │                                  │
│                           ▼                                  │
│  4. Notificar a ganadores (opcional)                        │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Entrega de Premios (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin ve lista de premios pendientes                    │
│                           │                                  │
│                           ▼                                  │
│  2. Filtrar por período/grupo/estado                        │
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
│                           │                                  │
│                           ▼                                  │
│  5. Guardar y actualizar estado                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

### 5.1 Gestión de Premios (Admin)

```
POST   /api/gamificacion/premios
       Crear premio para un período/grupo/posición
       Body: { periodoId, grupoRankingId?, posicion, nombre, descripcion?, imagenUrl? }

GET    /api/gamificacion/premios?periodoId=X&grupoRankingId=Y
       Listar premios configurados

PUT    /api/gamificacion/premios/:id
       Actualizar premio

DELETE /api/gamificacion/premios/:id
       Eliminar premio (solo si no tiene ganadores)
```

### 5.2 Gestión de Ganadores (Admin)

```
GET    /api/gamificacion/premios/ganadores?periodoId=X&estado=PENDIENTE
       Listar ganadores (filtrable por período, grupo, estado)

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

GET    /api/gamificacion/premios/periodo/:periodoId/disponibles
       Ver premios disponibles en el período actual (motivación)
```

---

## 6. Interfaces de Usuario

### 6.1 Admin: Configuración de Premios

```
┌─────────────────────────────────────────────────────────────┐
│  Premios - Período Q1 2026                            [+ Nuevo]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Ranking General ───────────────────────────────────┐ │
│  │ 🥇 1° lugar: Biblia de Estudio Thompson    [Editar]   │ │
│  │ 🥈 2° lugar: Libro "El Conflicto"          [Editar]   │ │
│  │ 🥉 3° lugar: Cuaderno de notas premium     [Editar]   │ │
│  │                                    [+ Agregar premio]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── Ranking Líderes ───────────────────────────────────┐ │
│  │ 🥇 1° lugar: Kit de liderazgo              [Editar]   │ │
│  │ 🥈 2° lugar: Libro "Liderazgo 101"         [Editar]   │ │
│  │                                    [+ Agregar premio]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── Sin grupo (aplica a todos) ────────────────────────┐ │
│  │ (vacío)                            [+ Agregar premio]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Admin: Entrega de Premios

```
┌─────────────────────────────────────────────────────────────┐
│  Entrega de Premios                                         │
├─────────────────────────────────────────────────────────────┤
│  Período: [Q1 2026 ▼]  Grupo: [Todos ▼]  Estado: [Pendiente ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 👤 María García                                       │ │
│  │    🏆 1° lugar - Ranking General                      │ │
│  │    🎁 Biblia de Estudio Thompson                      │ │
│  │    📊 2,450 puntos                                    │ │
│  │    ⏳ Pendiente                      [Marcar Entregado]│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 👤 Juan Pérez                                         │ │
│  │    🏆 2° lugar - Ranking General                      │ │
│  │    🎁 Libro "El Conflicto"                            │ │
│  │    📊 2,280 puntos                                    │ │
│  │    ⏳ Pendiente                      [Marcar Entregado]│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Usuario: Mis Premios

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Mis Premios                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Q4 2025 ───────────────────────────────────────────┐ │
│  │ 🥇 1° lugar en Ranking General                        │ │
│  │    Premio: Biblia de Estudio Thompson                 │ │
│  │    ✅ Entregado el 15 de enero 2026                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─── Q3 2025 ───────────────────────────────────────────┐ │
│  │ 🥉 3° lugar en Ranking Líderes                        │ │
│  │    Premio: Cuaderno de notas premium                  │ │
│  │    ✅ Entregado el 10 de octubre 2025                 │ │
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
    where: { periodoId, activo: true }
  });

  // 2. Para cada premio, obtener el ranking correspondiente
  for (const premio of premios) {
    const ranking = await this.getRankingGrupo(
      premio.grupoRankingId,
      periodoId,
      premio.posicion // limit
    );

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
    }
  }
}
```

### 7.2 Validaciones

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

### Fase 1: Base de Datos (Backend)
- [ ] Crear migración Prisma con modelos
- [ ] Actualizar relaciones en modelos existentes

### Fase 2: API Backend
- [ ] CRUD de PremioRanking
- [ ] Gestión de PremioGanador
- [ ] Integrar con cierre de período
- [ ] Endpoint mis-premios para usuarios

### Fase 3: Frontend Admin
- [ ] Página de configuración de premios por período
- [ ] Página de entrega de premios
- [ ] Integrar en dashboard de admin

### Fase 4: Frontend Usuario
- [ ] Sección "Mis Premios" en Mi Progreso
- [ ] Mostrar premios disponibles en ranking actual

---

## 9. Preguntas Pendientes

1. ¿Se deben notificar a los ganadores por WhatsApp/email?
2. ¿Se requiere foto de evidencia al entregar el premio?
3. ¿Los premios deben tener un valor monetario estimado para reportes?
4. ¿Se necesita un catálogo de premios reutilizables entre períodos?
