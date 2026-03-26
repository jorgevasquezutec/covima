import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificacionService } from '../gamificacion/gamificacion.service';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';
import { CalendarioService } from '../calendario/calendario.service';
import { EstadoTurno } from '@prisma/client';
import {
  CreateTipoRolDto,
  UpdateTipoRolDto,
  AgregarMiembrosDto,
  ReorderMiembrosDto,
  GenerarTurnosDto,
  CreateTurnoDto,
  UpdateTurnoDto,
} from './dto';

@Injectable()
export class RolesServicioService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GamificacionService))
    private readonly gamificacionService: GamificacionService,
    @Inject(forwardRef(() => WhatsappBotService))
    private readonly whatsappService: WhatsappBotService,
    private readonly calendarioService: CalendarioService,
  ) {}

  // ==================== TIPOS DE ROL ====================

  async findAllTipos() {
    return this.prisma.tipoRolServicio.findMany({
      include: {
        coordinador: { select: { id: true, nombre: true } },
        _count: { select: { miembros: true, turnos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async createTipo(dto: CreateTipoRolDto) {
    return this.prisma.tipoRolServicio.create({
      data: dto,
      include: {
        coordinador: { select: { id: true, nombre: true } },
        _count: { select: { miembros: true, turnos: true } },
      },
    });
  }

  async updateTipo(id: number, dto: UpdateTipoRolDto) {
    await this.findTipoOrFail(id);
    return this.prisma.tipoRolServicio.update({
      where: { id },
      data: dto,
      include: {
        coordinador: { select: { id: true, nombre: true } },
        _count: { select: { miembros: true, turnos: true } },
      },
    });
  }

  async deleteTipo(id: number) {
    await this.findTipoOrFail(id);
    await this.prisma.tipoRolServicio.delete({ where: { id } });
    return { message: 'Tipo de rol eliminado' };
  }

  // ==================== MIEMBROS ====================

  async findMiembros(tipoRolId: number) {
    await this.findTipoOrFail(tipoRolId);
    return this.prisma.miembroRolServicio.findMany({
      where: { tipoRolId, activo: true },
      include: {
        usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
      },
      orderBy: { orden: 'asc' },
    });
  }

  async agregarMiembros(tipoRolId: number, dto: AgregarMiembrosDto) {
    await this.findTipoOrFail(tipoRolId);

    // Get max orden
    const maxOrden = await this.prisma.miembroRolServicio.aggregate({
      where: { tipoRolId },
      _max: { orden: true },
    });
    let nextOrden = (maxOrden._max.orden ?? -1) + 1;

    const results: any[] = [];
    for (const m of dto.miembros) {
      if (!m.usuarioId && !m.nombreLibre) continue;

      try {
        const created = await this.prisma.miembroRolServicio.create({
          data: {
            tipoRolId,
            usuarioId: m.usuarioId,
            nombreLibre: m.nombreLibre,
            orden: nextOrden++,
          },
          include: {
            usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
          },
        });
        results.push(created);
      } catch (e: any) {
        // Skip duplicates (unique constraint)
        if (e.code === 'P2002') continue;
        throw e;
      }
    }
    return results;
  }

  async removeMiembro(miembroId: number) {
    const miembro = await this.prisma.miembroRolServicio.findUnique({
      where: { id: miembroId },
    });
    if (!miembro) throw new NotFoundException('Miembro no encontrado');

    await this.prisma.miembroRolServicio.delete({ where: { id: miembroId } });
    return { message: 'Miembro eliminado del pool' };
  }

  async reorderMiembros(tipoRolId: number, dto: ReorderMiembrosDto) {
    await this.findTipoOrFail(tipoRolId);

    const updates = dto.orden.map((miembroId, index) =>
      this.prisma.miembroRolServicio.update({
        where: { id: miembroId },
        data: { orden: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findMiembros(tipoRolId);
  }

  // ==================== TURNOS ====================

  async findTurnos(tipoRolId: number, desde?: string, hasta?: string) {
    await this.findTipoOrFail(tipoRolId);

    const where: any = { tipoRolId };
    if (desde || hasta) {
      where.semana = {};
      if (desde) where.semana.gte = new Date(desde);
      if (hasta) where.semana.lte = new Date(hasta);
    }

    return this.prisma.turnoRolServicio.findMany({
      where,
      include: {
        tipoRol: { select: { id: true, nombre: true, icono: true, color: true, opcionesTexto: true, coordinador: { select: { id: true, nombre: true } } } },
        asignaciones: {
          include: {
            miembro: {
              include: {
                usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { semana: 'asc' },
    });
  }

  async createTurno(tipoRolId: number, dto: CreateTurnoDto, adminId: number) {
    const tipoRol = await this.findTipoOrFail(tipoRolId);

    const semana = new Date(dto.semana);

    // Check if turn already exists for this week
    const existing = await this.prisma.turnoRolServicio.findUnique({
      where: { tipoRolId_semana: { tipoRolId, semana } },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un turno para esa semana');
    }

    const turno = await this.prisma.turnoRolServicio.create({
      data: {
        tipoRolId,
        semana,
        notas: dto.notas,
        asignaciones: {
          create: dto.miembroIds.map((miembroId, index) => ({
            miembroId,
            orden: index + 1,
          })),
        },
      },
      include: {
        tipoRol: { select: { id: true, nombre: true, icono: true, color: true } },
        asignaciones: {
          include: {
            miembro: {
              include: {
                usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
    });

    await this.syncCalendarioCrear(turno, tipoRol, adminId);

    return turno;
  }

  async generarRotacion(tipoRolId: number, dto: GenerarTurnosDto, adminId: number) {
    const tipo = await this.prisma.tipoRolServicio.findUnique({
      where: { id: tipoRolId },
      include: {
        miembros: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
    if (!tipo) throw new NotFoundException('Tipo de rol no encontrado');
    if (tipo.miembros.length === 0) {
      throw new BadRequestException('No hay miembros activos en el pool');
    }

    const miembros = tipo.miembros;
    const porTurno = tipo.personasPorTurno;

    // Find last existing turn to determine continuation point
    const ultimoTurno = await this.prisma.turnoRolServicio.findFirst({
      where: { tipoRolId },
      orderBy: { semana: 'desc' },
      include: {
        asignaciones: {
          include: { miembro: true },
          orderBy: { orden: 'desc' },
        },
      },
    });

    // Calculate miembroIndex from last assigned member
    let miembroIndex = 0;
    if (ultimoTurno && ultimoTurno.asignaciones.length > 0) {
      const ultimoMiembro = ultimoTurno.asignaciones[0]; // highest orden = last assigned
      const posicion = miembros.findIndex(
        (m) => m.id === ultimoMiembro.miembroId,
      );
      // If found, start from next position; if not found (member removed), start from 0
      miembroIndex = posicion >= 0 ? posicion + 1 : 0;
    }

    // Calculate fechaDesde: use provided or next Saturday after last turn
    let fechaDesde: Date;
    if (dto.fechaDesde) {
      fechaDesde = new Date(dto.fechaDesde);
    } else if (ultimoTurno) {
      fechaDesde = new Date(ultimoTurno.semana);
      fechaDesde.setDate(fechaDesde.getDate() + 7);
    } else {
      // No turns exist: start from next Saturday
      fechaDesde = new Date();
      const day = fechaDesde.getDay();
      fechaDesde.setDate(fechaDesde.getDate() + (6 - day + (day === 6 ? 7 : 0)));
    }
    const fechaHasta = new Date(dto.fechaHasta);

    // Generate Saturday dates in range
    const sabados: Date[] = [];
    const current = new Date(fechaDesde);
    // Move to next Saturday if not already Saturday
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 6) {
      current.setDate(current.getDate() + (6 - dayOfWeek));
    }
    while (current <= fechaHasta) {
      sabados.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }

    if (sabados.length === 0) {
      throw new BadRequestException('No hay sábados en el rango de fechas');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const turnosCreados: any[] = [];

      for (const sabado of sabados) {
        // Skip if turn already exists for this Saturday
        const existing = await tx.turnoRolServicio.findUnique({
          where: { tipoRolId_semana: { tipoRolId, semana: sabado } },
        });
        if (existing) continue;

        // Pick members for this turn
        const asignados: { miembroId: number; orden: number }[] = [];
        for (let i = 0; i < porTurno; i++) {
          asignados.push({
            miembroId: miembros[miembroIndex % miembros.length].id,
            orden: i + 1,
          });
          miembroIndex++;
        }

        const turno = await tx.turnoRolServicio.create({
          data: {
            tipoRolId,
            semana: sabado,
            asignaciones: {
              create: asignados,
            },
          },
          include: {
            asignaciones: {
              include: {
                miembro: {
                  include: {
                    usuario: { select: { id: true, nombre: true } },
                  },
                },
              },
            },
          },
        });
        turnosCreados.push(turno);
      }

      return { turnosCreados: turnosCreados.length, turnos: turnosCreados };
    });

    // Sync calendario outside the transaction
    for (const turno of result.turnos) {
      await this.syncCalendarioCrear(turno, tipo, adminId);
    }

    return result;
  }

  async updateTurno(turnoId: number, dto: UpdateTurnoDto) {
    const turno = await this.prisma.turnoRolServicio.findUnique({
      where: { id: turnoId },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // Update notas
      if (dto.notas !== undefined) {
        await tx.turnoRolServicio.update({
          where: { id: turnoId },
          data: { notas: dto.notas },
        });
      }

      // Replace assignments if miembroIds provided
      if (dto.miembroIds) {
        await tx.asignacionTurno.deleteMany({ where: { turnoId } });
        await tx.asignacionTurno.createMany({
          data: dto.miembroIds.map((miembroId, index) => ({
            turnoId,
            miembroId,
            orden: index + 1,
          })),
        });
      }

      return tx.turnoRolServicio.findUnique({
        where: { id: turnoId },
        include: {
          tipoRol: { select: { id: true, nombre: true, icono: true, color: true } },
          asignaciones: {
            include: {
              miembro: {
                include: {
                  usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
                },
              },
            },
            orderBy: { orden: 'asc' },
          },
        },
      });
    });
  }

  async completarTurno(turnoId: number, adminId: number) {
    const turno = await this.prisma.turnoRolServicio.findUnique({
      where: { id: turnoId },
      include: {
        asignaciones: {
          include: {
            miembro: { select: { usuarioId: true } },
          },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (turno.estado !== EstadoTurno.PROGRAMADO) {
      throw new BadRequestException('Solo se pueden completar turnos programados');
    }

    // Mark as completed
    await this.prisma.turnoRolServicio.update({
      where: { id: turnoId },
      data: {
        estado: EstadoTurno.COMPLETADO,
        completadoAt: new Date(),
        completadoPorId: adminId,
      },
    });

    // Award points to each assigned member with a user account
    const resultadosPuntos: any[] = [];
    for (const asignacion of turno.asignaciones) {
      if (asignacion.miembro.usuarioId) {
        try {
          const resultado = await this.gamificacionService.asignarPuntos(
            asignacion.miembro.usuarioId,
            'rol_servicio_completado',
            turnoId,
            'rol_servicio',
          );
          resultadosPuntos.push({
            usuarioId: asignacion.miembro.usuarioId,
            ...resultado,
          });
        } catch {
          // Config might not exist yet, skip silently
        }
      }
    }

    return {
      message: 'Turno marcado como completado',
      puntosAsignados: resultadosPuntos.length,
      resultados: resultadosPuntos,
    };
  }

  async eliminarTurno(turnoId: number) {
    const turno = await this.prisma.turnoRolServicio.findUnique({
      where: { id: turnoId },
      include: { tipoRol: { select: { nombre: true, icono: true } } },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');

    // Remove matching calendario activity
    await this.syncCalendarioEliminar(turno.tipoRol.nombre, turno.tipoRol.icono, turno.semana);

    await this.prisma.turnoRolServicio.delete({ where: { id: turnoId } });

    return { message: 'Turno eliminado' };
  }

  // ==================== NOTIFICACIONES ====================

  async notificarTurno(turnoId: number) {
    const turno = await this.prisma.turnoRolServicio.findUnique({
      where: { id: turnoId },
      include: {
        tipoRol: {
          include: {
            coordinador: { select: { id: true, nombre: true } },
          },
        },
        asignaciones: {
          include: {
            miembro: {
              include: {
                usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
    });
    if (!turno) throw new NotFoundException('Turno no encontrado');

    const todosLosNombres = turno.asignaciones
      .map((a) => a.miembro.usuario?.nombre || a.miembro.nombreLibre || 'Sin nombre')
      .join(', ');

    const coordinadorNombre = turno.tipoRol.coordinador?.nombre || 'No asignado';
    const opcionesTexto = turno.tipoRol.opcionesTexto || '';
    const resultados: any[] = [];

    for (const asignacion of turno.asignaciones) {
      const usuario = asignacion.miembro.usuario;
      if (!usuario) continue;

      const telefono = `${usuario.codigoPais}${usuario.telefono}`;
      try {
        const result = await this.whatsappService.sendTemplateToPhone(
          telefono,
          'rol_servicio_recordatorio',
          'es_PE',
          [usuario.nombre, turno.tipoRol.nombre, todosLosNombres, opcionesTexto, coordinadorNombre],
        );

        await this.prisma.asignacionTurno.update({
          where: { id: asignacion.id },
          data: {
            notificado: true,
            notificadoAt: new Date(),
            errorNotif: result.success ? null : result.error,
          },
        });

        resultados.push({
          miembroId: asignacion.miembroId,
          nombre: usuario.nombre,
          success: result.success,
          error: result.error,
        });
      } catch (error: any) {
        await this.prisma.asignacionTurno.update({
          where: { id: asignacion.id },
          data: {
            errorNotif: error.message || 'Error desconocido',
          },
        });
        resultados.push({
          miembroId: asignacion.miembroId,
          nombre: usuario.nombre,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      totalNotificados: resultados.filter((r) => r.success).length,
      totalErrores: resultados.filter((r) => !r.success).length,
      resultados,
    };
  }

  // ==================== CALENDARIO SYNC ====================

  private buildTituloCalendario(icono: string | null, nombre: string): string {
    return icono ? `${icono} ${nombre}` : nombre;
  }

  private async syncCalendarioCrear(
    turno: { semana: Date; notas?: string | null; asignaciones?: any[] },
    tipoRol: { nombre: string; icono?: string | null; color?: string | null },
    adminId: number,
  ) {
    try {
      const titulo = this.buildTituloCalendario(tipoRol.icono ?? null, tipoRol.nombre);
      const nombres = (turno.asignaciones || [])
        .map((a: any) => a.miembro?.usuario?.nombre || a.miembro?.nombreLibre || 'Sin nombre')
        .join(', ');
      const descripcion = [nombres, turno.notas].filter(Boolean).join('\n');

      await this.calendarioService.createActividad(
        {
          titulo,
          descripcion: descripcion || undefined,
          fecha: turno.semana.toISOString().split('T')[0],
          color: tipoRol.color || '#3B82F6',
          icono: 'Calendar',
        } as any,
        adminId,
      );
    } catch {
      // Non-critical: don't fail the turno operation if calendario sync fails
    }
  }

  private async syncCalendarioEliminar(nombre: string, icono: string | null, semana: Date) {
    try {
      const titulo = this.buildTituloCalendario(icono, nombre);
      const actividad = await this.prisma.actividad.findFirst({
        where: {
          titulo,
          fecha: semana,
        },
      });
      if (actividad) {
        await this.prisma.actividad.delete({ where: { id: actividad.id } });
      }
    } catch {
      // Non-critical
    }
  }

  // ==================== HELPERS ====================

  private async findTipoOrFail(id: number) {
    const tipo = await this.prisma.tipoRolServicio.findUnique({
      where: { id },
    });
    if (!tipo) throw new NotFoundException('Tipo de rol no encontrado');
    return tipo;
  }
}
