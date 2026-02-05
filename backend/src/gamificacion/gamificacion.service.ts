import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsistenciaGateway } from '../asistencia/gateway/asistencia.gateway';
import { CategoriaAccion, EstadoRanking } from '@prisma/client';
import { RankingFilterDto, TipoRanking } from './dto/ranking-filter.dto';
import {
  RegistrarEventoDto,
  ActualizarPuntajeDto,
  CrearEventoDto,
  ActualizarEventoDto,
} from './dto/registrar-evento.dto';
import { CrearPeriodoDto, ActualizarPeriodoDto } from './dto/periodo.dto';

export interface AsignarPuntosResult {
  puntosAsignados: number;
  xpAsignado: number;
  nuevoNivel: boolean;
  nivelActual: { numero: number; nombre: string };
  insigniasDesbloqueadas: Array<{
    codigo: string;
    nombre: string;
    icono: string;
  }>;
  rachaActual: number;
}

@Injectable()
export class GamificacionService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AsistenciaGateway))
    private asistenciaGateway: AsistenciaGateway,
  ) {}

  /**
   * Calcula el XP requerido para un nivel usando fórmula exponencial
   * Fórmula: XP = base * (nivel - 1)^2
   * Nivel 1: 0 XP, Nivel 2: 100 XP, Nivel 3: 400 XP, Nivel 4: 900 XP, etc.
   */
  calcularXpParaNivel(numeroNivel: number, base: number = 100): number {
    if (numeroNivel <= 1) return 0;
    return base * Math.pow(numeroNivel - 1, 2);
  }

  // Obtener o crear el perfil de gamificación de un usuario
  async getOrCreatePerfil(usuarioId: number) {
    let perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
      include: {
        nivel: true,
        insignias: { include: { insignia: true } },
      },
    });

    if (!perfil) {
      // Buscar el nivel inicial (Discípulo, numero = 1)
      const nivelInicial = await this.prisma.nivelBiblico.findFirst({
        where: { numero: 1 },
      });

      if (!nivelInicial) {
        throw new Error(
          'No se encontró el nivel inicial. Ejecuta el seeder de gamificación.',
        );
      }

      perfil = await this.prisma.usuarioGamificacion.create({
        data: {
          usuarioId,
          nivelId: nivelInicial.id,
        },
        include: {
          nivel: true,
          insignias: { include: { insignia: true } },
        },
      });
    }

    return perfil;
  }

  // Obtener mi progreso completo
  async getMiProgreso(usuarioId: number) {
    const perfil = await this.getOrCreatePerfil(usuarioId);

    // Obtener posición en ranking
    const posicion = await this.getPosicionRanking(usuarioId);

    // Obtener historial reciente
    const historialReciente = await this.prisma.historialPuntos.findMany({
      where: { usuarioGam: { usuarioId } },
      include: { configPuntaje: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Obtener todos los niveles para mostrar progreso
    const niveles = await this.prisma.nivelBiblico.findMany({
      where: { activo: true },
      orderBy: { numero: 'asc' },
    });

    // Calcular XP para siguiente nivel
    const nivelActual = niveles.find((n) => n.id === perfil.nivelId);
    const siguienteNivel = niveles.find(
      (n) => n.numero === (nivelActual?.numero || 0) + 1,
    );
    const xpParaSiguienteNivel = siguienteNivel
      ? siguienteNivel.xpRequerido - perfil.xpTotal
      : 0;

    return {
      perfil: {
        puntosTotal: perfil.puntosTotal,
        puntosTrimestre: perfil.puntosTrimestre,
        xpTotal: perfil.xpTotal,
        rachaActual: perfil.rachaActual,
        rachaMejor: perfil.rachaMejor,
        asistenciasTotales: perfil.asistenciasTotales,
        participacionesTotales: perfil.participacionesTotales,
      },
      nivel: {
        actual: nivelActual,
        siguiente: siguienteNivel,
        xpParaSiguienteNivel,
        progresoXp: siguienteNivel
          ? ((perfil.xpTotal - (nivelActual?.xpRequerido || 0)) /
              (siguienteNivel.xpRequerido - (nivelActual?.xpRequerido || 0))) *
            100
          : 100,
      },
      posicionRanking: posicion,
      insignias: perfil.insignias.map((ui) => ({
        ...ui.insignia,
        desbloqueadaAt: ui.desbloqueadaAt,
      })),
      historialReciente,
    };
  }

  // Obtener historial completo de puntos con paginación
  async getMiHistorial(
    usuarioId: number,
    periodoId?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (!perfil) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const where: any = { usuarioGamId: perfil.id };
    if (periodoId) {
      where.periodoRankingId = periodoId;
    }

    const [total, historial] = await Promise.all([
      this.prisma.historialPuntos.count({ where }),
      this.prisma.historialPuntos.findMany({
        where,
        include: {
          configPuntaje: true,
          periodoRanking: { select: { id: true, nombre: true, estado: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: historial.map((h) => ({
        id: h.id,
        puntos: h.puntos,
        xp: h.xp,
        descripcion: h.descripcion,
        fecha: h.fecha,
        createdAt: h.createdAt,
        categoria: h.configPuntaje?.categoria || 'OTRO',
        tipoPuntaje: h.configPuntaje?.nombre || 'Manual',
        periodo: h.periodoRanking
          ? { id: h.periodoRanking.id, nombre: h.periodoRanking.nombre }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener resumen de mis puntos por período
  async getMisPeriodos(usuarioId: number) {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (!perfil) {
      return [];
    }

    // Obtener todos los períodos con puntos del usuario
    const periodos = await this.prisma.periodoRanking.findMany({
      where: {
        historialPuntos: { some: { usuarioGamId: perfil.id } },
      },
      orderBy: { fechaInicio: 'desc' },
    });

    // Para cada período, calcular estadísticas
    const resumen = await Promise.all(
      periodos.map(async (periodo) => {
        // Puntos totales del período
        const puntosAgregados = await this.prisma.historialPuntos.aggregate({
          where: {
            usuarioGamId: perfil.id,
            periodoRankingId: periodo.id,
          },
          _sum: { puntos: true, xp: true },
          _count: true,
        });

        // Puntos por categoría
        const porCategoria = await this.prisma.historialPuntos.groupBy({
          by: ['configPuntajeId'],
          where: {
            usuarioGamId: perfil.id,
            periodoRankingId: periodo.id,
          },
          _sum: { puntos: true },
          _count: true,
        });

        // Obtener nombres de las categorías
        const configIds = porCategoria
          .filter((p) => p.configPuntajeId)
          .map((p) => p.configPuntajeId as number);

        const configs = await this.prisma.configuracionPuntaje.findMany({
          where: { id: { in: configIds } },
        });

        const configMap = new Map(configs.map((c) => [c.id, c]));

        // Calcular posición final del usuario en ese período
        const ranking = await this.prisma.historialPuntos.groupBy({
          by: ['usuarioGamId'],
          where: { periodoRankingId: periodo.id },
          _sum: { puntos: true },
        });

        const misPuntos = puntosAgregados._sum.puntos || 0;
        const posicion =
          ranking.filter((r) => (r._sum.puntos || 0) > misPuntos).length + 1;

        // Desglose por tipo
        const desglose = porCategoria.map((p) => {
          const config = p.configPuntajeId
            ? configMap.get(p.configPuntajeId)
            : null;
          return {
            categoria: config?.categoria || 'OTRO',
            nombre: config?.nombre || 'Participación',
            puntos: p._sum.puntos || 0,
            cantidad: p._count,
          };
        });

        // Agrupar por categoría
        const porCategoriaAgrupado: Record<
          string,
          { puntos: number; cantidad: number }
        > = {};
        for (const d of desglose) {
          if (!porCategoriaAgrupado[d.categoria]) {
            porCategoriaAgrupado[d.categoria] = { puntos: 0, cantidad: 0 };
          }
          porCategoriaAgrupado[d.categoria].puntos += d.puntos;
          porCategoriaAgrupado[d.categoria].cantidad += d.cantidad;
        }

        return {
          periodo: {
            id: periodo.id,
            nombre: periodo.nombre,
            fechaInicio: periodo.fechaInicio,
            fechaFin: periodo.fechaFin,
            estado: periodo.estado,
          },
          puntosTotal: puntosAgregados._sum.puntos || 0,
          xpTotal: puntosAgregados._sum.xp || 0,
          totalRegistros: puntosAgregados._count,
          posicionFinal: posicion,
          totalParticipantes: ranking.length,
          porCategoria: porCategoriaAgrupado,
        };
      }),
    );

    return resumen;
  }

  // Obtener el período de ranking activo
  async getPeriodoActivo() {
    const periodo = await this.prisma.periodoRanking.findFirst({
      where: { estado: EstadoRanking.ACTIVO },
    });
    return periodo;
  }

  // Comparar participantes (2-5 usuarios): radar + desglose
  async compararParticipantes(usuarioIds: number[]) {
    if (usuarioIds.length < 2 || usuarioIds.length > 5) {
      throw new BadRequestException(
        'Debes seleccionar entre 2 y 5 participantes para comparar',
      );
    }

    // Obtener perfiles de gamificación
    const perfiles = await this.prisma.usuarioGamificacion.findMany({
      where: { usuarioId: { in: usuarioIds } },
      include: {
        usuario: { select: { id: true, nombre: true, fotoUrl: true } },
        nivel: true,
      },
    });

    if (perfiles.length < 2) {
      throw new BadRequestException(
        'No se encontraron suficientes perfiles de gamificación para comparar',
      );
    }

    // Obtener periodo activo
    const periodoActivo = await this.getPeriodoActivo();

    // --- RADAR: 6 métricas normalizadas 0-100 ---
    const rawData = perfiles.map((p) => ({
      usuarioGamId: p.id,
      usuarioId: p.usuarioId,
      asistenciasTotales: p.asistenciasTotales,
      participacionesTotales: p.participacionesTotales,
      puntosTrimestre: p.puntosTrimestre,
      xpTotal: p.xpTotal,
      rachaActual: p.rachaActual,
      nivelNumero: p.nivel.numero,
    }));

    const normalize = (values: number[]) => {
      const max = Math.max(...values, 1);
      return values.map((v) => Math.round((v / max) * 100));
    };

    const asistenciaNorm = normalize(rawData.map((r) => r.asistenciasTotales));
    const participacionNorm = normalize(
      rawData.map((r) => r.participacionesTotales),
    );
    const puntosNorm = normalize(rawData.map((r) => r.puntosTrimestre));
    const xpNorm = normalize(rawData.map((r) => r.xpTotal));
    const rachaNorm = normalize(rawData.map((r) => r.rachaActual));
    const nivelNorm = normalize(rawData.map((r) => r.nivelNumero));

    const usuarios = perfiles.map((p, i) => ({
      usuarioId: p.usuarioId,
      nombre: p.usuario.nombre,
      fotoUrl: p.usuario.fotoUrl,
      nivel: {
        numero: p.nivel.numero,
        nombre: p.nivel.nombre,
        icono: p.nivel.icono,
        color: p.nivel.color,
      },
      radar: {
        asistencia: asistenciaNorm[i],
        participacion: participacionNorm[i],
        puntos: puntosNorm[i],
        xp: xpNorm[i],
        racha: rachaNorm[i],
        nivel: nivelNorm[i],
      },
      raw: {
        asistenciasTotales: rawData[i].asistenciasTotales,
        participacionesTotales: rawData[i].participacionesTotales,
        puntosTrimestre: rawData[i].puntosTrimestre,
        xpTotal: rawData[i].xpTotal,
        rachaActual: rawData[i].rachaActual,
        nivelNumero: rawData[i].nivelNumero,
      },
    }));

    // --- DESGLOSE: puntos agrupados por configPuntaje y categoria ---
    const perfilIds = perfiles.map((p) => p.id);
    const whereHistorial: any = {
      usuarioGamId: { in: perfilIds },
    };
    if (periodoActivo) {
      whereHistorial.periodoRankingId = periodoActivo.id;
    }

    // Agrupar por [usuarioGamId, configPuntajeId]
    const puntosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId', 'configPuntajeId'],
      where: { ...whereHistorial, configPuntajeId: { not: null } },
      _sum: { puntos: true },
      _count: true,
    });

    // Obtener configs
    const configIds = [
      ...new Set(
        puntosAgrupados
          .filter((p) => p.configPuntajeId)
          .map((p) => p.configPuntajeId as number),
      ),
    ];
    const configs = await this.prisma.configuracionPuntaje.findMany({
      where: { id: { in: configIds } },
    });
    const configMap = new Map(configs.map((c) => [c.id, c]));

    // Agrupar eventos especiales por [usuarioGamId, referenciaId]
    const eventosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId', 'referenciaId'],
      where: {
        ...whereHistorial,
        referenciaTipo: 'evento',
        referenciaId: { not: null },
      },
      _sum: { puntos: true },
      _count: true,
    });

    // Obtener evento configs
    const eventoIds = [
      ...new Set(
        eventosAgrupados
          .filter((e) => e.referenciaId)
          .map((e) => e.referenciaId as number),
      ),
    ];
    const eventosConfig =
      eventoIds.length > 0
        ? await this.prisma.eventoEspecialConfig.findMany({
            where: { id: { in: eventoIds } },
          })
        : [];
    const eventoMap = new Map(eventosConfig.map((e) => [e.id, e]));

    // Map de usuarioGamId -> usuarioId
    const gamIdToUserId = new Map(perfiles.map((p) => [p.id, p.usuarioId]));

    // Construir desglose por categoría
    const categoriasMap = new Map<
      string,
      Map<string, { codigo: string; nombre: string; valores: Map<number, { cantidad: number; puntos: number }> }>
    >();

    // Procesar acciones normales
    for (const p of puntosAgrupados) {
      const config = configMap.get(p.configPuntajeId as number);
      if (!config) continue;

      const categoria = config.categoria;
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, new Map());
      }
      const accionesMap = categoriasMap.get(categoria)!;
      if (!accionesMap.has(config.codigo)) {
        accionesMap.set(config.codigo, {
          codigo: config.codigo,
          nombre: config.nombre,
          valores: new Map(),
        });
      }
      const accion = accionesMap.get(config.codigo)!;
      const uid = gamIdToUserId.get(p.usuarioGamId)!;
      accion.valores.set(uid, {
        cantidad: p._count,
        puntos: p._sum.puntos || 0,
      });
    }

    // Procesar eventos especiales
    for (const e of eventosAgrupados) {
      const config = eventoMap.get(e.referenciaId as number);
      if (!config) continue;

      const categoria = 'EVENTO_ESPECIAL';
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, new Map());
      }
      const accionesMap = categoriasMap.get(categoria)!;
      if (!accionesMap.has(config.codigo)) {
        accionesMap.set(config.codigo, {
          codigo: config.codigo,
          nombre: config.nombre,
          valores: new Map(),
        });
      }
      const accion = accionesMap.get(config.codigo)!;
      const uid = gamIdToUserId.get(e.usuarioGamId)!;
      accion.valores.set(uid, {
        cantidad: e._count,
        puntos: e._sum.puntos || 0,
      });
    }

    // Convertir Map a array serializable
    const desglose = Array.from(categoriasMap.entries()).map(
      ([categoria, accionesMap]) => ({
        categoria,
        acciones: Array.from(accionesMap.values()).map((accion) => ({
          codigo: accion.codigo,
          nombre: accion.nombre,
          valores: Object.fromEntries(accion.valores),
        })),
      }),
    );

    return {
      usuarios,
      desglose,
      periodo: periodoActivo
        ? { id: periodoActivo.id, nombre: periodoActivo.nombre }
        : null,
    };
  }

  // Asignar puntos a un usuario
  async asignarPuntos(
    usuarioId: number,
    codigoPuntaje: string,
    referenciaId?: number,
    referenciaTipo?: string,
  ): Promise<AsignarPuntosResult> {
    const config = await this.prisma.configuracionPuntaje.findUnique({
      where: { codigo: codigoPuntaje, activo: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuración de puntaje '${codigoPuntaje}' no encontrada`,
      );
    }

    // Obtener período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) {
      throw new BadRequestException(
        'No hay un período de ranking activo. Crea uno primero.',
      );
    }

    const perfil = await this.getOrCreatePerfil(usuarioId);
    const now = new Date();

    // Crear registro en historial
    await this.prisma.historialPuntos.create({
      data: {
        usuarioGamId: perfil.id,
        configPuntajeId: config.id,
        periodoRankingId: periodoActivo.id,
        puntos: config.puntos,
        xp: config.xp,
        descripcion: config.nombre,
        fecha: now,
        referenciaId,
        referenciaTipo,
      },
    });

    // Actualizar perfil
    const perfilActualizado = await this.prisma.usuarioGamificacion.update({
      where: { id: perfil.id },
      data: {
        puntosTotal: { increment: config.puntos },
        puntosTrimestre: { increment: config.puntos },
        xpTotal: { increment: config.xp },
      },
      include: { nivel: true },
    });

    // Verificar si subió de nivel
    const nuevoNivel = await this.calcularYActualizarNivel(
      perfilActualizado.id,
      perfilActualizado.xpTotal,
    );

    // Verificar insignias desbloqueadas
    const insigniasDesbloqueadas = await this.verificarInsignias(perfil.id);

    // Emitir notificación de level-up via socket
    if (nuevoNivel !== null) {
      this.asistenciaGateway.emitLevelUp(usuarioId, {
        nivel: nuevoNivel,
        insignias: insigniasDesbloqueadas,
      });
    }

    return {
      puntosAsignados: config.puntos,
      xpAsignado: config.xp,
      nuevoNivel: nuevoNivel !== null,
      nivelActual: nuevoNivel || perfilActualizado.nivel,
      insigniasDesbloqueadas,
      rachaActual: perfilActualizado.rachaActual,
    };
  }

  // Asignar puntos por asistencia usando márgenes del QR
  async asignarPuntosPorAsistencia(
    usuarioId: number,
    asistenciaId: number,
    horaRegistro: Date,
    horaInicio: Date,
    margenTemprana: number = 15, // minutos antes de horaInicio = temprana
    margenTardia: number = 30, // minutos después de horaInicio = tardía
  ): Promise<AsignarPuntosResult> {
    let codigoPuntaje: string;

    // Extraer solo hora y minutos para comparar
    const registroMinutos =
      horaRegistro.getHours() * 60 + horaRegistro.getMinutes();
    const inicioMinutos = horaInicio.getHours() * 60 + horaInicio.getMinutes();

    // Calcular límites
    const limiteTempranaMin = inicioMinutos - margenTemprana; // Desde aquí es temprana
    const limiteTardiaMin = inicioMinutos + margenTardia; // Después de aquí es tardía

    // Determinar tipo de asistencia basado en hora y márgenes
    // Temprana: llegó antes de hora inicio (pero dentro del margen temprana)
    // Normal: llegó entre hora inicio y hora inicio + margen tardía
    // Tardía: llegó después de hora inicio + margen tardía
    if (registroMinutos < inicioMinutos) {
      // Llegó antes de la hora de inicio = temprana
      codigoPuntaje = 'asistencia_temprana';
    } else if (registroMinutos <= limiteTardiaMin) {
      // Llegó entre hora inicio y límite tardía = normal
      codigoPuntaje = 'asistencia_normal';
    } else {
      // Llegó después del límite tardía = tardía
      codigoPuntaje = 'asistencia_tardia';
    }

    // Asignar puntos base
    const resultado = await this.asignarPuntos(
      usuarioId,
      codigoPuntaje,
      asistenciaId,
      'asistencia',
    );

    // Actualizar contador de asistencias y racha
    await this.actualizarRachaYAsistencias(usuarioId);

    return resultado;
  }

  // Asignar puntos por participación en una parte del programa
  async asignarPuntosPorParticipacion(
    usuarioId: number,
    parteId: number,
    asignacionId?: number, // ID de ProgramaAsignacion como referencia
  ): Promise<AsignarPuntosResult> {
    // Buscar la parte para obtener sus puntos
    const parte = await this.prisma.parte.findUnique({
      where: { id: parteId },
    });

    if (!parte) {
      throw new NotFoundException(`Parte con ID ${parteId} no encontrada`);
    }

    if (parte.puntos === 0 && parte.xp === 0) {
      // No asignar puntos si la parte no tiene configurados
      return {
        puntosAsignados: 0,
        xpAsignado: 0,
        nuevoNivel: false,
        nivelActual: { numero: 1, nombre: 'Discípulo' },
        insigniasDesbloqueadas: [],
        rachaActual: 0,
      };
    }

    // Obtener período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) {
      throw new BadRequestException(
        'No hay un período de ranking activo. Crea uno primero.',
      );
    }

    const perfil = await this.getOrCreatePerfil(usuarioId);
    const now = new Date();

    // Crear registro en historial
    await this.prisma.historialPuntos.create({
      data: {
        usuarioGamId: perfil.id,
        configPuntajeId: null, // No viene de ConfiguracionPuntaje, viene de Parte
        periodoRankingId: periodoActivo.id,
        puntos: parte.puntos,
        xp: parte.xp,
        descripcion: `Participación: ${parte.nombre}`,
        fecha: now,
        referenciaId: asignacionId,
        referenciaTipo: 'participacion',
      },
    });

    // Actualizar perfil
    const perfilActualizado = await this.prisma.usuarioGamificacion.update({
      where: { id: perfil.id },
      data: {
        puntosTotal: { increment: parte.puntos },
        puntosTrimestre: { increment: parte.puntos },
        xpTotal: { increment: parte.xp },
        participacionesTotales: { increment: 1 },
      },
      include: { nivel: true },
    });

    // Verificar si subió de nivel
    const nuevoNivel = await this.calcularYActualizarNivel(
      perfilActualizado.id,
      perfilActualizado.xpTotal,
    );

    // Verificar insignias desbloqueadas
    const insigniasDesbloqueadas = await this.verificarInsignias(perfil.id);

    // Emitir notificación de level-up via socket
    if (nuevoNivel !== null) {
      this.asistenciaGateway.emitLevelUp(usuarioId, {
        nivel: nuevoNivel,
        insignias: insigniasDesbloqueadas,
      });
    }

    return {
      puntosAsignados: parte.puntos,
      xpAsignado: parte.xp,
      nuevoNivel: nuevoNivel !== null,
      nivelActual: nuevoNivel || perfilActualizado.nivel,
      insigniasDesbloqueadas,
      rachaActual: perfilActualizado.rachaActual,
    };
  }

  // Actualizar racha y contador de asistencias
  private async actualizarRachaYAsistencias(usuarioId: number) {
    const perfil = await this.getOrCreatePerfil(usuarioId);
    const hoy = new Date();
    const inicioSemanaActual = this.getInicioSemana(hoy);

    // Verificar si ya asistió esta semana
    const ultimaSemana = perfil.ultimaSemanaAsistio;

    let nuevaRacha = perfil.rachaActual;
    if (!ultimaSemana) {
      nuevaRacha = 1;
    } else {
      const semanaAnterior = new Date(inicioSemanaActual);
      semanaAnterior.setDate(semanaAnterior.getDate() - 7);

      if (ultimaSemana.getTime() === semanaAnterior.getTime()) {
        // Semana consecutiva
        nuevaRacha = perfil.rachaActual + 1;
      } else if (ultimaSemana.getTime() < semanaAnterior.getTime()) {
        // Racha rota
        nuevaRacha = 1;
      }
      // Si es la misma semana, no cambia
    }

    const mejorRacha = Math.max(nuevaRacha, perfil.rachaMejor);

    await this.prisma.usuarioGamificacion.update({
      where: { id: perfil.id },
      data: {
        rachaActual: nuevaRacha,
        rachaMejor: mejorRacha,
        ultimaSemanaAsistio: inicioSemanaActual,
        asistenciasTotales: { increment: 1 },
      },
    });

    // Verificar bonus por racha
    await this.verificarBonusRacha(perfil.id, nuevaRacha);
  }

  // Verificar y otorgar bonus por racha
  private async verificarBonusRacha(perfilId: number, racha: number) {
    const bonusRachas = [
      { racha: 4, codigo: 'racha_4_semanas' },
      { racha: 8, codigo: 'racha_8_semanas' },
      { racha: 12, codigo: 'racha_12_semanas' },
    ];

    const periodoActivo = await this.getPeriodoActivo();

    for (const bonus of bonusRachas) {
      if (racha === bonus.racha) {
        const config = await this.prisma.configuracionPuntaje.findUnique({
          where: { codigo: bonus.codigo, activo: true },
        });

        if (config && periodoActivo) {
          const now = new Date();
          await this.prisma.historialPuntos.create({
            data: {
              usuarioGamId: perfilId,
              configPuntajeId: config.id,
              periodoRankingId: periodoActivo.id,
              puntos: config.puntos,
              xp: config.xp,
              descripcion: `Bonus: ${config.nombre}`,
              fecha: now,
            },
          });

          await this.prisma.usuarioGamificacion.update({
            where: { id: perfilId },
            data: {
              puntosTotal: { increment: config.puntos },
              puntosTrimestre: { increment: config.puntos },
              xpTotal: { increment: config.xp },
            },
          });
        }
      }
    }
  }

  // Calcular y actualizar nivel
  private async calcularYActualizarNivel(
    perfilId: number,
    xpTotal: number,
  ): Promise<{ numero: number; nombre: string } | null> {
    const niveles = await this.prisma.nivelBiblico.findMany({
      where: { activo: true },
      orderBy: { xpRequerido: 'desc' },
    });

    const nuevoNivel = niveles.find((n) => xpTotal >= n.xpRequerido);
    if (!nuevoNivel) return null;

    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { id: perfilId },
      include: { nivel: true },
    });

    if (perfil && perfil.nivelId !== nuevoNivel.id) {
      await this.prisma.usuarioGamificacion.update({
        where: { id: perfilId },
        data: { nivelId: nuevoNivel.id },
      });
      return { numero: nuevoNivel.numero, nombre: nuevoNivel.nombre };
    }

    return null;
  }

  // Verificar y desbloquear insignias
  async verificarInsignias(
    perfilId: number,
  ): Promise<Array<{ codigo: string; nombre: string; icono: string }>> {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { id: perfilId },
      include: { insignias: true },
    });

    if (!perfil) return [];

    const insigniasExistentes = new Set(
      perfil.insignias.map((i) => i.insigniaId),
    );
    const insignias = await this.prisma.insignia.findMany({
      where: { activo: true },
    });
    const desbloqueadas: Array<{
      codigo: string;
      nombre: string;
      icono: string;
    }> = [];

    for (const insignia of insignias) {
      if (insigniasExistentes.has(insignia.id)) continue;

      let cumpleCondicion = false;

      switch (insignia.condicionTipo) {
        case 'asistencias_tempranas':
          const tempranas = await this.prisma.historialPuntos.count({
            where: {
              usuarioGamId: perfilId,
              configPuntaje: { codigo: 'asistencia_temprana' },
            },
          });
          cumpleCondicion = tempranas >= insignia.condicionValor;
          break;

        case 'racha_semanas':
          cumpleCondicion = perfil.rachaMejor >= insignia.condicionValor;
          break;

        case 'asistencias_totales':
          cumpleCondicion =
            perfil.asistenciasTotales >= insignia.condicionValor;
          break;

        case 'temas_centrales':
          const temas = await this.prisma.historialPuntos.count({
            where: {
              usuarioGamId: perfilId,
              configPuntaje: { codigo: 'tema_central' },
            },
          });
          cumpleCondicion = temas >= insignia.condicionValor;
          break;

        case 'direcciones':
          const direcciones = await this.prisma.historialPuntos.count({
            where: {
              usuarioGamId: perfilId,
              configPuntaje: { codigo: 'direccion_programa' },
            },
          });
          cumpleCondicion = direcciones >= insignia.condicionValor;
          break;

        case 'especiales':
          const especiales = await this.prisma.historialPuntos.count({
            where: {
              usuarioGamId: perfilId,
              configPuntaje: { codigo: 'especial' },
            },
          });
          cumpleCondicion = especiales >= insignia.condicionValor;
          break;
      }

      if (cumpleCondicion) {
        await this.prisma.usuarioInsignia.create({
          data: {
            usuarioGamId: perfilId,
            insigniaId: insignia.id,
          },
        });

        // Otorgar bonus de la insignia
        if (insignia.puntosBonus > 0 || insignia.xpBonus > 0) {
          const periodoActivo = await this.getPeriodoActivo();
          if (periodoActivo) {
            const now = new Date();
            await this.prisma.historialPuntos.create({
              data: {
                usuarioGamId: perfilId,
                periodoRankingId: periodoActivo.id,
                puntos: insignia.puntosBonus,
                xp: insignia.xpBonus,
                descripcion: `Insignia desbloqueada: ${insignia.nombre}`,
                fecha: now,
              },
            });
          }

          await this.prisma.usuarioGamificacion.update({
            where: { id: perfilId },
            data: {
              puntosTotal: { increment: insignia.puntosBonus },
              puntosTrimestre: { increment: insignia.puntosBonus },
              xpTotal: { increment: insignia.xpBonus },
            },
          });
        }

        desbloqueadas.push({
          codigo: insignia.codigo,
          nombre: insignia.nombre,
          icono: insignia.icono || '',
        });
      }
    }

    return desbloqueadas;
  }

  // Obtener ranking
  async getRanking(filtros: RankingFilterDto) {
    const limit = filtros.limit || 50;

    // Determinar el período a usar
    let periodoId: number | undefined;

    if (filtros.periodoId) {
      // Si se especifica un período, usar ese
      periodoId = filtros.periodoId;
    } else {
      // Si no, usar el período activo
      const periodoActivo = await this.getPeriodoActivo();
      if (!periodoActivo) {
        return []; // No hay período activo
      }
      periodoId = periodoActivo.id;
    }

    // Obtener puntos por usuario en el período
    const puntosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: {
        periodoRankingId: periodoId,
        ...(filtros.tipo === TipoRanking.ASISTENCIA
          ? { configPuntaje: { categoria: CategoriaAccion.ASISTENCIA } }
          : filtros.tipo === TipoRanking.PARTICIPACION
            ? { referenciaTipo: 'participacion' }
            : {}),
      },
      _sum: { puntos: true },
      orderBy: { _sum: { puntos: 'desc' } },
      take: limit,
    });

    // Obtener información completa de los usuarios
    const perfilesIds = puntosAgrupados.map((p) => p.usuarioGamId);
    const perfiles = await this.prisma.usuarioGamificacion.findMany({
      where: { id: { in: perfilesIds } },
      include: {
        usuario: { select: { id: true, nombre: true, fotoUrl: true } },
        nivel: true,
      },
    });

    const perfilesMap = new Map(perfiles.map((p) => [p.id, p]));

    return puntosAgrupados.map((p, index) => {
      const perfil = perfilesMap.get(p.usuarioGamId);
      return {
        posicion: index + 1,
        usuarioId: perfil?.usuario.id,
        nombre: perfil?.usuario.nombre || 'Usuario',
        fotoUrl: perfil?.usuario.fotoUrl,
        nivel: perfil?.nivel,
        puntosPeriodo: p._sum.puntos || 0,
        rachaActual: perfil?.rachaActual || 0,
        asistenciasTotales: perfil?.asistenciasTotales || 0,
      };
    });
  }

  // Obtener posición en ranking del usuario actual
  async getPosicionRanking(usuarioId: number): Promise<number> {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (!perfil) return 0;

    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) return 0;

    // Contar usuarios con más puntos
    const usuariosConMasPuntos = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: { periodoRankingId: periodoActivo.id },
      _sum: { puntos: true },
    });

    const misPuntos =
      usuariosConMasPuntos.find((u) => u.usuarioGamId === perfil.id)?._sum
        .puntos || 0;

    const posicion =
      usuariosConMasPuntos.filter((u) => (u._sum.puntos || 0) > misPuntos)
        .length + 1;

    return posicion;
  }

  // Obtener lista de niveles
  async getNiveles() {
    return this.prisma.nivelBiblico.findMany({
      where: { activo: true },
      orderBy: { numero: 'asc' },
    });
  }

  // [Admin] Obtener todos los niveles (incluyendo inactivos)
  async getNivelesAdmin() {
    return this.prisma.nivelBiblico.findMany({
      orderBy: { numero: 'asc' },
      include: {
        _count: { select: { usuariosEnNivel: true } },
      },
    });
  }

  // [Admin] Obtener nivel por ID
  async getNivel(id: number) {
    const nivel = await this.prisma.nivelBiblico.findUnique({
      where: { id },
      include: {
        _count: { select: { usuariosEnNivel: true } },
      },
    });

    if (!nivel) {
      throw new NotFoundException('Nivel no encontrado');
    }

    return nivel;
  }

  // [Admin] Crear nivel (XP se calcula automáticamente)
  async crearNivel(dto: {
    numero: number;
    nombre: string;
    descripcion?: string;
    icono?: string;
    color?: string;
  }) {
    // Verificar que el número no exista
    const existeNumero = await this.prisma.nivelBiblico.findUnique({
      where: { numero: dto.numero },
    });
    if (existeNumero) {
      throw new BadRequestException(
        `Ya existe un nivel con el número ${dto.numero}`,
      );
    }

    // Verificar que el nombre no exista
    const existeNombre = await this.prisma.nivelBiblico.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existeNombre) {
      throw new BadRequestException(
        `Ya existe un nivel con el nombre "${dto.nombre}"`,
      );
    }

    // Calcular XP automáticamente basado en el número de nivel
    const xpRequerido = this.calcularXpParaNivel(dto.numero);

    return this.prisma.nivelBiblico.create({
      data: {
        numero: dto.numero,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        xpRequerido,
        icono: dto.icono,
        color: dto.color,
      },
    });
  }

  // [Admin] Actualizar nivel (XP se recalcula si cambia el número)
  async actualizarNivel(
    id: number,
    dto: {
      numero?: number;
      nombre?: string;
      descripcion?: string;
      icono?: string;
      color?: string;
      activo?: boolean;
    },
  ) {
    const nivel = await this.prisma.nivelBiblico.findUnique({
      where: { id },
    });

    if (!nivel) {
      throw new NotFoundException('Nivel no encontrado');
    }

    // Verificar número único si se está cambiando
    if (dto.numero && dto.numero !== nivel.numero) {
      const existeNumero = await this.prisma.nivelBiblico.findUnique({
        where: { numero: dto.numero },
      });
      if (existeNumero) {
        throw new BadRequestException(
          `Ya existe un nivel con el número ${dto.numero}`,
        );
      }
    }

    // Verificar nombre único si se está cambiando
    if (dto.nombre && dto.nombre !== nivel.nombre) {
      const existeNombre = await this.prisma.nivelBiblico.findUnique({
        where: { nombre: dto.nombre },
      });
      if (existeNombre) {
        throw new BadRequestException(
          `Ya existe un nivel con el nombre "${dto.nombre}"`,
        );
      }
    }

    // Si cambia el número, recalcular XP
    const updateData: any = { ...dto };
    if (dto.numero && dto.numero !== nivel.numero) {
      updateData.xpRequerido = this.calcularXpParaNivel(dto.numero);
    }

    return this.prisma.nivelBiblico.update({
      where: { id },
      data: updateData,
    });
  }

  // [Admin] Recalcular XP de todos los niveles (útil si cambia la fórmula)
  async recalcularTodosLosXp() {
    const niveles = await this.prisma.nivelBiblico.findMany();

    const updates = niveles.map((nivel) =>
      this.prisma.nivelBiblico.update({
        where: { id: nivel.id },
        data: { xpRequerido: this.calcularXpParaNivel(nivel.numero) },
      }),
    );

    await Promise.all(updates);

    return { mensaje: `XP recalculado para ${niveles.length} niveles` };
  }

  // [Admin] Eliminar nivel (solo si no tiene usuarios)
  async eliminarNivel(id: number) {
    const nivel = await this.prisma.nivelBiblico.findUnique({
      where: { id },
      include: { _count: { select: { usuariosEnNivel: true } } },
    });

    if (!nivel) {
      throw new NotFoundException('Nivel no encontrado');
    }

    if (nivel._count.usuariosEnNivel > 0) {
      throw new BadRequestException(
        `No se puede eliminar: hay ${nivel._count.usuariosEnNivel} usuarios en este nivel. Desactívalo en su lugar.`,
      );
    }

    await this.prisma.nivelBiblico.delete({ where: { id } });

    return { mensaje: 'Nivel eliminado correctamente' };
  }

  // Obtener insignias del usuario
  async getMisInsignias(usuarioId: number) {
    const perfil = await this.getOrCreatePerfil(usuarioId);

    const todasInsignias = await this.prisma.insignia.findMany({
      where: { activo: true },
      orderBy: { condicionValor: 'asc' },
    });

    const misInsignias = await this.prisma.usuarioInsignia.findMany({
      where: { usuarioGamId: perfil.id },
      include: { insignia: true },
    });

    const desbloquedas = new Set(misInsignias.map((i) => i.insigniaId));

    return todasInsignias.map((insignia) => ({
      ...insignia,
      desbloqueada: desbloquedas.has(insignia.id),
      desbloqueadaAt: misInsignias.find((i) => i.insigniaId === insignia.id)
        ?.desbloqueadaAt,
    }));
  }

  // === ADMIN: Configuración de puntajes ===
  async getConfigPuntajes() {
    return this.prisma.configuracionPuntaje.findMany({
      orderBy: [{ categoria: 'asc' }, { puntos: 'desc' }],
    });
  }

  async updateConfigPuntaje(id: number, data: ActualizarPuntajeDto) {
    return this.prisma.configuracionPuntaje.update({
      where: { id },
      data: {
        puntos: data.puntos,
        xp: data.xp,
        nombre: data.nombre,
        descripcion: data.descripcion,
      },
    });
  }

  // === ADMIN: Registrar evento especial ===
  async registrarEvento(dto: RegistrarEventoDto, registradoPorId: number) {
    const evento = await this.prisma.eventoEspecialConfig.findUnique({
      where: { id: dto.eventoConfigId, activo: true },
    });

    if (!evento) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Obtener período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) {
      throw new BadRequestException(
        'No hay un período de ranking activo. Crea uno primero.',
      );
    }

    const fecha = new Date(dto.fecha);
    const resultados: Array<{
      usuarioId: number;
      status: string;
      puntos?: number;
    }> = [];

    for (const usuarioId of dto.usuarioIds) {
      const perfil = await this.getOrCreatePerfil(usuarioId);

      // Verificar si ya tiene este evento en esta fecha
      const existente = await this.prisma.eventoEspecialRegistro.findUnique({
        where: {
          usuarioGamId_eventoConfigId_fecha: {
            usuarioGamId: perfil.id,
            eventoConfigId: evento.id,
            fecha,
          },
        },
      });

      if (existente) {
        resultados.push({ usuarioId, status: 'ya_registrado' });
        continue;
      }

      // Crear registro del evento
      await this.prisma.eventoEspecialRegistro.create({
        data: {
          usuarioGamId: perfil.id,
          eventoConfigId: evento.id,
          fecha,
          notas: dto.notas,
          registradoPorId,
        },
      });

      // Asignar puntos
      await this.prisma.historialPuntos.create({
        data: {
          usuarioGamId: perfil.id,
          periodoRankingId: periodoActivo.id,
          puntos: evento.puntos,
          xp: evento.xp,
          descripcion: `Evento: ${evento.nombre}`,
          fecha,
          referenciaId: evento.id,
          referenciaTipo: 'evento',
        },
      });

      // Actualizar totales
      await this.prisma.usuarioGamificacion.update({
        where: { id: perfil.id },
        data: {
          puntosTotal: { increment: evento.puntos },
          puntosTrimestre: { increment: evento.puntos },
          xpTotal: { increment: evento.xp },
        },
      });

      // Verificar nivel e insignias
      const nuevoNivel = await this.calcularYActualizarNivel(
        perfil.id,
        perfil.xpTotal + evento.xp,
      );
      const insigniasDesbloqueadas = await this.verificarInsignias(perfil.id);

      // Emitir notificación de level-up via socket
      if (nuevoNivel !== null) {
        this.asistenciaGateway.emitLevelUp(usuarioId, {
          nivel: nuevoNivel,
          insignias: insigniasDesbloqueadas,
        });
      }

      resultados.push({
        usuarioId,
        status: 'registrado',
        puntos: evento.puntos,
      });
    }

    return {
      evento: evento.nombre,
      fecha: dto.fecha,
      resultados,
    };
  }

  // Obtener eventos especiales disponibles
  async getEventosEspeciales(incluirInactivos = false) {
    return this.prisma.eventoEspecialConfig.findMany({
      where: incluirInactivos ? {} : { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  // === CRUD EVENTOS ESPECIALES ===

  async crearEvento(dto: CrearEventoDto) {
    // Verificar que el código no exista
    const existente = await this.prisma.eventoEspecialConfig.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existente) {
      throw new BadRequestException(
        `Ya existe un evento con el código '${dto.codigo}'`,
      );
    }

    return this.prisma.eventoEspecialConfig.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        puntos: dto.puntos,
        xp: dto.xp || 0,
        icono: dto.icono,
        color: dto.color,
      },
    });
  }

  async actualizarEvento(id: number, dto: ActualizarEventoDto) {
    const evento = await this.prisma.eventoEspecialConfig.findUnique({
      where: { id },
    });

    if (!evento) {
      throw new NotFoundException('Evento no encontrado');
    }

    return this.prisma.eventoEspecialConfig.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        puntos: dto.puntos,
        xp: dto.xp,
        icono: dto.icono,
        color: dto.color,
        activo: dto.activo,
      },
    });
  }

  async eliminarEvento(id: number) {
    const evento = await this.prisma.eventoEspecialConfig.findUnique({
      where: { id },
    });

    if (!evento) {
      throw new NotFoundException('Evento no encontrado');
    }

    // Soft delete - solo desactivar
    return this.prisma.eventoEspecialConfig.update({
      where: { id },
      data: { activo: false },
    });
  }

  // Utilidad: obtener inicio de semana (sábado)
  private getInicioSemana(fecha: Date): Date {
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day; // Domingo como inicio
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ==================== CRUD PERÍODOS DE RANKING ====================

  // Listar todos los períodos
  async getPeriodos(incluirCerrados = true) {
    return this.prisma.periodoRanking.findMany({
      where: incluirCerrados ? {} : { estado: { not: EstadoRanking.CERRADO } },
      include: {
        creadoPor: { select: { id: true, nombre: true } },
        cerradoPor: { select: { id: true, nombre: true } },
        _count: { select: { historialPuntos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener un período por ID
  async getPeriodo(id: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
      include: {
        creadoPor: { select: { id: true, nombre: true } },
        cerradoPor: { select: { id: true, nombre: true } },
        _count: { select: { historialPuntos: true } },
      },
    });

    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    return periodo;
  }

  // Crear nuevo período
  async crearPeriodo(dto: CrearPeriodoDto, creadoPorId: number) {
    // Verificar que no haya otro período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (periodoActivo) {
      throw new BadRequestException(
        `Ya existe un período activo: "${periodoActivo.nombre}". Ciérralo primero antes de crear uno nuevo.`,
      );
    }

    const periodo = await this.prisma.periodoRanking.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        creadoPorId,
      },
      include: {
        creadoPor: { select: { id: true, nombre: true } },
      },
    });

    // Resetear puntos_trimestre de todos los usuarios
    await this.prisma.usuarioGamificacion.updateMany({
      data: { puntosTrimestre: 0 },
    });

    return periodo;
  }

  // Actualizar período
  async actualizarPeriodo(id: number, dto: ActualizarPeriodoDto) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
    });
    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    return this.prisma.periodoRanking.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        fechaFin:
          dto.fechaFin === null
            ? null
            : dto.fechaFin
              ? new Date(dto.fechaFin)
              : undefined,
      },
    });
  }

  // Cerrar período
  async cerrarPeriodo(id: number, cerradoPorId: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
    });
    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    if (periodo.estado === EstadoRanking.CERRADO) {
      throw new BadRequestException('Este período ya está cerrado');
    }

    // Obtener top 10 para guardar como snapshot
    const top10 = await this.getRanking({ periodoId: id, limit: 10 });

    // Cerrar el período
    const periodoCerrado = await this.prisma.periodoRanking.update({
      where: { id },
      data: {
        estado: EstadoRanking.CERRADO,
        cerradoAt: new Date(),
        cerradoPorId,
        resultadosJson: top10,
      },
    });

    // Resetear puntos_trimestre de todos los usuarios
    await this.prisma.usuarioGamificacion.updateMany({
      data: { puntosTrimestre: 0 },
    });

    return {
      periodo: periodoCerrado,
      mensaje: `Período "${periodo.nombre}" cerrado exitosamente. ${top10.length} participantes en el ranking final.`,
      top3: top10.slice(0, 3),
    };
  }

  // Reactivar período (reabrir)
  async reactivarPeriodo(id: number, reactivadoPorId: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
    });
    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    if (periodo.estado === EstadoRanking.ACTIVO) {
      throw new BadRequestException('Este período ya está activo');
    }

    // Verificar que no haya otro período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (periodoActivo) {
      throw new BadRequestException(
        `Ya existe un período activo: "${periodoActivo.nombre}". Ciérralo primero.`,
      );
    }

    // Reactivar
    const periodoReactivado = await this.prisma.periodoRanking.update({
      where: { id },
      data: {
        estado: EstadoRanking.ACTIVO,
        cerradoAt: null,
        cerradoPorId: null,
      },
    });

    // Recalcular puntos_trimestre para todos los usuarios basado en este período
    const puntosPorUsuario = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: { periodoRankingId: id },
      _sum: { puntos: true },
    });

    for (const p of puntosPorUsuario) {
      await this.prisma.usuarioGamificacion.update({
        where: { id: p.usuarioGamId },
        data: { puntosTrimestre: p._sum.puntos || 0 },
      });
    }

    return {
      periodo: periodoReactivado,
      mensaje: `Período "${periodo.nombre}" reactivado exitosamente.`,
    };
  }

  // Pausar período (no se asignan puntos pero no está cerrado)
  async pausarPeriodo(id: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
    });
    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    if (periodo.estado !== EstadoRanking.ACTIVO) {
      throw new BadRequestException('Solo se pueden pausar períodos activos');
    }

    return this.prisma.periodoRanking.update({
      where: { id },
      data: { estado: EstadoRanking.PAUSADO },
    });
  }

  // Reanudar período pausado
  async reanudarPeriodo(id: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
    });
    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    if (periodo.estado !== EstadoRanking.PAUSADO) {
      throw new BadRequestException(
        'Solo se pueden reanudar períodos pausados',
      );
    }

    // Verificar que no haya otro período activo
    const periodoActivo = await this.getPeriodoActivo();
    if (periodoActivo && periodoActivo.id !== id) {
      throw new BadRequestException(
        `Ya existe un período activo: "${periodoActivo.nombre}". Ciérralo primero.`,
      );
    }

    return this.prisma.periodoRanking.update({
      where: { id },
      data: { estado: EstadoRanking.ACTIVO },
    });
  }

  // Eliminar período (solo si no tiene puntos)
  async eliminarPeriodo(id: number) {
    const periodo = await this.prisma.periodoRanking.findUnique({
      where: { id },
      include: { _count: { select: { historialPuntos: true } } },
    });

    if (!periodo) {
      throw new NotFoundException('Período no encontrado');
    }

    if (periodo._count.historialPuntos > 0) {
      throw new BadRequestException(
        `No se puede eliminar: el período tiene ${periodo._count.historialPuntos} registros de puntos. Ciérralo en su lugar.`,
      );
    }

    await this.prisma.periodoRanking.delete({ where: { id } });
    return { mensaje: 'Período eliminado exitosamente' };
  }

  // ==================== ADMIN: HISTORIAL DE PUNTOS ====================

  // [Admin] Obtener historial de todos los usuarios con filtros
  async getHistorialAdmin(filtros: {
    usuarioId?: number;
    periodoId?: number;
    categoria?: CategoriaAccion;
    fechaDesde?: Date;
    fechaHasta?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      usuarioId,
      periodoId,
      categoria,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
    } = filtros;

    const where: any = {};

    if (usuarioId) {
      where.usuarioGam = { usuarioId };
    }

    if (periodoId) {
      where.periodoRankingId = periodoId;
    }

    if (categoria) {
      where.configPuntaje = { categoria };
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = fechaDesde;
      if (fechaHasta) where.fecha.lte = fechaHasta;
    }

    const [items, total] = await Promise.all([
      this.prisma.historialPuntos.findMany({
        where,
        include: {
          usuarioGam: {
            include: {
              usuario: { select: { id: true, nombre: true, fotoUrl: true } },
            },
          },
          configPuntaje: true,
          periodoRanking: { select: { id: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.historialPuntos.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        usuario: item.usuarioGam.usuario,
        categoria: item.configPuntaje?.categoria || 'OTRO',
        accion:
          item.configPuntaje?.nombre || item.descripcion || 'Acción manual',
        descripcion: item.descripcion,
        puntos: item.puntos,
        xp: item.xp,
        fecha: item.fecha,
        periodo: item.periodoRanking,
        createdAt: item.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // [Admin] Obtener una entrada del historial por ID
  async getHistorialEntry(id: number) {
    const entry = await this.prisma.historialPuntos.findUnique({
      where: { id },
      include: {
        usuarioGam: {
          include: {
            usuario: { select: { id: true, nombre: true } },
          },
        },
        configPuntaje: true,
        periodoRanking: { select: { id: true, nombre: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException('Registro no encontrado');
    }

    return entry;
  }

  // [Admin] Actualizar una entrada del historial
  async updateHistorialEntry(
    id: number,
    dto: { puntos?: number; xp?: number; descripcion?: string },
  ) {
    const entry = await this.prisma.historialPuntos.findUnique({
      where: { id },
      include: { usuarioGam: true },
    });

    if (!entry) {
      throw new NotFoundException('Registro no encontrado');
    }

    // Calcular diferencia para actualizar totales
    const diffPuntos = (dto.puntos ?? entry.puntos) - entry.puntos;
    const diffXp = (dto.xp ?? entry.xp) - entry.xp;

    // Actualizar el registro
    const updated = await this.prisma.historialPuntos.update({
      where: { id },
      data: {
        puntos: dto.puntos,
        xp: dto.xp,
        descripcion: dto.descripcion,
      },
    });

    // Actualizar totales del usuario
    if (diffPuntos !== 0 || diffXp !== 0) {
      await this.prisma.usuarioGamificacion.update({
        where: { id: entry.usuarioGamId },
        data: {
          puntosTotal: { increment: diffPuntos },
          puntosTrimestre: { increment: diffPuntos },
          xpTotal: { increment: diffXp },
        },
      });

      // Verificar si cambió el nivel
      await this.verificarYActualizarNivel(entry.usuarioGamId);
    }

    return { mensaje: 'Registro actualizado correctamente', registro: updated };
  }

  // [Admin] Eliminar una entrada del historial
  async deleteHistorialEntry(id: number) {
    const entry = await this.prisma.historialPuntos.findUnique({
      where: { id },
      include: { usuarioGam: true },
    });

    if (!entry) {
      throw new NotFoundException('Registro no encontrado');
    }

    // Si es un evento, eliminar también el registro de EventoEspecialRegistro
    if (entry.referenciaTipo === 'evento' && entry.referenciaId) {
      await this.prisma.eventoEspecialRegistro.deleteMany({
        where: {
          usuarioGamId: entry.usuarioGamId,
          eventoConfigId: entry.referenciaId,
          fecha: entry.fecha,
        },
      });
    }

    // Si es una asistencia, eliminar también el registro de Asistencia
    if (entry.referenciaTipo === 'asistencia' && entry.referenciaId) {
      await this.prisma.asistencia
        .delete({
          where: { id: entry.referenciaId },
        })
        .catch(() => {
          // Si la asistencia ya fue eliminada, continuar
        });

      // Decrementar contador de asistencias
      await this.prisma.usuarioGamificacion.update({
        where: { id: entry.usuarioGamId },
        data: {
          asistenciasTotales: { decrement: 1 },
        },
      });
    }

    // Eliminar el registro
    await this.prisma.historialPuntos.delete({ where: { id } });

    // Restar puntos del usuario
    await this.prisma.usuarioGamificacion.update({
      where: { id: entry.usuarioGamId },
      data: {
        puntosTotal: { decrement: entry.puntos },
        puntosTrimestre: { decrement: entry.puntos },
        xpTotal: { decrement: entry.xp },
      },
    });

    // Verificar si cambió el nivel
    await this.verificarYActualizarNivel(entry.usuarioGamId);

    return { mensaje: 'Registro eliminado correctamente' };
  }

  // Helper: Verificar y actualizar nivel después de cambios en XP
  private async verificarYActualizarNivel(usuarioGamId: number) {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { id: usuarioGamId },
    });

    if (!perfil) return;

    // Obtener el nivel correcto según XP actual
    const nivelCorrecto = await this.prisma.nivelBiblico.findFirst({
      where: {
        activo: true,
        xpRequerido: { lte: perfil.xpTotal },
      },
      orderBy: { xpRequerido: 'desc' },
    });

    if (nivelCorrecto && nivelCorrecto.id !== perfil.nivelId) {
      await this.prisma.usuarioGamificacion.update({
        where: { id: usuarioGamId },
        data: { nivelId: nivelCorrecto.id },
      });
    }
  }

  // Método público para verificar y actualizar nivel (usado por otros servicios)
  async verificarYActualizarNivelPublic(usuarioGamId: number) {
    return this.verificarYActualizarNivel(usuarioGamId);
  }

  // ==================== ESTADÍSTICAS DASHBOARD ====================

  /**
   * Obtener estadísticas para el dashboard (global o personal)
   * @param usuarioId - Si se proporciona, filtra por usuario (dashboard personal)
   */
  async getEstadisticasDashboard(usuarioId?: number) {
    // Obtener período activo para filtrar
    const periodoActivo = await this.getPeriodoActivo();

    // --- Acciones por tipo (de HistorialPuntos agrupado por ConfiguracionPuntaje) ---
    const whereHistorial: any = periodoActivo
      ? { periodoRankingId: periodoActivo.id }
      : {};

    if (usuarioId) {
      whereHistorial.usuarioGam = { usuarioId };
    }

    // Agrupar acciones normales por configPuntajeId
    const accionesAgrupadas = await this.prisma.historialPuntos.groupBy({
      by: ['configPuntajeId'],
      where: { ...whereHistorial, configPuntajeId: { not: null } },
      _count: true,
      _sum: { puntos: true },
    });

    const configIds = accionesAgrupadas.map((a) => a.configPuntajeId as number);
    const configs = await this.prisma.configuracionPuntaje.findMany({
      where: { id: { in: configIds } },
    });
    const configMap = new Map(configs.map((c) => [c.id, c]));

    const accionesPorTipo: { codigo: string; nombre: string; cantidad: number; puntosTotales: number; categoria: string }[] = accionesAgrupadas
      .map((a) => {
        const config = configMap.get(a.configPuntajeId as number);
        return {
          codigo: config?.codigo || 'otro',
          nombre: config?.nombre || 'Otro',
          cantidad: a._count,
          puntosTotales: a._sum.puntos || 0,
          categoria: config?.categoria || 'OTRO',
        };
      });

    // Agrupar eventos especiales (referenciaTipo = 'evento')
    const eventosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['referenciaId'],
      where: { ...whereHistorial, referenciaTipo: 'evento', referenciaId: { not: null } },
      _count: true,
      _sum: { puntos: true },
    });

    if (eventosAgrupados.length > 0) {
      const eventoIds = eventosAgrupados.map((e) => e.referenciaId as number);
      const eventosConfig = await this.prisma.eventoEspecialConfig.findMany({
        where: { id: { in: eventoIds } },
      });
      const eventoMap = new Map(eventosConfig.map((e) => [e.id, e]));

      for (const e of eventosAgrupados) {
        const config = eventoMap.get(e.referenciaId as number);
        accionesPorTipo.push({
          codigo: config?.codigo || 'evento',
          nombre: config?.nombre || 'Evento',
          cantidad: e._count,
          puntosTotales: e._sum.puntos || 0,
          categoria: 'EVENTO_ESPECIAL',
        });
      }
    }

    accionesPorTipo.sort((a, b) => b.puntosTotales - a.puntosTotales);

    // --- Partes más hechas (de ProgramaAsignacion agrupado por Parte) ---
    const whereAsignacion: any = {};
    if (usuarioId) {
      whereAsignacion.usuarioId = usuarioId;
    }

    const partesAgrupadas = await this.prisma.programaAsignacion.groupBy({
      by: ['parteId'],
      where: whereAsignacion,
      _count: true,
    });

    // Obtener nombres de las partes
    const parteIds = partesAgrupadas.map((p) => p.parteId);
    const partes = await this.prisma.parte.findMany({
      where: { id: { in: parteIds } },
    });
    const parteMap = new Map(partes.map((p) => [p.id, p]));

    const partesMasHechas = partesAgrupadas
      .map((p) => {
        const parte = parteMap.get(p.parteId);
        return {
          id: p.parteId,
          nombre: parte?.nombre || 'Desconocida',
          cantidad: p._count,
        };
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10); // Top 10 partes

    return {
      accionesPorTipo,
      partesMasHechas,
      periodo: periodoActivo
        ? { id: periodoActivo.id, nombre: periodoActivo.nombre }
        : null,
    };
  }

  /**
   * Obtener las posiciones del usuario en todos los grupos de ranking
   */
  async getMisPosicionesRanking(usuarioId: number) {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
    });

    if (!perfil) return [];

    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) return [];

    // Obtener todos los grupos de ranking activos
    const grupos = await this.prisma.grupoRanking.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });

    const posiciones: {
      grupoId: number;
      nombre: string;
      icono: string | null;
      posicion: number;
      totalMiembros: number;
      puntos: number;
    }[] = [];

    // Obtener roles del usuario para resolver membresía por criterio
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { roles: { include: { rol: true } } },
    });
    const rolesUsuario = usuario?.roles.map((r) => r.rol.nombre) || [];
    const esAdmin = rolesUsuario.includes('admin');
    const esLider = rolesUsuario.includes('lider');

    for (const grupo of grupos) {
      // Resolver miembros según el criterio del grupo
      let usuarioIds: number[] = [];

      if (grupo.criterio === 'MANUAL') {
        const miembros = await this.prisma.grupoRankingMiembro.findMany({
          where: { grupoId: grupo.id },
          select: { usuarioId: true },
        });
        usuarioIds = miembros.map((m) => m.usuarioId);
      } else if (grupo.criterio === 'TODOS_ACTIVOS') {
        const usuarios = await this.prisma.usuario.findMany({
          where: {
            activo: true,
            esJA: true,
            participaEnRanking: true,
            roles: { none: { rol: { nombre: { in: ['admin', 'lider'] } } } },
          },
          select: { id: true },
        });
        usuarioIds = usuarios.map((u) => u.id);
      } else if (grupo.criterio === 'ROL_LIDER_ADMIN') {
        const usuarios = await this.prisma.usuario.findMany({
          where: {
            activo: true,
            participaEnRanking: true,
            roles: { some: { rol: { nombre: { in: ['admin', 'lider'] } } } },
          },
          select: { id: true },
        });
        usuarioIds = usuarios.map((u) => u.id);
      } else if (grupo.criterio === 'ROL_LIDER') {
        const usuarios = await this.prisma.usuario.findMany({
          where: {
            activo: true,
            participaEnRanking: true,
            roles: { some: { rol: { nombre: 'lider' } } },
          },
          select: { id: true },
        });
        usuarioIds = usuarios.map((u) => u.id);
      } else if (grupo.criterio === 'ROL_ADMIN') {
        const usuarios = await this.prisma.usuario.findMany({
          where: {
            activo: true,
            participaEnRanking: true,
            roles: { some: { rol: { nombre: 'admin' } } },
          },
          select: { id: true },
        });
        usuarioIds = usuarios.map((u) => u.id);
      }

      if (!usuarioIds.includes(usuarioId)) continue; // No está en este grupo

      // Obtener puntos de todos los miembros
      const puntosPorUsuario = await this.prisma.historialPuntos.groupBy({
        by: ['usuarioGamId'],
        where: {
          periodoRankingId: periodoActivo.id,
          usuarioGam: { usuarioId: { in: usuarioIds } },
        },
        _sum: { puntos: true },
      });

      // Obtener el perfil del usuario actual
      const perfilIds = await this.prisma.usuarioGamificacion.findMany({
        where: { usuarioId: { in: usuarioIds } },
        select: { id: true, usuarioId: true },
      });

      const miPerfilId = perfilIds.find((p) => p.usuarioId === usuarioId)?.id;

      if (!miPerfilId) continue;

      const misPuntos =
        puntosPorUsuario.find((p) => p.usuarioGamId === miPerfilId)?._sum
          .puntos || 0;

      const posicion =
        puntosPorUsuario.filter((p) => (p._sum.puntos || 0) > misPuntos)
          .length + 1;

      posiciones.push({
        grupoId: grupo.id,
        nombre: grupo.nombre,
        icono: grupo.icono,
        posicion,
        totalMiembros: usuarioIds.length,
        puntos: misPuntos,
      });
    }

    return posiciones;
  }

  // ==================== RANKING POR NIVEL ====================

  /**
   * Obtener ranking de un nivel específico con paginación
   */
  async getRankingNivel(
    nivelId: number,
    periodoId?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Determinar el período
    let periodo: { id: number } | null = null;
    if (periodoId) {
      periodo = await this.prisma.periodoRanking.findUnique({
        where: { id: periodoId },
      });
    } else {
      periodo = await this.getPeriodoActivo();
    }

    if (!periodo) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    // Obtener todos los usuarios de este nivel
    const usuariosDelNivel = await this.prisma.usuarioGamificacion.findMany({
      where: { nivelId },
      select: { id: true, usuarioId: true },
    });

    if (usuariosDelNivel.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const usuarioGamIds = usuariosDelNivel.map((u) => u.id);

    // Obtener puntos del período para estos usuarios (todos para ordenar correctamente)
    const puntosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: {
        periodoRankingId: periodo.id,
        usuarioGamId: { in: usuarioGamIds },
      },
      _sum: { puntos: true },
      orderBy: { _sum: { puntos: 'desc' } },
    });

    const total = puntosAgrupados.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginados = puntosAgrupados.slice(skip, skip + limit);

    // Obtener información completa de los usuarios
    const perfilesIds = paginados.map((p) => p.usuarioGamId);
    const perfiles = await this.prisma.usuarioGamificacion.findMany({
      where: { id: { in: perfilesIds } },
      include: {
        usuario: { select: { id: true, nombre: true, fotoUrl: true } },
        nivel: true,
      },
    });

    const perfilesMap = new Map(perfiles.map((p) => [p.id, p]));

    const data = paginados.map((p, index) => {
      const perfil = perfilesMap.get(p.usuarioGamId);
      return {
        posicion: skip + index + 1,
        usuarioId: perfil?.usuario.id,
        nombre: perfil?.usuario.nombre || 'Usuario',
        fotoUrl: perfil?.usuario.fotoUrl,
        nivelNumero: perfil?.nivel.numero,
        nivelNombre: perfil?.nivel.nombre,
        nivelColor: perfil?.nivel.color,
        puntosPeriodo: p._sum.puntos || 0,
        rachaActual: perfil?.rachaActual || 0,
        asistenciasTotales: perfil?.asistenciasTotales || 0,
      };
    });

    return { data, meta: { total, page, limit, totalPages } };
  }

  /**
   * Obtener rankings de todos los niveles con datos resumidos
   */
  async getRankingsPorNivel(periodoId?: number) {
    // Determinar el período
    let periodo: { id: number; nombre: string } | null = null;
    if (periodoId) {
      periodo = await this.prisma.periodoRanking.findUnique({
        where: { id: periodoId },
        select: { id: true, nombre: true },
      });
    } else {
      periodo = await this.getPeriodoActivo();
    }

    // Obtener todos los niveles activos
    const niveles = await this.prisma.nivelBiblico.findMany({
      where: { activo: true },
      orderBy: { numero: 'asc' },
      include: {
        _count: { select: { usuariosEnNivel: true } },
      },
    });

    const rankings: {
      nivel: {
        id: number;
        numero: number;
        nombre: string;
        icono: string | null;
        color: string | null;
      };
      totalUsuarios: number;
      top3: any[];
    }[] = [];

    for (const nivel of niveles) {
      // Obtener top 3 del nivel (si hay período activo)
      let top3: any[] = [];
      if (periodo) {
        const rankingResult = await this.getRankingNivel(nivel.id, periodo.id, 1, 3);
        top3 = rankingResult.data;
      }

      rankings.push({
        nivel: {
          id: nivel.id,
          numero: nivel.numero,
          nombre: nivel.nombre,
          icono: nivel.icono,
          color: nivel.color,
        },
        totalUsuarios: nivel._count.usuariosEnNivel,
        top3,
      });
    }

    return {
      periodo: periodo ? { id: periodo.id, nombre: periodo.nombre } : null,
      rankings,
    };
  }

  /**
   * Obtener posición del usuario en su nivel actual
   */
  async getMiPosicionEnNivel(usuarioId: number) {
    const perfil = await this.prisma.usuarioGamificacion.findUnique({
      where: { usuarioId },
      include: { nivel: true },
    });

    if (!perfil) return null;

    const periodoActivo = await this.getPeriodoActivo();
    if (!periodoActivo) {
      return {
        nivel: perfil.nivel,
        posicion: 0,
        totalEnNivel: 0,
        puntos: 0,
      };
    }

    // Obtener todos los usuarios del mismo nivel
    const usuariosDelNivel = await this.prisma.usuarioGamificacion.findMany({
      where: { nivelId: perfil.nivelId },
      select: { id: true },
    });

    const usuarioGamIds = usuariosDelNivel.map((u) => u.id);

    // Obtener puntos de todos los usuarios del nivel
    const puntosAgrupados = await this.prisma.historialPuntos.groupBy({
      by: ['usuarioGamId'],
      where: {
        periodoRankingId: periodoActivo.id,
        usuarioGamId: { in: usuarioGamIds },
      },
      _sum: { puntos: true },
    });

    const misPuntos =
      puntosAgrupados.find((p) => p.usuarioGamId === perfil.id)?._sum.puntos ||
      0;

    const posicion =
      puntosAgrupados.filter((p) => (p._sum.puntos || 0) > misPuntos).length +
      1;

    return {
      nivel: perfil.nivel,
      posicion,
      totalEnNivel: usuariosDelNivel.length,
      puntos: misPuntos,
    };
  }
}
