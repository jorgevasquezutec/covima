import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatronRecurrencia } from '@prisma/client';
import {
  CreateActividadDto,
  UpdateActividadDto,
  ActividadCalendario,
} from './dto';

@Injectable()
export class CalendarioService {
  constructor(private prisma: PrismaService) {}

  // ==================== ACTIVIDADES ====================

  async getCalendarioMes(mes: number, anio: number) {
    // Validar parámetros
    if (mes < 1 || mes > 12) {
      throw new BadRequestException('El mes debe estar entre 1 y 12');
    }

    // Calcular primer y último día del mes
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0); // Último día del mes
    ultimoDia.setHours(23, 59, 59, 999);

    // Obtener actividades del mes
    const actividades = await this.prisma.actividad.findMany({
      where: {
        activo: true,
        fecha: {
          gte: primerDia,
          lte: ultimoDia,
        },
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
    });

    // Obtener actividades recurrentes que puedan expandirse en este mes
    const actividadesRecurrentes = await this.prisma.actividad.findMany({
      where: {
        activo: true,
        esRecurrente: true,
        actividadPadreId: null, // Solo las padres
        fecha: { lte: ultimoDia },
        OR: [
          { fechaFinRecurrencia: null },
          { fechaFinRecurrencia: { gte: primerDia } },
        ],
      },
    });

    // Expandir actividades recurrentes
    const instanciasRecurrentes = this.expandirRecurrentes(
      actividadesRecurrentes,
      primerDia,
      ultimoDia,
    );

    // Obtener cumpleaños del mes
    const cumpleanos = await this.getCumpleanosMes(mes, anio);

    // Combinar y ordenar todas las actividades
    const todasActividades: ActividadCalendario[] = [
      ...actividades
        .filter((a) => !a.actividadPadreId) // Excluir instancias ya creadas
        .map((a) => this.formatActividad(a)),
      ...instanciasRecurrentes,
      ...cumpleanos,
    ];

    // Ordenar por fecha y hora
    todasActividades.sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // Si misma fecha, ordenar por hora
      if (a.hora && b.hora) {
        return a.hora.localeCompare(b.hora);
      }
      return 0;
    });

    // Agrupar por día
    const actividadesPorDia: Record<string, ActividadCalendario[]> = {};
    for (const actividad of todasActividades) {
      const dia = actividad.fecha.split('T')[0];
      if (!actividadesPorDia[dia]) {
        actividadesPorDia[dia] = [];
      }
      actividadesPorDia[dia].push(actividad);
    }

    return {
      mes,
      anio,
      primerDia: primerDia.toISOString(),
      ultimoDia: ultimoDia.toISOString(),
      actividades: todasActividades,
      actividadesPorDia,
      totalActividades: todasActividades.length,
    };
  }

  private expandirRecurrentes(
    actividades: any[],
    primerDia: Date,
    ultimoDia: Date,
  ): ActividadCalendario[] {
    const instancias: ActividadCalendario[] = [];

    for (const actividad of actividades) {
      const fechaInicio = new Date(actividad.fecha);
      const fechaFinRecurrencia = actividad.fechaFinRecurrencia
        ? new Date(actividad.fechaFinRecurrencia)
        : ultimoDia;

      // Determinar el límite de expansión
      const limite = fechaFinRecurrencia < ultimoDia ? fechaFinRecurrencia : ultimoDia;

      let fechaActual = new Date(fechaInicio);

      // Iterar según el patrón
      while (fechaActual <= limite) {
        // Solo incluir si está dentro del mes consultado
        if (fechaActual >= primerDia && fechaActual <= ultimoDia) {
          // No incluir la fecha original si ya está en actividades normales
          if (fechaActual.getTime() !== fechaInicio.getTime()) {
            instancias.push({
              id: actividad.id,
              titulo: actividad.titulo,
              descripcion: actividad.descripcion,
              fecha: fechaActual.toISOString(),
              hora: actividad.hora,
              horaFin: actividad.horaFin,
              color: actividad.color,
              icono: actividad.icono,
              esRecurrente: true,
              actividadPadreId: actividad.id,
              esInstanciaRecurrente: true,
            });
          }
        }

        // Avanzar según el patrón
        fechaActual = this.avanzarFechaRecurrente(
          fechaActual,
          actividad.patronRecurrencia,
          actividad.diaSemana,
          actividad.semanaMes,
        );
      }
    }

    return instancias;
  }

  private avanzarFechaRecurrente(
    fecha: Date,
    patron: PatronRecurrencia,
    diaSemana: number | null,
    semanaMes: number | null,
  ): Date {
    const nueva = new Date(fecha);

    switch (patron) {
      case PatronRecurrencia.SEMANAL:
        nueva.setDate(nueva.getDate() + 7);
        break;

      case PatronRecurrencia.QUINCENAL:
        nueva.setDate(nueva.getDate() + 14);
        break;

      case PatronRecurrencia.MENSUAL:
        // Mismo día del mes siguiente
        nueva.setMonth(nueva.getMonth() + 1);
        break;

      case PatronRecurrencia.MENSUAL_DIA:
        // Ej: "Segundo martes del mes"
        if (diaSemana !== null && semanaMes !== null) {
          nueva.setMonth(nueva.getMonth() + 1);
          nueva.setDate(1);
          // Encontrar el n-ésimo día de la semana del mes
          let count = 0;
          while (count < semanaMes) {
            if (nueva.getDay() === diaSemana) {
              count++;
              if (count < semanaMes) {
                nueva.setDate(nueva.getDate() + 7);
              }
            } else {
              nueva.setDate(nueva.getDate() + 1);
            }
          }
        } else {
          nueva.setMonth(nueva.getMonth() + 1);
        }
        break;

      default:
        // NINGUNO - no debería llegar aquí
        nueva.setFullYear(9999); // Fecha muy lejana para terminar el loop
        break;
    }

    return nueva;
  }

  private async getCumpleanosMes(mes: number, anio: number): Promise<ActividadCalendario[]> {
    // Obtener usuarios con cumpleaños en este mes
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        activo: true,
        fechaNacimiento: { not: null },
      },
      select: {
        id: true,
        nombre: true,
        fotoUrl: true,
        fechaNacimiento: true,
      },
    });

    // Filtrar los que cumplen en este mes
    const cumpleanos: ActividadCalendario[] = [];
    for (const usuario of usuarios) {
      if (!usuario.fechaNacimiento) continue;

      const fechaNac = new Date(usuario.fechaNacimiento);
      if (fechaNac.getUTCMonth() + 1 === mes) {
        // Crear fecha de cumpleaños para este año (usar UTC para evitar desfase de zona horaria)
        const fechaCumple = new Date(Date.UTC(anio, mes - 1, fechaNac.getUTCDate()));

        cumpleanos.push({
          id: -usuario.id, // ID negativo para distinguir de actividades reales
          titulo: `Cumpleaños de ${usuario.nombre}`,
          descripcion: null,
          fecha: fechaCumple.toISOString(),
          hora: null,
          horaFin: null,
          color: '#EC4899', // Pink for birthdays
          icono: 'Cake',
          esRecurrente: false,
          esCumpleanos: true,
          usuarioCumpleanos: {
            id: usuario.id,
            nombre: usuario.nombre,
            fotoUrl: usuario.fotoUrl,
          },
          actividadPadreId: null,
        });
      }
    }

    return cumpleanos;
  }

  async createActividad(dto: CreateActividadDto, creadoPorId: number) {
    // Crear la actividad
    const actividad = await this.prisma.actividad.create({
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        fecha: new Date(dto.fecha),
        hora: dto.hora,
        horaFin: dto.horaFin,
        color: dto.color || '#3B82F6',
        icono: dto.icono || 'Calendar',
        esRecurrente: dto.esRecurrente ?? false,
        patronRecurrencia: dto.patronRecurrencia ?? PatronRecurrencia.NINGUNO,
        fechaFinRecurrencia: dto.fechaFinRecurrencia ? new Date(dto.fechaFinRecurrencia) : null,
        diaSemana: dto.diaSemana,
        semanaMes: dto.semanaMes,
        creadoPorId,
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true },
        },
      },
    });

    return this.formatActividad(actividad);
  }

  async updateActividad(id: number, dto: UpdateActividadDto) {
    const actividad = await this.prisma.actividad.findUnique({
      where: { id },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    const updated = await this.prisma.actividad.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        hora: dto.hora,
        horaFin: dto.horaFin,
        color: dto.color,
        icono: dto.icono,
        esRecurrente: dto.esRecurrente,
        patronRecurrencia: dto.patronRecurrencia,
        fechaFinRecurrencia: dto.fechaFinRecurrencia
          ? new Date(dto.fechaFinRecurrencia)
          : dto.fechaFinRecurrencia === null
            ? null
            : undefined,
        diaSemana: dto.diaSemana,
        semanaMes: dto.semanaMes,
        activo: dto.activo,
      },
      include: {
        creadoPor: {
          select: { id: true, nombre: true },
        },
      },
    });

    return this.formatActividad(updated);
  }

  async deleteActividad(id: number) {
    const actividad = await this.prisma.actividad.findUnique({
      where: { id },
      include: {
        instancias: true,
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    // Si tiene instancias (es padre de recurrentes), eliminarlas también
    if (actividad.instancias.length > 0) {
      await this.prisma.actividad.deleteMany({
        where: { actividadPadreId: id },
      });
    }

    await this.prisma.actividad.delete({ where: { id } });

    return {
      message: 'Actividad eliminada correctamente',
      instanciasEliminadas: actividad.instancias.length,
    };
  }

  async deleteSerieRecurrente(id: number) {
    // Obtener la actividad padre
    const actividad = await this.prisma.actividad.findUnique({
      where: { id },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    // Si es una instancia, buscar el padre
    const padreId = actividad.actividadPadreId || id;

    // Eliminar todas las instancias
    const deleted = await this.prisma.actividad.deleteMany({
      where: {
        OR: [{ id: padreId }, { actividadPadreId: padreId }],
      },
    });

    return {
      message: 'Serie recurrente eliminada correctamente',
      actividadesEliminadas: deleted.count,
    };
  }

  async findAllActividades(options?: {
    page?: number;
    limit?: number;
    desde?: string;
    hasta?: string;
  }) {
    const { page = 1, limit = 20, desde, hasta } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {
      actividadPadreId: null, // Solo actividades padre
    };

    if (desde || hasta) {
      where.fecha = {};
      if (desde) {
        where.fecha.gte = new Date(desde);
      }
      if (hasta) {
        where.fecha.lte = new Date(hasta);
      }
    }

    const [actividades, total] = await Promise.all([
      this.prisma.actividad.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          creadoPor: {
            select: { id: true, nombre: true },
          },
        },
      }),
      this.prisma.actividad.count({ where }),
    ]);

    return {
      data: actividades.map((a) => this.formatActividad(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActividadById(id: number) {
    const actividad = await this.prisma.actividad.findUnique({
      where: { id },
      include: {
        creadoPor: {
          select: { id: true, nombre: true },
        },
        instancias: {
          select: { id: true, fecha: true },
          orderBy: { fecha: 'asc' },
        },
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return this.formatActividad(actividad);
  }

  private formatActividad(actividad: any): ActividadCalendario {
    return {
      id: actividad.id,
      titulo: actividad.titulo,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha instanceof Date ? actividad.fecha.toISOString() : actividad.fecha,
      hora: actividad.hora,
      horaFin: actividad.horaFin,
      color: actividad.color,
      icono: actividad.icono,
      esRecurrente: actividad.esRecurrente,
      actividadPadreId: actividad.actividadPadreId,
    };
  }
}
