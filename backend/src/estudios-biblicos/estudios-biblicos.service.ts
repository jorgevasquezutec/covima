import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificacionService } from '../gamificacion/gamificacion.service';

@Injectable()
export class EstudiosBiblicosService {
  constructor(
    private prisma: PrismaService,
    private gamificacionService: GamificacionService,
  ) {}

  /**
   * Obtener todos los cursos bíblicos activos
   */
  async getCursos() {
    return this.prisma.cursoBiblico.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }

  /**
   * Obtener mis estudiantes (como instructor) con paginación y búsqueda
   */
  async getMisEstudiantes(
    instructorId: number,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      cursoId?: number;
    },
  ) {
    const { page = 1, limit = 10, search, cursoId } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {
      instructorId,
      activo: true,
    };

    if (search) {
      where.nombre = { contains: search, mode: 'insensitive' };
    }

    if (cursoId) {
      where.cursoId = cursoId;
    }

    const [estudiantes, total] = await Promise.all([
      this.prisma.estudianteBiblico.findMany({
        where,
        include: {
          curso: true,
          progreso: {
            where: { completada: true },
            orderBy: { leccion: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.estudianteBiblico.count({ where }),
    ]);

    // Agregar conteo de lecciones completadas
    const data = estudiantes.map((est) => ({
      ...est,
      leccionesCompletadas: est.progreso.length,
      totalLecciones: est.curso.totalLecciones,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener detalle de un estudiante
   */
  async getEstudiante(id: number, instructorId: number) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id },
      include: {
        curso: true,
        progreso: {
          orderBy: { leccion: 'asc' },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Verificar que el usuario sea el instructor
    if (estudiante.instructorId !== instructorId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }

    // Crear array de lecciones con estado
    const lecciones: { numero: number; completada: boolean; fechaCompletada: Date | null }[] = [];
    for (let i = 1; i <= estudiante.curso.totalLecciones; i++) {
      const progreso = estudiante.progreso.find((p) => p.leccion === i);
      lecciones.push({
        numero: i,
        completada: progreso?.completada || false,
        fechaCompletada: progreso?.fechaCompletada || null,
      });
    }

    return {
      ...estudiante,
      lecciones,
      leccionesCompletadas: estudiante.progreso.filter((p) => p.completada)
        .length,
    };
  }

  /**
   * Crear nuevo estudiante
   */
  async createEstudiante(
    instructorId: number,
    data: {
      nombre: string;
      fechaNacimiento?: Date;
      estadoCivil?: string;
      telefono?: string;
      direccion?: string;
      notas?: string;
      cursoId: number;
    },
  ) {
    // Verificar que el curso existe
    const curso = await this.prisma.cursoBiblico.findUnique({
      where: { id: data.cursoId },
    });

    if (!curso) {
      throw new NotFoundException('Curso no encontrado');
    }

    return this.prisma.estudianteBiblico.create({
      data: {
        ...data,
        instructorId,
      },
      include: {
        curso: true,
      },
    });
  }

  /**
   * Actualizar estudiante - con gamificación para bautismo
   */
  async updateEstudiante(
    id: number,
    instructorId: number,
    data: {
      nombre?: string;
      fechaNacimiento?: Date;
      estadoCivil?: string;
      telefono?: string;
      direccion?: string;
      notas?: string;
      cursoId?: number;
      fechaBautismo?: Date;
    },
  ) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.instructorId !== instructorId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }

    // Verificar si se está registrando bautismo por primera vez
    const registrandoBautismo = data.fechaBautismo && !estudiante.fechaBautismo;

    const updated = await this.prisma.estudianteBiblico.update({
      where: { id },
      data,
      include: {
        curso: true,
      },
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

        // Verificar insignias de bautismo (las insignias se verifican automáticamente
        // en asignarPuntos via verificarInsignias)
      } catch (e) {
        console.error('Error asignando puntos por bautismo:', e);
      }
    }

    return updated;
  }

  /**
   * Eliminar (desactivar) estudiante - con lógica anti-farming
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
      (Date.now() - estudiante.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasDesdeCreacion < 7 && !estudiante.fechaBautismo) {
      // Calcular puntos a restar (solo lecciones desde #3)
      const leccionesConPuntos = estudiante.progreso.filter(p => p.leccion >= 3).length;

      if (leccionesConPuntos > 0) {
        try {
          // Restar puntos (3 pts y 5 xp por lección según la configuración)
          await this.gamificacionService.restarPuntos(
            instructorId,
            leccionesConPuntos * 3,  // puntos
            leccionesConPuntos * 5,  // xp
            `Estudiante "${estudiante.nombre}" eliminado antes de 7 días`,
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

  /**
   * Toggle lección (marcar/desmarcar como completada) - con gamificación
   */
  async toggleLeccion(
    estudianteId: number,
    leccion: number,
    instructorId: number,
  ) {
    // Verificar acceso
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id: estudianteId },
      include: { curso: true },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.instructorId !== instructorId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }

    // Validar número de lección
    if (leccion < 1 || leccion > estudiante.curso.totalLecciones) {
      throw new NotFoundException('Lección inválida');
    }

    // Buscar si ya existe el progreso
    const existente = await this.prisma.progresoLeccion.findUnique({
      where: {
        estudianteId_leccion: {
          estudianteId,
          leccion,
        },
      },
    });

    if (existente) {
      // Si existe, eliminarlo (toggle off) - NO quitar puntos (ya se ganaron)
      await this.prisma.progresoLeccion.delete({
        where: { id: existente.id },
      });

      return {
        leccion,
        completada: false,
        message: `Lección ${leccion} desmarcada`,
      };
    } else {
      // Si no existe, crearlo (toggle on)
      const progreso = await this.prisma.progresoLeccion.create({
        data: {
          estudianteId,
          leccion,
          completada: true,
          fechaCompletada: new Date(),
        },
      });

      // GAMIFICACIÓN: Solo dar puntos desde lección #3 (anti-farming)
      let gamificacionResult: Awaited<ReturnType<typeof this.gamificacionService.asignarPuntos>> | null = null;
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

      // Verificar hitos de progreso (50%, 100%)
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
   * Verificar hitos de progreso (50%, 100%) y otorgar bonus
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

    // Obtener perfil de gamificación del instructor
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId: instructorId },
    });

    if (!perfil) return;

    // Verificar si ya se otorgaron los bonus (evitar duplicados)
    const historial = await this.prisma.historialPuntos.findMany({
      where: {
        usuarioGamId: perfil.id,
        referenciaTipo: 'estudiante_hito',
        referenciaId: estudianteId,
      },
      include: { configPuntaje: true },
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
   * Estadísticas del instructor
   */
  async getEstadisticas(instructorId: number) {
    const estudiantes = await this.prisma.estudianteBiblico.findMany({
      where: {
        instructorId,
        activo: true,
      },
      include: {
        curso: true,
        progreso: {
          where: { completada: true },
        },
      },
    });

    const totalEstudiantes = estudiantes.length;
    const bautizados = estudiantes.filter((e) => e.fechaBautismo).length;
    const enProgreso = estudiantes.filter(
      (e) => !e.fechaBautismo && e.progreso.length > 0,
    ).length;
    const sinIniciar = estudiantes.filter((e) => e.progreso.length === 0).length;

    // Promedio de progreso
    const promedioProgreso =
      totalEstudiantes > 0
        ? Math.round(
            estudiantes.reduce(
              (acc, e) => acc + (e.progreso.length / e.curso.totalLecciones) * 100,
              0,
            ) / totalEstudiantes,
          )
        : 0;

    return {
      totalEstudiantes,
      bautizados,
      enProgreso,
      sinIniciar,
      promedioProgreso,
    };
  }

  // Estadísticas globales (todos los instructores) para dashboard admin
  async getEstadisticasGlobal() {
    const estudiantes = await this.prisma.estudianteBiblico.findMany({
      where: { activo: true },
      include: {
        curso: true,
        progreso: {
          where: { completada: true },
        },
      },
    });

    const totalEstudiantes = estudiantes.length;
    const bautizados = estudiantes.filter((e) => e.fechaBautismo).length;
    const enProgreso = estudiantes.filter(
      (e) => !e.fechaBautismo && e.progreso.length > 0,
    ).length;
    const sinIniciar = estudiantes.filter((e) => e.progreso.length === 0).length;

    const promedioProgreso =
      totalEstudiantes > 0
        ? Math.round(
            estudiantes.reduce(
              (acc, e) => acc + (e.progreso.length / e.curso.totalLecciones) * 100,
              0,
            ) / totalEstudiantes,
          )
        : 0;

    return {
      totalEstudiantes,
      bautizados,
      enProgreso,
      sinIniciar,
      promedioProgreso,
    };
  }
}
