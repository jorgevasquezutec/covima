import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EstudiosBiblicosService {
  constructor(private prisma: PrismaService) {}

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
   * Actualizar estudiante
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

    return this.prisma.estudianteBiblico.update({
      where: { id },
      data,
      include: {
        curso: true,
      },
    });
  }

  /**
   * Eliminar (desactivar) estudiante
   */
  async deleteEstudiante(id: number, instructorId: number) {
    const estudiante = await this.prisma.estudianteBiblico.findUnique({
      where: { id },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    if (estudiante.instructorId !== instructorId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }

    await this.prisma.estudianteBiblico.update({
      where: { id },
      data: { activo: false },
    });

    return { message: 'Estudiante eliminado' };
  }

  /**
   * Toggle lección (marcar/desmarcar como completada)
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
      // Si existe, eliminarlo (toggle off)
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

      return {
        leccion,
        completada: true,
        fechaCompletada: progreso.fechaCompletada,
        message: `Lección ${leccion} completada`,
      };
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
}
