# Sistema de Rankings Múltiples

## Contexto del Problema

En la plataforma existen diferentes tipos de usuarios con diferentes necesidades:

| Tipo de Usuario | Descripción | ¿Participa en Ranking? |
|-----------------|-------------|------------------------|
| **Miembro activo** | Asiste regularmente, participa en programas | ✅ Sí |
| **Líder/Admin** | Dirige programas, tiene ventajas naturales | ⚠️ Debería estar separado |
| **Usuario pasivo** | Solo usa la app para ver el programa/notificaciones | ❌ No |
| **Invitado temporal** | Visitante, no es miembro regular | ❌ No |

### Problemas actuales:
1. Líderes/admin compiten con miembros regulares (injusto)
2. Usuarios pasivos aparecen en ranking con 0 puntos
3. No hay forma de crear competencias entre grupos específicos
4. No hay flexibilidad para eventos/challenges temporales

---

## Solución Propuesta

### Concepto: Grupos de Ranking

Un **Grupo de Ranking** define quiénes compiten entre sí. Puede ser:
- **Automático**: Basado en criterios (rol, todos los activos, etc.)
- **Manual**: Selección específica de usuarios por admin

```
┌─────────────────────────────────────────────────────────────────┐
│                         GRUPOS DE RANKING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   SISTEMA (automáticos, no eliminables)                         │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 📊 General                                               │   │
│   │    Todos los usuarios con participaEnRanking = true      │   │
│   │    Excluye: líderes, admin, usuarios pasivos             │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │ 👑 Líderes                                               │   │
│   │    Usuarios con rol 'lider' o 'admin'                    │   │
│   │    Competencia entre el equipo de liderazgo              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   PERSONALIZADOS (creados por admin)                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 🎵 Equipo de Música     → [Ana, Carlos, Pedro]          │   │
│   │ 📖 Grupo de Estudio     → [María, Juan, Luis]           │   │
│   │ ⛺ Campamento 2024      → [25 participantes]            │   │
│   │ 🏆 Reto Febrero         → [Inscritos voluntarios]       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Cambios en Usuario/UsuarioGamificacion

```prisma
model Usuario {
  // ... campos existentes ...

  // NUEVO: Control de participación en rankings
  participaEnRanking    Boolean   @default(true)  // false = nunca aparece en ningún ranking

  // Relación con grupos
  gruposRanking         GrupoRankingMiembro[]
}

model UsuarioGamificacion {
  // ... campos existentes ...

  // NUEVO: Auto-exclusión del ranking general (para líderes que quieren ocultarse)
  ocultoEnGeneral       Boolean   @default(false)
}
```

### Nuevos Modelos

```prisma
// ==================== GRUPOS DE RANKING ====================

enum TipoGrupoRanking {
  SISTEMA         // Creados por el sistema, no eliminables
  PERSONALIZADO   // Creados por admin
}

enum CriterioMembresia {
  MANUAL          // Admin selecciona usuarios uno a uno
  TODOS_ACTIVOS   // Todos con participaEnRanking = true
  ROL_LIDER       // Usuarios con rol 'lider'
  ROL_ADMIN       // Usuarios con rol 'admin'
  ROL_LIDER_ADMIN // Usuarios con rol 'lider' o 'admin'
}

model GrupoRanking {
  id              Int                 @id @default(autoincrement())
  codigo          String              @unique @db.VarChar(50)
  nombre          String              @db.VarChar(100)
  descripcion     String?             @db.Text
  icono           String?             @db.VarChar(10)   // Emoji
  color           String?             @db.VarChar(20)   // Hex color

  // Tipo y criterio
  tipo            TipoGrupoRanking    @default(PERSONALIZADO)
  criterio        CriterioMembresia   @default(MANUAL)

  // Configuración de visibilidad
  esPublico       Boolean             @default(true)    // Aparece en lista de rankings
  soloMiembros    Boolean             @default(false)   // Solo miembros pueden ver el ranking

  // Vinculación a período (opcional)
  periodoId       Int?                                  // null = usa período activo

  // Orden en UI
  orden           Int                 @default(0)

  // Estado
  activo          Boolean             @default(true)

  // Auditoría
  creadoPorId     Int?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relaciones
  miembros        GrupoRankingMiembro[]
  periodo         PeriodoRanking?     @relation(fields: [periodoId], references: [id])
  creadoPor       Usuario?            @relation("GrupoRankingCreador", fields: [creadoPorId], references: [id])

  @@map("grupos_ranking")
}

model GrupoRankingMiembro {
  id              Int       @id @default(autoincrement())
  grupoId         Int
  usuarioId       Int

  // Control individual de visibilidad
  oculto          Boolean   @default(false)   // Usuario puede ocultarse de este grupo

  // Auditoría
  agregadoPorId   Int?
  agregadoAt      DateTime  @default(now())

  // Relaciones
  grupo           GrupoRanking @relation(fields: [grupoId], references: [id], onDelete: Cascade)
  usuario         Usuario      @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  agregadoPor     Usuario?     @relation("MiembroAgregadoPor", fields: [agregadoPorId], references: [id])

  @@unique([grupoId, usuarioId])
  @@map("grupos_ranking_miembros")
}
```

---

## Lógica de Negocio

### ¿Quién aparece en cada ranking?

```typescript
// Ranking General (Sistema)
function getUsuariosRankingGeneral() {
  return usuarios.filter(u =>
    u.participaEnRanking === true &&           // Usuario activo en rankings
    !u.roles.includes('lider') &&              // No es líder
    !u.roles.includes('admin') &&              // No es admin
    !u.gamificacion.ocultoEnGeneral            // No se ocultó voluntariamente
  );
}

// Ranking Líderes (Sistema)
function getUsuariosRankingLideres() {
  return usuarios.filter(u =>
    u.participaEnRanking === true &&
    (u.roles.includes('lider') || u.roles.includes('admin'))
  );
}

// Ranking Personalizado
function getUsuariosRankingPersonalizado(grupoId: number) {
  return grupoRankingMiembros
    .filter(m =>
      m.grupoId === grupoId &&
      m.usuario.participaEnRanking === true &&
      !m.oculto
    )
    .map(m => m.usuario);
}
```

### Matriz de Visibilidad

| Usuario | participaEnRanking | Rol | ocultoEnGeneral | Aparece en General | Aparece en Líderes |
|---------|-------------------|-----|-----------------|-------------------|-------------------|
| Juan | true | miembro | false | ✅ Sí | ❌ No |
| María | true | lider | false | ❌ No (por rol) | ✅ Sí |
| Pedro | true | admin | true | ❌ No | ✅ Sí |
| Ana | false | miembro | - | ❌ No | ❌ No |
| Carlos | true | lider | - | ❌ No (por rol) | ✅ Sí |

---

## Flujos de Usuario

### 1. Admin: Gestionar participación de usuarios

**Ubicación:** Página de Usuarios o nueva sección

```
┌─────────────────────────────────────────────────────────────┐
│  Configuración de Ranking - Juan Pérez                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Participación General                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Participa en rankings                              │   │
│  │   (Desactiva para usuarios que solo ven el programa) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Grupos de Ranking                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ General           (automático por rol)            │   │
│  │ ☐ Líderes           (no aplica - es miembro)        │   │
│  │ ☑ Equipo de Música  [Quitar]                        │   │
│  │ ☐ Grupo de Estudio  [Agregar]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Admin: Crear grupo de ranking personalizado

```
┌─────────────────────────────────────────────────────────────┐
│  Nuevo Grupo de Ranking                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nombre *                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Equipo de Música                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Descripción                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Ranking para el equipo de alabanza                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Icono    Color                                             │
│  [🎵 ▼]   [████████ ▼]                                      │
│                                                             │
│  Visibilidad                                                │
│  ○ Público (todos pueden ver)                               │
│  ● Solo miembros del grupo                                  │
│                                                             │
│  Miembros                    Buscar: [____________]         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Ana García                                         │   │
│  │ ☑ Carlos López                                       │   │
│  │ ☑ Pedro Martínez                                     │   │
│  │ ☐ María Rodríguez                                    │   │
│  │ ☐ Juan Pérez                                         │   │
│  │ ...                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [Cancelar]  [Crear Grupo]      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Usuario (Líder/Admin): Gestionar su visibilidad

**Ubicación:** Mi Progreso o Perfil

```
┌─────────────────────────────────────────────────────────────┐
│  Mi Visibilidad en Rankings                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Ranking General                                         │
│     Tu posición: #3 (245 pts)                               │
│     Estado: [Oculto ●]  ← Toggle                            │
│     ℹ️ Como líder, estás oculto por defecto                 │
│                                                             │
│  👑 Ranking Líderes                                         │
│     Tu posición: #1 (245 pts)                               │
│     Estado: Siempre visible                                 │
│                                                             │
│  🎵 Equipo de Música                                        │
│     Tu posición: #2 (245 pts)                               │
│     Estado: [Visible ○]  ← Toggle                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Todos: Ver rankings

**Ubicación:** RankingPage

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Rankings                           Período: [Q1 2024 ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────────┐ ┌─────────────┐      │
│  │📊      │ │👑      │ │🎵          │ │⛺           │      │
│  │General │ │Líderes │ │Eq. Música  │ │Campamento   │      │
│  │  ●     │ │        │ │            │ │             │      │
│  └────────┘ └────────┘ └────────────┘ └─────────────┘      │
│                                                             │
│  Tipo: [General ▼] [Asistencia ▼] [Participación ▼]        │
│                                                             │
│          🥇              🥈              🥉                 │
│         Juan           María           Pedro                │
│        450 pts        380 pts         350 pts               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ #  Usuario              Nivel       Puntos   Racha  │   │
│  │ 4  Ana García           Apóstol     320      8🔥    │   │
│  │ 5  Carlos López         Profeta     280      5🔥    │   │
│  │ 6  ★ Tú (Luis)          Maestro     250      3🔥    │   │
│  │ 7  Pedro Martínez       Discípulo   200      2🔥    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Grupos de Ranking

```typescript
// Listar grupos de ranking (visibles para el usuario)
GET /gamificacion/grupos-ranking
Response: GrupoRanking[]

// Obtener ranking de un grupo
GET /gamificacion/grupos-ranking/:id/ranking?periodoId=1&tipo=general
Response: RankingUsuario[]

// [Admin] CRUD de grupos
POST   /gamificacion/grupos-ranking
PUT    /gamificacion/grupos-ranking/:id
DELETE /gamificacion/grupos-ranking/:id

// [Admin] Gestionar miembros
POST   /gamificacion/grupos-ranking/:id/miembros
DELETE /gamificacion/grupos-ranking/:id/miembros/:usuarioId

// [Admin] Cambiar participación de usuario
PUT    /usuarios/:id/participacion-ranking
Body: { participaEnRanking: boolean }

// [Líder/Admin] Toggle visibilidad propia
PUT    /gamificacion/mi-visibilidad
Body: { grupoId: number, oculto: boolean }
```

---

## Seed Inicial

```typescript
// Grupos del sistema (no eliminables)
const gruposSistema = [
  {
    codigo: 'general',
    nombre: 'Ranking General',
    descripcion: 'Ranking de todos los miembros activos',
    icono: '📊',
    color: '#3B82F6',
    tipo: 'SISTEMA',
    criterio: 'TODOS_ACTIVOS', // Excluye líderes/admin automáticamente
    esPublico: true,
    orden: 1,
  },
  {
    codigo: 'lideres',
    nombre: 'Ranking Líderes',
    descripcion: 'Ranking del equipo de liderazgo',
    icono: '👑',
    color: '#F59E0B',
    tipo: 'SISTEMA',
    criterio: 'ROL_LIDER_ADMIN',
    esPublico: true,
    orden: 2,
  },
];
```

---

## Implementación por Fases

### Fase 1: Control básico de participación (Rápido)
**Archivos a modificar:**
- `schema.prisma`: Agregar `participaEnRanking` a Usuario
- `gamificacion.service.ts`: Filtrar en getRanking()
- `UsuariosPage.tsx`: Toggle para activar/desactivar participación

**Resultado:** Admin puede excluir usuarios del ranking

---

### Fase 2: Separar ranking de líderes
**Archivos a modificar:**
- `schema.prisma`: Agregar `ocultoEnGeneral` a UsuarioGamificacion
- `gamificacion.service.ts`: Lógica para ranking separado
- `RankingPage.tsx`: Tabs para General / Líderes

**Resultado:** Dos rankings del sistema funcionando

---

### Fase 3: Grupos personalizados
**Archivos nuevos:**
- `schema.prisma`: Modelos GrupoRanking, GrupoRankingMiembro
- `grupos-ranking.service.ts`
- `grupos-ranking.controller.ts`
- `GruposRankingPage.tsx` (admin)

**Resultado:** Admin puede crear rankings personalizados

---

### Fase 4: UI completa
**Archivos a modificar:**
- `RankingPage.tsx`: Mostrar todos los grupos como tabs/cards
- `MiProgresoPage.tsx`: Sección de visibilidad para líderes
- `UsuariosPage.tsx`: Gestión completa de grupos por usuario

**Resultado:** Sistema completo de rankings múltiples

---

## Consideraciones Técnicas

### Performance
- Los grupos del sistema usan queries directos (no tabla de miembros)
- Los grupos personalizados usan la tabla de miembros
- Índices en `grupos_ranking_miembros(grupo_id, usuario_id)`

### Caché
- El ranking se puede cachear por 5 minutos
- Invalidar al asignar puntos o cambiar membresías

### Migración
- Crear grupos del sistema automáticamente
- Usuarios existentes: `participaEnRanking = true` por defecto
- Líderes/admin: `ocultoEnGeneral = true` por defecto

---

## Resumen Ejecutivo

| Funcionalidad | Descripción |
|---------------|-------------|
| **Excluir del ranking** | Admin marca `participaEnRanking = false` en usuarios pasivos |
| **Ranking General** | Solo miembros activos (no líderes, no admin, no excluidos) |
| **Ranking Líderes** | Automático para rol lider/admin |
| **Ocultar voluntario** | Líderes pueden togglear visibilidad en General |
| **Grupos personalizados** | Admin crea grupos con usuarios específicos |
| **Múltiples rankings** | Un usuario puede estar en varios rankings |
| **Por período** | Cada grupo puede vincularse a un período específico |
