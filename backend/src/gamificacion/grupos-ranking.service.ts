import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoGrupoRanking, CriterioMembresia } from '@prisma/client';

export interface CrearGrupoRankingDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  esPublico?: boolean;
  soloMiembros?: boolean;
  periodoId?: number;
  miembrosIds?: number[];
}

export interface ActualizarGrupoRankingDto {
  nombre?: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  esPublico?: boolean;
  soloMiembros?: boolean;
  periodoId?: number;
  activo?: boolean;
}

export interface RankingGrupoUsuario {
  posicion: number;
  usuarioId: number;
  nombre: string;
  fotoUrl: string | null;
  nivelNumero: number;
  nivelNombre: string;
  nivelColor: string | null;
  puntosPeriodo: number;
  rachaActual: number;
  asistenciasTotales: number;
  esUsuarioActual?: boolean;
}

@Injectable()
export class GruposRankingService {
  constructor(private prisma: PrismaService) {}

  // Obtener todos los grupos visibles para un usuario
  async getGruposVisibles(usuarioId: number, roles: string[]) {
    const esAdmin = roles.includes('admin');
    const esLider = roles.includes('lider');

    const grupos = await this.prisma.grupoRanking.findMany({
      where: {
        activo: true,
        OR: [
          { esPublico: true },
          { soloMiembros: true, miembros: { some: { usuarioId } } },
          // Admin ve todos
          ...(esAdmin ? [{ esPublico: false }] : []),
        ],
      },
      include: {
        _count: { select: { miembros: true } },
        periodo: { select: { id: true, nombre: true, estado: true } },
      },
      orderBy: { orden: 'asc' },
    });

    // Filtrar grupos donde el usuario realmente participa según el criterio
    const gruposFiltrados = grupos.filter((g) => {
      // Admin ve todos
      if (esAdmin) return true;

      // Grupos SISTEMA con criterio de rol
      if (g.tipo === 'SISTEMA' && g.criterio === 'ROL_LIDER_ADMIN') {
        // Solo mostrar si es admin o líder
        return esLider;
      }

      // Todos los demás grupos (general, personalizados, etc.)
      return true;
    });

    // Calcular miembros reales para grupos del sistema
    const gruposConConteo = await Promise.all(
      gruposFiltrados.map(async (g) => {
        let totalMiembros = g._count.miembros;

        if (g.tipo === 'SISTEMA') {
          if (g.criterio === 'TODOS_ACTIVOS') {
            // Solo miembros JA activos (sin admin/lider)
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                esJA: true,
                roles: {
                  none: { rol: { nombre: { in: ['admin', 'lider'] } } },
                },
                OR: [
                  { gamificacion: null },
                  { gamificacion: { ocultoEnGeneral: false } },
                ],
              },
            });
          } else if (g.criterio === 'ROL_LIDER_ADMIN') {
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                roles: {
                  some: { rol: { nombre: { in: ['admin', 'lider'] } } },
                },
              },
            });
          }
        }

        return {
          id: g.id,
          codigo: g.codigo,
          nombre: g.nombre,
          descripcion: g.descripcion,
          icono: g.icono,
          color: g.color,
          tipo: g.tipo,
          criterio: g.criterio,
          esPublico: g.esPublico,
          soloMiembros: g.soloMiembros,
          totalMiembros,
          periodo: g.periodo,
          activo: g.activo,
        };
      }),
    );

    return gruposConConteo;
  }

  // Obtener todos los grupos (admin)
  async getAllGrupos() {
    const grupos = await this.prisma.grupoRanking.findMany({
      include: {
        _count: { select: { miembros: true } },
        periodo: { select: { id: true, nombre: true, estado: true } },
        creadoPor: { select: { id: true, nombre: true } },
      },
      orderBy: { orden: 'asc' },
    });

    // Calcular miembros reales para grupos del sistema
    const gruposConConteo = await Promise.all(
      grupos.map(async (g) => {
        let totalMiembros = g._count.miembros;

        // Para grupos del sistema, contar usuarios que cumplen el criterio
        if (g.tipo === 'SISTEMA') {
          if (g.criterio === 'TODOS_ACTIVOS') {
            // Solo miembros JA activos (sin admin/lider)
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                esJA: true,
                roles: {
                  none: { rol: { nombre: { in: ['admin', 'lider'] } } },
                },
                OR: [
                  { gamificacion: null },
                  { gamificacion: { ocultoEnGeneral: false } },
                ],
              },
            });
          } else if (g.criterio === 'ROL_LIDER_ADMIN') {
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                roles: {
                  some: { rol: { nombre: { in: ['admin', 'lider'] } } },
                },
              },
            });
          } else if (g.criterio === 'ROL_LIDER') {
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                roles: { some: { rol: { nombre: 'lider' } } },
              },
            });
          } else if (g.criterio === 'ROL_ADMIN') {
            totalMiembros = await this.prisma.usuario.count({
              where: {
                activo: true,
                participaEnRanking: true,
                roles: { some: { rol: { nombre: 'admin' } } },
              },
            });
          }
        }

        return {
          ...g,
          totalMiembros,
        };
      }),
    );

    return gruposConConteo;
  }

  // Obtener un grupo por ID
  async getGrupo(id: number) {
    const grupo = await this.prisma.grupoRanking.findUnique({
      where: { id },
      include: {
        miembros: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                fotoUrl: true,
                gamificacion: {
                  select: { nivel: { select: { nombre: true, color: true } } },
                },
              },
            },
          },
        },
        periodo: true,
        creadoPor: { select: { id: true, nombre: true } },
      },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    return grupo;
  }

  // Crear grupo personalizado
  async crearGrupo(dto: CrearGrupoRankingDto, creadoPorId: number) {
    // Validar que el código no exista
    const existente = await this.prisma.grupoRanking.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existente) {
      throw new BadRequestException(
        `Ya existe un grupo con el código "${dto.codigo}"`,
      );
    }

    // Obtener el máximo orden
    const maxOrden = await this.prisma.grupoRanking.aggregate({
      _max: { orden: true },
    });

    const grupo = await this.prisma.grupoRanking.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        icono: dto.icono || '🏆',
        color: dto.color || '#6366F1',
        tipo: TipoGrupoRanking.PERSONALIZADO,
        criterio: CriterioMembresia.MANUAL,
        esPublico: dto.esPublico ?? true,
        soloMiembros: dto.soloMiembros ?? false,
        periodoId: dto.periodoId,
        orden: (maxOrden._max.orden || 0) + 1,
        creadoPorId,
      },
    });

    // Agregar miembros iniciales si se proporcionaron
    if (dto.miembrosIds && dto.miembrosIds.length > 0) {
      await this.prisma.grupoRankingMiembro.createMany({
        data: dto.miembrosIds.map((usuarioId) => ({
          grupoId: grupo.id,
          usuarioId,
          agregadoPorId: creadoPorId,
        })),
        skipDuplicates: true,
      });
    }

    return grupo;
  }

  // Actualizar grupo
  async actualizarGrupo(id: number, dto: ActualizarGrupoRankingDto) {
    const grupo = await this.prisma.grupoRanking.findUnique({ where: { id } });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    // No permitir editar grupos del sistema (excepto algunos campos)
    if (grupo.tipo === TipoGrupoRanking.SISTEMA) {
      // Solo permitir cambiar nombre, descripcion, icono, color
      const { esPublico, soloMiembros, periodoId, activo, ...allowedFields } =
        dto;
      return this.prisma.grupoRanking.update({
        where: { id },
        data: allowedFields,
      });
    }

    return this.prisma.grupoRanking.update({
      where: { id },
      data: dto,
    });
  }

  // Convertir grupo del sistema a personalizado
  async convertirAPersonalizado(id: number, convertidoPorId: number) {
    const grupo = await this.prisma.grupoRanking.findUnique({ where: { id } });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    if (grupo.tipo === TipoGrupoRanking.PERSONALIZADO) {
      throw new BadRequestException('Este grupo ya es personalizado');
    }

    // Obtener usuarios que actualmente cumplen el criterio
    let usuariosIds: number[] = [];

    if (grupo.criterio === CriterioMembresia.TODOS_ACTIVOS) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { none: { rol: { nombre: { in: ['admin', 'lider'] } } } },
          OR: [
            { gamificacion: null },
            { gamificacion: { ocultoEnGeneral: false } },
          ],
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER_ADMIN) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { some: { rol: { nombre: { in: ['admin', 'lider'] } } } },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { some: { rol: { nombre: 'lider' } } },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_ADMIN) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { some: { rol: { nombre: 'admin' } } },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    }

    // Crear miembros en la tabla
    if (usuariosIds.length > 0) {
      await this.prisma.grupoRankingMiembro.createMany({
        data: usuariosIds.map((usuarioId) => ({
          grupoId: id,
          usuarioId,
          agregadoPorId: convertidoPorId,
        })),
        skipDuplicates: true,
      });
    }

    // Cambiar tipo a PERSONALIZADO
    const grupoActualizado = await this.prisma.grupoRanking.update({
      where: { id },
      data: {
        tipo: TipoGrupoRanking.PERSONALIZADO,
        criterio: CriterioMembresia.MANUAL,
      },
    });

    return {
      grupo: grupoActualizado,
      miembrosAgregados: usuariosIds.length,
      mensaje: `Grupo convertido a personalizado con ${usuariosIds.length} miembros`,
    };
  }

  // Eliminar grupo (solo personalizados)
  async eliminarGrupo(id: number) {
    const grupo = await this.prisma.grupoRanking.findUnique({ where: { id } });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    if (grupo.tipo === TipoGrupoRanking.SISTEMA) {
      throw new ForbiddenException('No se pueden eliminar grupos del sistema');
    }

    await this.prisma.grupoRanking.delete({ where: { id } });

    return { message: 'Grupo eliminado correctamente' };
  }

  // Obtener miembros de un grupo (funciona para grupos del sistema y personalizados)
  async getMiembrosGrupo(grupoId: number) {
    const grupo = await this.prisma.grupoRanking.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    // Para grupos personalizados, obtener de la tabla de miembros
    if (grupo.tipo === TipoGrupoRanking.PERSONALIZADO) {
      const miembros = await this.prisma.grupoRankingMiembro.findMany({
        where: { grupoId },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              fotoUrl: true,
              activo: true,
              roles: { include: { rol: { select: { nombre: true } } } },
            },
          },
        },
        orderBy: { usuario: { nombre: 'asc' } },
      });

      return miembros.map((m) => ({
        id: m.usuario.id,
        nombre: m.usuario.nombre,
        fotoUrl: m.usuario.fotoUrl,
        activo: m.usuario.activo,
        roles: m.usuario.roles.map((r) => r.rol.nombre),
      }));
    }

    // Para grupos del sistema, calcular dinámicamente con la misma lógica del conteo
    let whereClause: any = { activo: true };

    if (grupo.criterio === CriterioMembresia.TODOS_ACTIVOS) {
      // Ranking general: solo miembros JA activos (sin admin/lider)
      whereClause = {
        activo: true,
        participaEnRanking: true,
        esJA: true,
        roles: { none: { rol: { nombre: { in: ['admin', 'lider'] } } } },
        OR: [
          { gamificacion: null },
          { gamificacion: { ocultoEnGeneral: false } },
        ],
      };
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER_ADMIN) {
      whereClause = {
        activo: true,
        participaEnRanking: true,
        roles: { some: { rol: { nombre: { in: ['admin', 'lider'] } } } },
      };
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER) {
      whereClause = {
        activo: true,
        participaEnRanking: true,
        roles: { some: { rol: { nombre: 'lider' } } },
      };
    } else if (grupo.criterio === CriterioMembresia.ROL_ADMIN) {
      whereClause = {
        activo: true,
        participaEnRanking: true,
        roles: { some: { rol: { nombre: 'admin' } } },
      };
    }

    const usuarios = await this.prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        fotoUrl: true,
        activo: true,
        roles: { include: { rol: { select: { nombre: true } } } },
      },
      orderBy: { nombre: 'asc' },
    });

    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      fotoUrl: u.fotoUrl,
      activo: u.activo,
      roles: u.roles.map((r) => r.rol.nombre),
    }));
  }

  // Agregar miembros a un grupo
  async agregarMiembros(
    grupoId: number,
    usuariosIds: number[],
    agregadoPorId: number,
  ) {
    const grupo = await this.prisma.grupoRanking.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    if (grupo.tipo === TipoGrupoRanking.SISTEMA) {
      throw new ForbiddenException(
        'No se pueden agregar miembros manualmente a grupos del sistema',
      );
    }

    await this.prisma.grupoRankingMiembro.createMany({
      data: usuariosIds.map((usuarioId) => ({
        grupoId,
        usuarioId,
        agregadoPorId,
      })),
      skipDuplicates: true,
    });

    return { message: `${usuariosIds.length} miembro(s) agregado(s)` };
  }

  // Quitar miembro de un grupo
  async quitarMiembro(grupoId: number, usuarioId: number) {
    const grupo = await this.prisma.grupoRanking.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    if (grupo.tipo === TipoGrupoRanking.SISTEMA) {
      throw new ForbiddenException(
        'No se pueden quitar miembros de grupos del sistema',
      );
    }

    await this.prisma.grupoRankingMiembro.deleteMany({
      where: { grupoId, usuarioId },
    });

    return { message: 'Miembro eliminado del grupo' };
  }

  // Obtener ranking de un grupo con paginación
  async getRankingGrupo(
    grupoId: number,
    usuarioActualId: number,
    periodoId?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const grupo = await this.prisma.grupoRanking.findUnique({
      where: { id: grupoId },
    });

    if (!grupo) {
      throw new NotFoundException('Grupo de ranking no encontrado');
    }

    // Determinar período a usar
    let periodoIdFinal = periodoId || grupo.periodoId;

    if (!periodoIdFinal) {
      // Usar período activo
      const periodoActivo = await this.prisma.periodoRanking.findFirst({
        where: { estado: 'ACTIVO' },
      });
      if (!periodoActivo) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
      periodoIdFinal = periodoActivo.id;
    }

    // Obtener usuarios del grupo según el criterio
    let usuariosIds: number[] = [];

    if (grupo.criterio === CriterioMembresia.MANUAL) {
      // Grupo manual: obtener miembros de la tabla
      const miembros = await this.prisma.grupoRankingMiembro.findMany({
        where: { grupoId, oculto: false },
        select: { usuarioId: true },
      });
      usuariosIds = miembros.map((m) => m.usuarioId);
    } else if (grupo.criterio === CriterioMembresia.TODOS_ACTIVOS) {
      // Ranking general: solo miembros JA activos (sin admin/lider)
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          esJA: true,
          roles: { none: { rol: { nombre: { in: ['admin', 'lider'] } } } },
          OR: [
            { gamificacion: null },
            { gamificacion: { ocultoEnGeneral: false } },
          ],
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER_ADMIN) {
      // Ranking líderes: solo líderes y admin
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: {
            some: { rol: { nombre: { in: ['admin', 'lider'] } } },
          },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_LIDER) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { some: { rol: { nombre: 'lider' } } },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    } else if (grupo.criterio === CriterioMembresia.ROL_ADMIN) {
      const usuarios = await this.prisma.usuario.findMany({
        where: {
          activo: true,
          participaEnRanking: true,
          roles: { some: { rol: { nombre: 'admin' } } },
        },
        select: { id: true },
      });
      usuariosIds = usuarios.map((u) => u.id);
    }

    if (usuariosIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    // Obtener puntos por usuario en el período
    const puntosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: {
        periodoRankingId: periodoIdFinal,
        usuarioGam: { usuarioId: { in: usuariosIds } },
      },
      _sum: { puntos: true },
    });

    // Mapear usuarioGamId a usuarioId
    const gamificaciones = await this.prisma.usuarioGamificacion.findMany({
      where: { id: { in: puntosAgrupados.map((p) => p.usuarioGamId) } },
      select: { id: true, usuarioId: true, rachaActual: true },
    });

    const gamIdToUserId = new Map(
      gamificaciones.map((g) => [
        g.id,
        { usuarioId: g.usuarioId, rachaActual: g.rachaActual },
      ]),
    );

    // Obtener info de usuarios
    const usuariosInfo = await this.prisma.usuario.findMany({
      where: { id: { in: usuariosIds } },
      select: {
        id: true,
        nombre: true,
        fotoUrl: true,
        gamificacion: {
          select: {
            nivel: { select: { numero: true, nombre: true, color: true } },
            rachaActual: true,
            asistenciasTotales: true,
          },
        },
      },
    });

    const usuarioInfoMap = new Map(usuariosInfo.map((u) => [u.id, u]));

    // Construir ranking completo
    const rankingData = puntosAgrupados
      .map((p) => {
        const gamData = gamIdToUserId.get(p.usuarioGamId);
        if (!gamData) return null;

        const userInfo = usuarioInfoMap.get(gamData.usuarioId);
        if (!userInfo) return null;

        return {
          usuarioId: gamData.usuarioId,
          nombre: userInfo.nombre,
          fotoUrl: userInfo.fotoUrl,
          nivelNumero: userInfo.gamificacion?.nivel.numero || 1,
          nivelNombre: userInfo.gamificacion?.nivel.nombre || 'Discípulo',
          nivelColor: userInfo.gamificacion?.nivel.color || null,
          puntosPeriodo: p._sum.puntos || 0,
          rachaActual: userInfo.gamificacion?.rachaActual || 0,
          asistenciasTotales: userInfo.gamificacion?.asistenciasTotales || 0,
        };
      })
      .filter((r) => r !== null);

    // Agregar usuarios con 0 puntos que están en el grupo pero no tienen historial
    const usuariosConPuntos = new Set(rankingData.map((r) => r.usuarioId));
    const usuariosSinPuntos = usuariosIds.filter((id) => !usuariosConPuntos.has(id));

    for (const userId of usuariosSinPuntos) {
      const userInfo = usuarioInfoMap.get(userId);
      if (userInfo) {
        rankingData.push({
          usuarioId: userId,
          nombre: userInfo.nombre,
          fotoUrl: userInfo.fotoUrl,
          nivelNumero: userInfo.gamificacion?.nivel.numero || 1,
          nivelNombre: userInfo.gamificacion?.nivel.nombre || 'Discípulo',
          nivelColor: userInfo.gamificacion?.nivel.color || null,
          puntosPeriodo: 0,
          rachaActual: userInfo.gamificacion?.rachaActual || 0,
          asistenciasTotales: userInfo.gamificacion?.asistenciasTotales || 0,
        });
      }
    }

    // Ordenar por puntos
    rankingData.sort((a, b) => b.puntosPeriodo - a.puntosPeriodo);

    // Paginación
    const total = rankingData.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginados = rankingData.slice(skip, skip + limit);

    const data = paginados.map((r, idx) => ({
      posicion: skip + idx + 1,
      ...r,
      esUsuarioActual: r.usuarioId === usuarioActualId,
    }));

    return { data, meta: { total, page, limit, totalPages } };
  }

  // Toggle visibilidad del usuario en ranking general
  async toggleOcultoGeneral(usuarioId: number, oculto: boolean) {
    const gam = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (!gam) {
      throw new NotFoundException('Perfil de gamificación no encontrado');
    }

    await this.prisma.usuarioGamificacion.update({
      where: { usuarioId },
      data: { ocultoEnGeneral: oculto },
    });

    return { ocultoEnGeneral: oculto };
  }

  // Toggle visibilidad del usuario en un grupo específico
  async toggleOcultoGrupo(grupoId: number, usuarioId: number, oculto: boolean) {
    const miembro = await this.prisma.grupoRankingMiembro.findUnique({
      where: { grupoId_usuarioId: { grupoId, usuarioId } },
    });

    if (!miembro) {
      throw new NotFoundException('No eres miembro de este grupo');
    }

    await this.prisma.grupoRankingMiembro.update({
      where: { id: miembro.id },
      data: { oculto },
    });

    return { oculto };
  }

  // Actualizar participación en ranking de un usuario (admin)
  async setParticipaEnRanking(usuarioId: number, participa: boolean) {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { participaEnRanking: participa },
    });

    return { participaEnRanking: participa };
  }

  // Obtener mi visibilidad en todos los grupos
  async getMiVisibilidad(usuarioId: number) {
    const gam = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
      select: { ocultoEnGeneral: true },
    });

    const miembros = await this.prisma.grupoRankingMiembro.findMany({
      where: { usuarioId },
      include: {
        grupo: {
          select: { id: true, codigo: true, nombre: true, icono: true },
        },
      },
    });

    return {
      ocultoEnGeneral: gam?.ocultoEnGeneral ?? false,
      grupos: miembros.map((m) => ({
        grupoId: m.grupo.id,
        codigo: m.grupo.codigo,
        nombre: m.grupo.nombre,
        icono: m.grupo.icono,
        oculto: m.oculto,
      })),
    };
  }

  // Obtener posiciones del usuario en todos los grupos visibles
  async getMisPosicionesEnGrupos(usuarioId: number) {
    // Obtener roles del usuario
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { roles: { include: { rol: true } } },
    });

    const roles = usuario?.roles.map((r) => r.rol.nombre) || [];

    // Obtener grupos visibles para el usuario
    const grupos = await this.getGruposVisibles(usuarioId, roles);

    // Obtener período activo
    const periodoActivo = await this.prisma.periodoRanking.findFirst({
      where: { estado: 'ACTIVO' },
    });

    if (!periodoActivo) {
      return [];
    }

    const posiciones: Array<{
      grupoId: number;
      codigo: string;
      nombre: string;
      icono: string | null;
      posicion: number;
      totalMiembros: number;
    }> = [];

    for (const grupo of grupos) {
      // Obtener ranking del grupo
      const ranking = await this.getRankingGrupo(
        grupo.id,
        usuarioId,
        periodoActivo.id,
        500, // Limit alto para encontrar la posición
      );

      const miPosicion = ranking.data.find((r) => r.usuarioId === usuarioId);

      if (miPosicion) {
        posiciones.push({
          grupoId: grupo.id,
          codigo: grupo.codigo,
          nombre: grupo.nombre,
          icono: grupo.icono,
          posicion: miPosicion.posicion,
          totalMiembros: ranking.meta.total,
        });
      }
    }

    return posiciones;
  }
}
