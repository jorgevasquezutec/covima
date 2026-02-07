# Gamificación para Módulo "Mis Estudiantes"

## Resumen

Integrar el sistema de gamificación existente con el módulo de Estudios Bíblicos para incentivar a los instructores a dar estudios bíblicos y llevar personas al bautismo.

---

## Sistema de Puntos

### Acciones que otorgan puntos

| Acción | Puntos | XP | Condición |
|--------|--------|-----|-----------|
| Nuevo estudiante | 0 | 0 | No dar puntos (evita farming) |
| Lección completada | 3 | 5 | Solo desde la lección #3 |
| Estudiante 50% progreso | 10 | 15 | Bonus automático al llegar a mitad |
| Curso completado (100%) | 25 | 40 | Bonus al terminar todas las lecciones |
| Bautismo registrado | 50 | 100 | Logro máximo |

### Lógica anti-farming

```
1. NO dar puntos por crear estudiante
2. Solo dar puntos por lecciones desde la #3
3. Al borrar estudiante:
   - Si tiene < 7 días de antigüedad → restar puntos de lecciones
   - Si tiene ≥ 7 días → mantener puntos (trabajo legítimo)
4. Puntos de bautismo NUNCA se quitan
```

---

## Insignias

| Código | Nombre | Icono | Condición | Puntos Bonus | XP Bonus |
|--------|--------|-------|-----------|--------------|----------|
| `maestro` | Maestro | 🎓 | 10 estudiantes activos | 15 | 25 |
| `instructor_constante` | Instructor Constante | 📖 | 50 lecciones completadas | 25 | 40 |
| `pescador` | Pescador de Hombres | ✝️ | Primer bautismo | 20 | 50 |
| `evangelista` | Evangelista | 🌟 | 5 bautismos | 50 | 100 |
| `apostol_moderno` | Apóstol Moderno | 👑 | 10 bautismos | 100 | 200 |

---

## Implementación Backend

### 1. Agregar códigos de puntaje en seed.ts

**Archivo:** `backend/prisma/seed.ts`

```typescript
// En el array de puntajes, agregar:
{ codigo: 'leccion_completada', nombre: 'Lección Completada', categoria: CategoriaAccion.PARTICIPACION, puntos: 3, xp: 5 },
{ codigo: 'estudiante_50_progreso', nombre: 'Estudiante 50% Progreso', categoria: CategoriaAccion.BONUS, puntos: 10, xp: 15 },
{ codigo: 'curso_completado', nombre: 'Curso Completado', categoria: CategoriaAccion.BONUS, puntos: 25, xp: 40 },
{ codigo: 'bautismo_registrado', nombre: 'Bautismo Registrado', categoria: CategoriaAccion.BONUS, puntos: 50, xp: 100 },
```

### 2. Agregar insignias en seed.ts

```typescript
// En el array de insignias, agregar:
{ codigo: 'maestro', nombre: 'Maestro', descripcion: '10 estudiantes activos', icono: '🎓', condicionTipo: 'estudiantes_activos', condicionValor: 10, puntosBonus: 15, xpBonus: 25 },
{ codigo: 'instructor_constante', nombre: 'Instructor Constante', descripcion: '50 lecciones completadas', icono: '📖', condicionTipo: 'lecciones_dadas', condicionValor: 50, puntosBonus: 25, xpBonus: 40 },
{ codigo: 'pescador', nombre: 'Pescador de Hombres', descripcion: 'Primer bautismo', icono: '✝️', condicionTipo: 'bautismos', condicionValor: 1, puntosBonus: 20, xpBonus: 50 },
{ codigo: 'evangelista', nombre: 'Evangelista', descripcion: '5 bautismos', icono: '🌟', condicionTipo: 'bautismos', condicionValor: 5, puntosBonus: 50, xpBonus: 100 },
{ codigo: 'apostol_moderno', nombre: 'Apóstol Moderno', descripcion: '10 bautismos', icono: '👑', condicionTipo: 'bautismos', condicionValor: 10, puntosBonus: 100, xpBonus: 200 },
```

### 3. Modificar EstudiosBiblicosModule

**Archivo:** `backend/src/estudios-biblicos/estudios-biblicos.module.ts`

```typescript
import { GamificacionModule } from '../gamificacion/gamificacion.module';

@Module({
  imports: [
    PrismaModule,
    GamificacionModule,  // Agregar
  ],
  // ...
})
```

### 4. Modificar EstudiosBiblicosService

**Archivo:** `backend/src/estudios-biblicos/estudios-biblicos.service.ts`

```typescript
import { GamificacionService } from '../gamificacion/gamificacion.service';

@Injectable()
export class EstudiosBiblicosService {
  constructor(
    private prisma: PrismaService,
    private gamificacionService: GamificacionService,  // Agregar
  ) {}

  /**
   * Toggle lección - con gamificación
   */
  async toggleLeccion(estudianteId: number, leccion: number, instructorId: number) {
    // ... código existente de validación ...

    const existente = await this.prisma.progresoLeccion.findUnique({
      where: { estudianteId_leccion: { estudianteId, leccion } },
    });

    if (existente) {
      // Desmarcar lección - NO quitar puntos (ya se ganaron)
      await this.prisma.progresoLeccion.delete({ where: { id: existente.id } });
      return { leccion, completada: false, message: `Lección ${leccion} desmarcada` };
    } else {
      // Marcar lección como completada
      const progreso = await this.prisma.progresoLeccion.create({
        data: { estudianteId, leccion, completada: true, fechaCompletada: new Date() },
      });

      // GAMIFICACIÓN: Solo dar puntos desde lección #3
      let gamificacionResult = null;
      if (leccion >= 3) {
        try {
          gamificacionResult = await this.gamificacionService.asignarPuntos(
            instructorId,
            'leccion_completada',
            progreso.id,
            'leccion',
          );
        } catch (e) {
          console.error('Error asignando puntos por lección:', e);
        }
      }

      // Verificar hitos (50%, 100%)
      await this.verificarHitosProgreso(estudianteId, instructorId);

      return {
        leccion,
        completada: true,
        fechaCompletada: progreso.fechaCompletada,
        message: `Lección ${leccion} completada`,
        gamificacion: gamificacionResult,
      };
    }
  }

  /**
   * Verificar hitos de progreso (50%, 100%)
   */
  private async verificarHitosProgreso(estudianteId: number, instructorId: number) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id: estudianteId },
      include: {
        curso: true,
        progreso: { where: { completada: true } },
      },
    });

    if (!estudiante) return;

    const porcentaje = (estudiante.progreso.length / estudiante.curso.totalLecciones) * 100;

    // Verificar si ya se otorgó el bonus (evitar duplicados)
    const historial = await this.prisma.historialPuntos.findMany({
      where: {
        usuarioGam: { usuarioId: instructorId },
        referenciaTipo: 'estudiante_hito',
        referenciaId: estudianteId,
      },
    });

    const ya50 = historial.some(h => h.configPuntaje?.codigo === 'estudiante_50_progreso');
    const ya100 = historial.some(h => h.configPuntaje?.codigo === 'curso_completado');

    // Bonus 50%
    if (porcentaje >= 50 && !ya50) {
      try {
        await this.gamificacionService.asignarPuntos(
          instructorId,
          'estudiante_50_progreso',
          estudianteId,
          'estudiante_hito',
        );
      } catch (e) {
        console.error('Error asignando bonus 50%:', e);
      }
    }

    // Bonus 100%
    if (porcentaje >= 100 && !ya100) {
      try {
        await this.gamificacionService.asignarPuntos(
          instructorId,
          'curso_completado',
          estudianteId,
          'estudiante_hito',
        );
      } catch (e) {
        console.error('Error asignando bonus 100%:', e);
      }
    }
  }

  /**
   * Actualizar estudiante - con gamificación para bautismo
   */
  async updateEstudiante(id: number, instructorId: number, data: any) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id },
    });

    // ... validaciones existentes ...

    // Verificar si se está registrando bautismo por primera vez
    const registrandoBautismo = data.fechaBautismo && !estudiante.fechaBautismo;

    const updated = await this.prisma.estudianteBiblico.update({
      where: { id },
      data,
      include: { curso: true },
    });

    // GAMIFICACIÓN: Puntos por bautismo
    if (registrandoBautismo) {
      try {
        await this.gamificacionService.asignarPuntos(
          instructorId,
          'bautismo_registrado',
          id,
          'bautismo',
        );

        // Verificar insignias de bautismo
        await this.verificarInsigniasBautismo(instructorId);
      } catch (e) {
        console.error('Error asignando puntos por bautismo:', e);
      }
    }

    return updated;
  }

  /**
   * Verificar insignias de bautismo
   */
  private async verificarInsigniasBautismo(instructorId: number) {
    const totalBautismos = await this.prisma.estudianteBiblico.count({
      where: {
        instructorId,
        fechaBautismo: { not: null },
        activo: true,
      },
    });

    // Las insignias se verifican automáticamente en gamificacionService
    // basado en condicionTipo: 'bautismos' y condicionValor
  }

  /**
   * Eliminar estudiante - con lógica anti-farming
   */
  async deleteEstudiante(id: number, instructorId: number) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id },
      include: {
        progreso: { where: { completada: true } },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.instructorId !== instructorId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }

    // Anti-farming: restar puntos si < 7 días y no tiene bautismo
    const diasDesdeCreacion = Math.floor(
      (Date.now() - estudiante.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasDesdeCreacion < 7 && !estudiante.fechaBautismo) {
      // Calcular puntos a restar (solo lecciones desde #3)
      const leccionesConPuntos = estudiante.progreso.filter(p => p.leccion >= 3).length;

      if (leccionesConPuntos > 0) {
        try {
          // Restar puntos (3 pts por lección)
          await this.gamificacionService.restarPuntos(
            instructorId,
            leccionesConPuntos * 3,  // puntos
            leccionesConPuntos * 5,  // xp
            'Estudiante eliminado antes de 7 días',
          );
        } catch (e) {
          console.error('Error restando puntos:', e);
        }
      }
    }

    // Soft delete
    await this.prisma.estudianteBiblico.update({
      where: { id },
      data: { activo: false },
    });

    return { message: 'Estudiante eliminado' };
  }
}
```

### 5. Agregar método restarPuntos en GamificacionService

**Archivo:** `backend/src/gamificacion/gamificacion.service.ts`

```typescript
/**
 * Restar puntos a un usuario (para penalizaciones)
 */
async restarPuntos(
  usuarioId: number,
  puntos: number,
  xp: number,
  motivo: string,
) {
  const perfil = await this.getOrCreatePerfil(usuarioId);

  // No permitir puntos negativos
  const nuevosPuntos = Math.max(0, perfil.puntosTotal - puntos);
  const nuevosXp = Math.max(0, perfil.xpTotal - xp);

  await this.prisma.usuarioGamificacion.update({
    where: { id: perfil.id },
    data: {
      puntosTotal: nuevosPuntos,
      puntosTrimestre: Math.max(0, perfil.puntosTrimestre - puntos),
      xpTotal: nuevosXp,
    },
  });

  // Registrar en historial con puntos negativos
  await this.prisma.historialPuntos.create({
    data: {
      usuarioGamId: perfil.id,
      puntos: -puntos,
      xp: -xp,
      descripcion: motivo,
    },
  });

  return { puntosRestados: puntos, xpRestado: xp };
}
```

---

## Frontend (Opcional)

### Mostrar puntos ganados al completar lección

En `EstudianteDetallePage.tsx`, agregar toast con puntos:

```typescript
const toggleMutation = useMutation({
  // ...
  onSuccess: (data) => {
    if (data.gamificacion) {
      toast.success(
        `${data.message} (+${data.gamificacion.puntosAsignados} pts)`,
        { icon: '🎮' }
      );
    } else {
      toast.success(data.message);
    }
  },
});
```

### Mostrar confetti al registrar bautismo

Usar librería `canvas-confetti` para celebrar bautismos.

---

## Verificación

1. **Crear estudiante**: No debe dar puntos
2. **Completar lecciones 1-2**: No debe dar puntos
3. **Completar lección 3+**: Debe dar 3 pts, 5 XP
4. **Llegar a 50%**: Debe dar bonus 10 pts, 15 XP
5. **Llegar a 100%**: Debe dar bonus 25 pts, 40 XP
6. **Registrar bautismo**: Debe dar 50 pts, 100 XP
7. **Eliminar estudiante < 7 días**: Debe restar puntos de lecciones
8. **Eliminar estudiante ≥ 7 días**: No debe restar puntos
9. **Eliminar estudiante bautizado**: Nunca restar puntos de bautismo

---

## Pendiente

- [ ] Agregar puntajes al seed
- [ ] Agregar insignias al seed
- [ ] Modificar EstudiosBiblicosModule
- [ ] Modificar EstudiosBiblicosService
- [ ] Agregar método restarPuntos en GamificacionService
- [ ] Actualizar frontend para mostrar puntos ganados
- [ ] Probar flujo completo
