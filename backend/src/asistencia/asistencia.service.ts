import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateQRAsistenciaDto,
    UpdateQRAsistenciaDto,
    RegistrarAsistenciaDto,
    RegistrarAsistenciaManualDto,
    ConfirmarAsistenciaDto,
    FilterAsistenciasDto,
} from './dto';
import { randomBytes } from 'crypto';
import { AsistenciaGateway } from './gateway/asistencia.gateway';
import * as ExcelJS from 'exceljs';
import {
    getTodayAsUTC,
    getInicioSemana,
    buildDateFilter,
    calculatePagination,
    buildPaginationMeta,
    toStartOfDayUTC,
} from '../common/utils';

@Injectable()
export class AsistenciaService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => AsistenciaGateway))
        private asistenciaGateway: AsistenciaGateway,
    ) { }

    // ==================== QR MANAGEMENT ====================

    async createQR(dto: CreateQRAsistenciaDto, createdBy: number) {
        // Verificar que el tipo de asistencia existe
        const tipoAsistencia = await this.prisma.tipoAsistencia.findUnique({
            where: { id: dto.tipoId },
        });

        if (!tipoAsistencia) {
            throw new NotFoundException('Tipo de asistencia no encontrado');
        }

        if (!tipoAsistencia.activo) {
            throw new BadRequestException('Este tipo de asistencia no está activo');
        }

        // Generate unique code
        const codigo = `JA-${randomBytes(4).toString('hex').toUpperCase()}`;

        // Parse hours
        const horaInicio = dto.horaInicio ? this.parseTimeToDate(dto.horaInicio) : new Date('1970-01-01T09:00:00');
        const horaFin = dto.horaFin ? this.parseTimeToDate(dto.horaFin) : new Date('1970-01-01T12:00:00');

        const qr = await this.prisma.qRAsistencia.create({
            data: {
                semanaInicio: toStartOfDayUTC(dto.semanaInicio),
                codigo,
                tipoId: dto.tipoId,
                descripcion: dto.descripcion,
                horaInicio,
                horaFin,
                urlGenerada: `/asistencia/${codigo}`,
                createdBy,
            },
            include: {
                tipoAsistencia: {
                    include: {
                        campos: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
                creador: { select: { id: true, nombre: true } },
            },
        });

        return this.formatQR(qr);
    }

    private parseTimeToDate(timeStr: string): Date {
        const [hours, minutes] = timeStr.split(':').map(Number);
        // Con TZ=America/Lima en el contenedor, setHours usa hora de Lima
        const date = new Date('1970-01-01T00:00:00');
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    async findAllQRs(options?: { page?: number; limit?: number; activo?: boolean; tipoId?: number }) {
        const { page = 1, limit = 10, activo, tipoId } = options || {};
        const skip = (page - 1) * limit;

        const where: any = {};
        if (activo !== undefined) {
            where.activo = activo;
            // Si se pide activos, solo mostrar los de hoy o futuros
            if (activo === true) {
                const hoy = getTodayAsUTC();
                where.semanaInicio = { gte: hoy };
            }
        }
        if (tipoId !== undefined) {
            where.tipoId = tipoId;
        }

        const [qrs, total] = await Promise.all([
            this.prisma.qRAsistencia.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    tipoAsistencia: {
                        include: {
                            campos: {
                                where: { activo: true },
                                orderBy: { orden: 'asc' },
                            },
                        },
                    },
                    creador: { select: { id: true, nombre: true } },
                    _count: { select: { asistencias: true } },
                },
            }),
            this.prisma.qRAsistencia.count({ where }),
        ]);

        return {
            data: qrs.map((qr) => this.formatQR(qr)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findQRByCodigo(codigo: string) {
        const qr = await this.prisma.qRAsistencia.findUnique({
            where: { codigo },
            include: {
                tipoAsistencia: {
                    include: {
                        campos: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
                creador: { select: { id: true, nombre: true } },
            },
        });

        if (!qr) {
            throw new NotFoundException('QR no encontrado');
        }

        return this.formatQR(qr);
    }

    /**
     * Obtener QRs disponibles para registro (activos, de la fecha actual, dentro de su horario
     * y que el usuario aún no haya registrado)
     */
    async getQRsDisponibles(usuarioId: number) {
        const now = new Date();
        const horaActual = now.getHours() * 60 + now.getMinutes();

        // Obtener la fecha de hoy en formato UTC
        const hoy = getTodayAsUTC();

        // Obtener las asistencias ya registradas por el usuario hoy
        const asistenciasRegistradas = await this.prisma.asistencia.findMany({
            where: {
                usuarioId,
                semanaInicio: hoy,
            },
            select: { tipoId: true },
        });
        const tiposYaRegistrados = new Set(asistenciasRegistradas.map(a => a.tipoId));

        // Obtener todos los QRs activos de hoy
        const qrs = await this.prisma.qRAsistencia.findMany({
            where: {
                activo: true,
                semanaInicio: hoy,
            },
            include: {
                tipoAsistencia: {
                    include: {
                        campos: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
                creador: { select: { id: true, nombre: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Filtrar: dentro de horario Y que el usuario no haya registrado ese tipo
        const qrsDisponibles = qrs.filter(qr => {
            // Verificar horario
            const horaInicioQR = qr.horaInicio instanceof Date
                ? qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes()
                : 9 * 60;
            const horaFinQR = qr.horaFin instanceof Date
                ? qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes()
                : 12 * 60;

            // Verificar si está en horario (considerando horarios que cruzan medianoche)
            let enHorario: boolean;
            if (horaFinQR > horaInicioQR) {
                // Horario normal (ej: 09:00 - 12:00)
                enHorario = horaActual >= horaInicioQR && horaActual < horaFinQR;
            } else {
                // Horario que cruza medianoche (ej: 14:00 - 04:00)
                enHorario = horaActual >= horaInicioQR || horaActual < horaFinQR;
            }

            // Verificar que no haya registrado este tipo de asistencia
            const noRegistrado = !tiposYaRegistrados.has(qr.tipoId);

            return enHorario && noRegistrado;
        });

        return qrsDisponibles.map(qr => this.formatQR(qr));
    }

    async toggleQRActive(id: number) {
        const qr = await this.prisma.qRAsistencia.findUnique({ where: { id } });

        if (!qr) {
            throw new NotFoundException('QR no encontrado');
        }

        const updated = await this.prisma.qRAsistencia.update({
            where: { id },
            data: { activo: !qr.activo },
            include: {
                tipoAsistencia: true,
            },
        });

        return this.formatQR(updated);
    }

    async updateQR(id: number, dto: UpdateQRAsistenciaDto) {
        const qr = await this.prisma.qRAsistencia.findUnique({ where: { id } });

        if (!qr) {
            throw new NotFoundException('QR no encontrado');
        }

        const updateData: any = {};

        if (dto.semanaInicio) {
            updateData.semanaInicio = toStartOfDayUTC(dto.semanaInicio);
        }
        if (dto.horaInicio) {
            updateData.horaInicio = this.parseTimeToDate(dto.horaInicio);
        }
        if (dto.horaFin) {
            updateData.horaFin = this.parseTimeToDate(dto.horaFin);
        }
        if (dto.descripcion !== undefined) {
            updateData.descripcion = dto.descripcion;
        }

        const updated = await this.prisma.qRAsistencia.update({
            where: { id },
            data: updateData,
            include: {
                tipoAsistencia: {
                    include: {
                        campos: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
                creador: { select: { id: true, nombre: true } },
                _count: { select: { asistencias: true } },
            },
        });

        return this.formatQR(updated);
    }

    // ==================== ASISTENCIA MANAGEMENT ====================

    async registrarAsistencia(usuarioId: number, dto: RegistrarAsistenciaDto) {
        // Validar que usuarioId sea un número válido
        if (!usuarioId || isNaN(usuarioId)) {
            throw new BadRequestException('Usuario no válido');
        }

        // Usar fecha de Lima (UTC-5) normalizada al inicio del día
        const hoy = getTodayAsUTC();

        // Usar la fecha de hoy como semanaInicio (no el sábado)
        const semanaInicio = hoy;

        let tipoId: number | null = null;
        let qrId: number | null = null;
        let qrCode: string | null = null;

        // Si viene con código QR, verificar que exista y esté activo
        if (dto.codigoQR) {
            const qr = await this.prisma.qRAsistencia.findUnique({
                where: { codigo: dto.codigoQR },
                include: {
                    tipoAsistencia: {
                        include: {
                            campos: {
                                where: { activo: true },
                            },
                        },
                    },
                },
            });

            if (!qr) {
                throw new NotFoundException('Código QR no válido');
            }

            if (!qr.activo) {
                throw new BadRequestException('Este código QR ya no está activo');
            }

            // Verificar horario del QR usando la hora actual real
            const now = new Date();
            const horaActualEnMinutos = now.getHours() * 60 + now.getMinutes();

            // Obtener horas del QR
            const horaInicioQR = qr.horaInicio instanceof Date
                ? qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes()
                : 9 * 60; // Default 9:00
            const horaFinQR = qr.horaFin instanceof Date
                ? qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes()
                : 12 * 60; // Default 12:00

            // Verificar si está en horario (considerando horarios que cruzan medianoche)
            let enHorario: boolean;
            if (horaFinQR > horaInicioQR) {
                // Horario normal (ej: 09:00 - 12:00)
                enHorario = horaActualEnMinutos >= horaInicioQR && horaActualEnMinutos < horaFinQR;
            } else {
                // Horario que cruza medianoche (ej: 14:00 - 04:00)
                enHorario = horaActualEnMinutos >= horaInicioQR || horaActualEnMinutos < horaFinQR;
            }

            if (!enHorario) {
                const horaInicioStr = this.formatHora(qr.horaInicio);
                const horaFinStr = this.formatHora(qr.horaFin);
                throw new BadRequestException(`Solo se puede registrar asistencia entre ${horaInicioStr} y ${horaFinStr}`);
            }

            tipoId = qr.tipoId;
            qrId = qr.id;
            qrCode = qr.codigo;

            // Validar datos del formulario según los campos del tipo
            if (qr.tipoAsistencia && !qr.tipoAsistencia.soloPresencia && qr.tipoAsistencia.campos.length > 0) {
                this.validateFormularioData(dto.datosFormulario, qr.tipoAsistencia.campos);
            }
        } else if (dto.tipoId) {
            // Si no hay QR pero sí tipoId, validar que exista
            const tipo = await this.prisma.tipoAsistencia.findUnique({
                where: { id: dto.tipoId },
                include: {
                    campos: {
                        where: { activo: true },
                    },
                },
            });

            if (!tipo) {
                throw new NotFoundException('Tipo de asistencia no encontrado');
            }

            tipoId = dto.tipoId;

            // Validar datos del formulario
            if (!tipo.soloPresencia && tipo.campos.length > 0) {
                this.validateFormularioData(dto.datosFormulario, tipo.campos);
            }
        }

        // Verificar si ya registró esta semana para este tipo
        const existente = await this.prisma.asistencia.findFirst({
            where: {
                usuarioId: usuarioId,
                semanaInicio: semanaInicio,
                tipoId: tipoId,
            },
        });

        if (existente) {
            throw new ConflictException('Ya registraste asistencia esta semana para este tipo');
        }

        const asistencia = await this.prisma.asistencia.create({
            data: {
                usuarioId,
                tipoId,
                fecha: hoy,
                semanaInicio,
                datosFormulario: dto.datosFormulario || {},
                metodoRegistro: dto.metodoRegistro || 'plataforma',
                estado: 'pendiente_confirmacion',
                qrId,
            },
            include: {
                usuario: { select: { id: true, nombre: true } },
                tipo: { select: { id: true, nombre: true, label: true, color: true } },
                qr: { select: { id: true, codigo: true } },
            },
        });

        const formattedAsistencia = this.formatAsistencia(asistencia);

        // Emitir evento WebSocket si hay QR
        if (qrCode) {
            await this.asistenciaGateway.emitNuevaAsistencia(qrCode, formattedAsistencia);
        }

        return formattedAsistencia;
    }

    /**
     * Registrar asistencia manual (por admin/líder)
     * Permite registrar a otro usuario o a alguien sin cuenta
     */
    async registrarAsistenciaManual(registradoPorId: number, dto: RegistrarAsistenciaManualDto) {
        // Buscar el QR
        const qr = await this.prisma.qRAsistencia.findUnique({
            where: { codigo: dto.codigoQR },
            include: {
                tipoAsistencia: {
                    include: {
                        campos: {
                            where: { activo: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
            },
        });

        if (!qr) {
            throw new NotFoundException('Código QR no válido');
        }

        if (!qr.activo) {
            throw new BadRequestException('Este código QR ya no está activo');
        }

        // Validar horario del QR
        const hoy = getTodayAsUTC();
        const now = new Date();
        const horaActual = now.getHours();
        const minutoActual = now.getMinutes();
        const horaActualEnMinutos = horaActual * 60 + minutoActual;

        const horaInicioQR = qr.horaInicio instanceof Date
            ? qr.horaInicio.getHours() * 60 + qr.horaInicio.getMinutes()
            : 9 * 60;
        const horaFinQR = qr.horaFin instanceof Date
            ? qr.horaFin.getHours() * 60 + qr.horaFin.getMinutes()
            : 12 * 60;

        if (horaActualEnMinutos < horaInicioQR || horaActualEnMinutos >= horaFinQR) {
            const horaInicioStr = this.formatHora(qr.horaInicio);
            const horaFinStr = this.formatHora(qr.horaFin);
            throw new BadRequestException(`Solo se puede registrar asistencia entre ${horaInicioStr} y ${horaFinStr}`);
        }

        const semanaInicio = getInicioSemana(hoy);
        const tipoId = qr.tipoId;

        // Validar datos del formulario
        if (qr.tipoAsistencia && !qr.tipoAsistencia.soloPresencia && qr.tipoAsistencia.campos.length > 0) {
            this.validateFormularioData(dto.datosFormulario, qr.tipoAsistencia.campos);
        }

        // Determinar el usuario a registrar
        let usuarioId: number | null = null;
        let telefonoRegistro: string | null = null;
        let nombreRegistro: string | null = null;

        if (dto.usuarioId) {
            // Verificar que el usuario existe
            const usuario = await this.prisma.usuario.findUnique({
                where: { id: dto.usuarioId },
            });
            if (!usuario) {
                throw new NotFoundException('Usuario no encontrado');
            }
            usuarioId = dto.usuarioId;
        } else if (dto.telefonoManual) {
            // Buscar si existe usuario con ese teléfono
            const usuarioExistente = await this.prisma.usuario.findFirst({
                where: { telefono: dto.telefonoManual },
            });
            if (usuarioExistente) {
                usuarioId = usuarioExistente.id;
            } else {
                telefonoRegistro = dto.telefonoManual;
                nombreRegistro = dto.nombreManual || 'Sin nombre';
            }
        } else if (dto.nombreManual) {
            // Solo nombre, sin teléfono ni usuario
            nombreRegistro = dto.nombreManual;
        } else {
            throw new BadRequestException('Debe especificar un usuario, teléfono o nombre');
        }

        // Verificar restricción única (solo si hay usuarioId o telefonoRegistro)
        if (usuarioId || telefonoRegistro) {
            const existente = await this.prisma.asistencia.findFirst({
                where: {
                    semanaInicio,
                    tipoId,
                    OR: [
                        usuarioId ? { usuarioId } : undefined,
                        telefonoRegistro ? { telefonoRegistro } : undefined,
                    ].filter(Boolean) as any[],
                },
            });

            if (existente) {
                throw new ConflictException('Ya existe un registro de asistencia para este usuario en esta semana');
            }
        }

        // Crear asistencia confirmada automáticamente
        const asistencia = await this.prisma.asistencia.create({
            data: {
                usuarioId,
                telefonoRegistro,
                nombreRegistro,
                tipoId,
                fecha: hoy,
                semanaInicio,
                datosFormulario: dto.datosFormulario || {},
                metodoRegistro: 'manual',
                estado: 'confirmado',
                confirmadoPor: registradoPorId,
                confirmadoAt: new Date(),
                qrId: qr.id,
            },
            include: {
                usuario: { select: { id: true, nombre: true, email: true } },
                tipo: { select: { id: true, nombre: true, label: true, color: true } },
                qr: { select: { id: true, codigo: true } },
            },
        });

        const formattedAsistencia = this.formatAsistencia(asistencia);

        // Emitir evento WebSocket
        await this.asistenciaGateway.emitNuevaAsistencia(qr.codigo, formattedAsistencia);

        return formattedAsistencia;
    }

    private validateFormularioData(data: Record<string, any> | undefined, campos: any[]) {
        const camposRequeridos = campos.filter((c) => c.requerido);

        for (const campo of camposRequeridos) {
            if (!data || data[campo.nombre] === undefined || data[campo.nombre] === null || data[campo.nombre] === '') {
                throw new BadRequestException(`El campo "${campo.label}" es requerido`);
            }
        }

        // Validar tipos y rangos
        for (const campo of campos) {
            if (data && data[campo.nombre] !== undefined && data[campo.nombre] !== null) {
                const valor = data[campo.nombre];

                if (campo.tipo === 'number') {
                    const numValue = typeof valor === 'string' ? parseFloat(valor) : valor;
                    if (typeof numValue !== 'number' || isNaN(numValue)) {
                        throw new BadRequestException(`El campo "${campo.label}" debe ser un número`);
                    }
                    if (campo.valorMinimo !== null && numValue < campo.valorMinimo) {
                        throw new BadRequestException(`El campo "${campo.label}" debe ser al menos ${campo.valorMinimo}`);
                    }
                    if (campo.valorMaximo !== null && numValue > campo.valorMaximo) {
                        throw new BadRequestException(`El campo "${campo.label}" debe ser máximo ${campo.valorMaximo}`);
                    }
                }

                if (campo.tipo === 'select' && campo.opciones) {
                    const opciones = campo.opciones as { value: string; label: string }[];
                    const valoresValidos = opciones.map((o) => o.value);
                    if (!valoresValidos.includes(valor)) {
                        throw new BadRequestException(`El campo "${campo.label}" tiene un valor inválido`);
                    }
                }
            }
        }
    }

    async findAllAsistencias(filters: FilterAsistenciasDto) {
        const { page = 1, limit = 20, semanaInicio, fechaDesde, fechaHasta, estado, usuarioId, tipoId, metodoRegistro } = filters;
        const { skip, take } = calculatePagination(page, limit);

        const where: any = {};

        // Filtro por semana específica
        if (semanaInicio) {
            where.semanaInicio = toStartOfDayUTC(semanaInicio);
        }

        // Filtro por rango de fechas (usa el campo fecha con zona horaria Lima)
        const dateFilter = buildDateFilter(fechaDesde, fechaHasta);
        if (dateFilter) {
            where.fecha = dateFilter;
        }

        if (estado) {
            where.estado = estado;
        }
        if (usuarioId) {
            where.usuarioId = usuarioId;
        }
        if (tipoId) {
            where.tipoId = tipoId;
        }
        if (metodoRegistro) {
            where.metodoRegistro = metodoRegistro;
        }

        const [asistencias, total] = await Promise.all([
            this.prisma.asistencia.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
                    confirmador: { select: { id: true, nombre: true } },
                    qr: { select: { id: true, codigo: true } },
                    tipo: { select: { id: true, nombre: true, label: true, color: true } },
                },
            }),
            this.prisma.asistencia.count({ where }),
        ]);

        return {
            data: asistencias.map((a) => this.formatAsistencia(a)),
            meta: buildPaginationMeta(total, page, limit),
        };
    }

    async confirmarAsistencia(id: number, dto: ConfirmarAsistenciaDto, confirmadoPor: number) {
        const asistencia = await this.prisma.asistencia.findUnique({
            where: { id },
            include: {
                qr: { select: { codigo: true } },
            },
        });

        if (!asistencia) {
            throw new NotFoundException('Asistencia no encontrada');
        }

        if (asistencia.estado !== 'pendiente_confirmacion') {
            throw new BadRequestException('Esta asistencia ya fue procesada');
        }

        const updated = await this.prisma.asistencia.update({
            where: { id },
            data: {
                estado: dto.estado,
                confirmadoPor,
                confirmadoAt: new Date(),
                notasConfirmacion: dto.notas,
            },
            include: {
                usuario: { select: { id: true, nombre: true } },
                confirmador: { select: { id: true, nombre: true } },
                qr: { select: { id: true, codigo: true } },
                tipo: { select: { id: true, nombre: true, label: true, color: true } },
            },
        });

        const formattedAsistencia = this.formatAsistencia(updated);

        // Emitir evento WebSocket si hay QR
        if (asistencia.qr?.codigo) {
            await this.asistenciaGateway.emitAsistenciaActualizada(asistencia.qr.codigo, formattedAsistencia);
        }

        return formattedAsistencia;
    }

    async confirmarMultiples(ids: number[], estado: 'confirmado' | 'rechazado', confirmadoPor: number) {
        const updated = await this.prisma.asistencia.updateMany({
            where: {
                id: { in: ids },
                estado: 'pendiente_confirmacion',
            },
            data: {
                estado,
                confirmadoPor,
                confirmadoAt: new Date(),
            },
        });

        return { count: updated.count, message: `${updated.count} asistencias ${estado}s` };
    }

    async vincularUsuario(asistenciaId: number, usuarioId: number) {
        // Verificar que la asistencia existe
        const asistencia = await this.prisma.asistencia.findUnique({
            where: { id: asistenciaId },
        });
        if (!asistencia) {
            throw new NotFoundException(`Asistencia ${asistenciaId} no encontrada`);
        }

        // Verificar que el usuario existe
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: usuarioId },
        });
        if (!usuario) {
            throw new NotFoundException(`Usuario ${usuarioId} no encontrado`);
        }

        // Actualizar la asistencia
        return this.prisma.asistencia.update({
            where: { id: asistenciaId },
            data: { usuarioId },
            include: {
                usuario: { select: { id: true, nombre: true } },
                tipo: true,
            },
        });
    }

    // ==================== ESTADÍSTICAS ====================

    async getEstadisticasSemana(semanaInicio: Date) {
        const stats = await this.prisma.asistencia.groupBy({
            by: ['estado'],
            where: { semanaInicio },
            _count: { id: true },
        });

        const total = stats.reduce((acc, s) => acc + s._count.id, 0);
        const confirmados = stats.find(s => s.estado === 'confirmado')?._count.id || 0;
        const pendientes = stats.find(s => s.estado === 'pendiente_confirmacion')?._count.id || 0;
        const rechazados = stats.find(s => s.estado === 'rechazado')?._count.id || 0;

        return {
            semanaInicio,
            total,
            confirmados,
            pendientes,
            rechazados,
            porcentajeConfirmados: total > 0 ? Math.round((confirmados / total) * 100) : 0,
        };
    }

    async getEstadisticasGenerales() {
        const ultimosMeses = 6;
        const hoy = new Date();
        const meses: any[] = [];

        // Obtener todos los tipos de asistencia activos
        const tiposAsistencia = await this.prisma.tipoAsistencia.findMany({
            where: { activo: true },
            select: { id: true, nombre: true, label: true, color: true },
            orderBy: { orden: 'asc' },
        });

        for (let i = 0; i < ultimosMeses; i++) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
            const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);

            // Obtener conteo total y confirmados
            const [total, confirmados] = await Promise.all([
                this.prisma.asistencia.count({
                    where: {
                        fecha: { gte: mesInicio, lte: mesFin },
                    },
                }),
                this.prisma.asistencia.count({
                    where: {
                        fecha: { gte: mesInicio, lte: mesFin },
                        estado: 'confirmado',
                    },
                }),
            ]);

            // Obtener conteo por tipo de asistencia (solo confirmados)
            const porTipo = await this.prisma.asistencia.groupBy({
                by: ['tipoId'],
                where: {
                    fecha: { gte: mesInicio, lte: mesFin },
                    estado: 'confirmado',
                },
                _count: { id: true },
            });

            // Mapear los resultados por tipo con su información
            const porTipoConInfo = tiposAsistencia.map(tipo => {
                const encontrado = porTipo.find(p => p.tipoId === tipo.id);
                return {
                    tipoId: tipo.id,
                    nombre: tipo.nombre,
                    label: tipo.label,
                    color: tipo.color || '#6366f1',
                    cantidad: encontrado?._count.id || 0,
                };
            });

            meses.push({
                mes: mesInicio.toISOString(),
                mesNombre: mesInicio.toLocaleDateString('es-PE', { month: 'short' }),
                total,
                confirmados,
                porcentajeConfirmados: total > 0 ? Math.round((confirmados / total) * 100) : 0,
                porTipo: porTipoConInfo,
            });
        }

        // Total de usuarios activos
        const totalUsuarios = await this.prisma.usuario.count({ where: { activo: true } });

        // Asistencia del último mes (mes actual)
        const ultimoMes = meses[0];
        const promedioAsistencia = ultimoMes?.confirmados ?? 0;

        return {
            totalUsuarios,
            promedioAsistencia,
            tipos: tiposAsistencia,
            meses: meses.reverse(), // Ordenar de más antiguo a más reciente
        };
    }

    async getMiAsistencia(usuarioId: number) {
        const asistencias = await this.prisma.asistencia.findMany({
            where: {
                usuarioId,
                estado: 'confirmado',
            },
            orderBy: { semanaInicio: 'desc' },
            take: 12, // Últimas 12 semanas
            include: {
                tipo: { select: { id: true, nombre: true, label: true } },
            },
        });

        const totalAsistencias = asistencias.length;

        return {
            totalAsistencias,
            historial: asistencias.map(a => ({
                semanaInicio: a.semanaInicio,
                fecha: a.fecha,
                tipo: a.tipo,
                datosFormulario: a.datosFormulario,
            })),
        };
    }

    // ==================== ROOM STATS ====================

    async getAsistenciasRoom(qrCode: string) {
        const qr = await this.prisma.qRAsistencia.findUnique({
            where: { codigo: qrCode },
        });

        if (!qr) {
            throw new NotFoundException('QR no encontrado');
        }

        const asistencias = await this.prisma.asistencia.findMany({
            where: { qrId: qr.id },
            orderBy: { createdAt: 'desc' },
            include: {
                usuario: { select: { id: true, nombre: true } },
                tipo: { select: { id: true, nombre: true, label: true, color: true } },
            },
        });

        return asistencias.map((a) => this.formatAsistencia(a));
    }

    // ==================== HELPERS ====================

    private formatQR(qr: any) {
        const whatsappNumber = process.env.WHATSAPP_BOT_NUMBER || '';
        const urlWhatsapp = whatsappNumber
            ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(qr.codigo)}`
            : null;

        return {
            id: qr.id,
            semanaInicio: qr.semanaInicio,
            codigo: qr.codigo,
            tipoAsistencia: qr.tipoAsistencia ? {
                id: qr.tipoAsistencia.id,
                nombre: qr.tipoAsistencia.nombre,
                label: qr.tipoAsistencia.label,
                descripcion: qr.tipoAsistencia.descripcion,
                icono: qr.tipoAsistencia.icono,
                color: qr.tipoAsistencia.color,
                soloPresencia: qr.tipoAsistencia.soloPresencia,
                campos: qr.tipoAsistencia.campos?.map((c: any) => ({
                    id: c.id,
                    nombre: c.nombre,
                    label: c.label,
                    tipo: c.tipo,
                    requerido: c.requerido,
                    orden: c.orden,
                    placeholder: c.placeholder,
                    valorMinimo: c.valorMinimo,
                    valorMaximo: c.valorMaximo,
                    opciones: c.opciones,
                })) || [],
            } : null,
            descripcion: qr.descripcion,
            urlGenerada: qr.urlGenerada
                ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}${qr.urlGenerada}`
                : null,
            urlWhatsapp,
            activo: qr.activo,
            horaInicio: qr.horaInicio,
            horaFin: qr.horaFin,
            creador: qr.creador,
            totalAsistencias: qr._count?.asistencias || 0,
            createdAt: qr.createdAt,
        };
    }

    private formatAsistencia(asistencia: any) {
        return {
            id: asistencia.id,
            usuario: asistencia.usuario,
            telefonoRegistro: asistencia.telefonoRegistro,
            nombreRegistro: asistencia.nombreRegistro,
            fecha: asistencia.fecha,
            semanaInicio: asistencia.semanaInicio,
            datosFormulario: asistencia.datosFormulario,
            metodoRegistro: asistencia.metodoRegistro,
            estado: asistencia.estado,
            confirmador: asistencia.confirmador,
            confirmadoAt: asistencia.confirmadoAt,
            notasConfirmacion: asistencia.notasConfirmacion,
            qr: asistencia.qr,
            tipo: asistencia.tipo,
            createdAt: asistencia.createdAt,
        };
    }

    private formatHora(fecha: Date | null): string {
        if (!fecha) return '09:00';
        const hours = fecha.getHours().toString().padStart(2, '0');
        const minutes = fecha.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // ==================== EXPORTAR EXCEL ====================

    async exportarAsistenciasExcel(filters: FilterAsistenciasDto): Promise<Buffer> {
        // Obtener todos los registros sin paginación
        const { fechaDesde, fechaHasta, estado, usuarioId, tipoId, metodoRegistro, semanaInicio } = filters;

        const where: any = {};

        if (semanaInicio) {
            where.semanaInicio = toStartOfDayUTC(semanaInicio);
        }

        // Filtro por rango de fechas con zona horaria Lima
        const dateFilter = buildDateFilter(fechaDesde, fechaHasta);
        if (dateFilter) {
            where.fecha = dateFilter;
        }

        if (estado) where.estado = estado;
        if (usuarioId) where.usuarioId = usuarioId;
        if (tipoId) where.tipoId = tipoId;
        if (metodoRegistro) where.metodoRegistro = metodoRegistro;

        const asistencias = await this.prisma.asistencia.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
                confirmador: { select: { id: true, nombre: true } },
                qr: { select: { id: true, codigo: true } },
                tipo: {
                    select: {
                        id: true,
                        nombre: true,
                        label: true,
                        campos: {
                            select: { nombre: true, label: true },
                            orderBy: { orden: 'asc' },
                        },
                    },
                },
            },
        });

        // Recopilar todos los campos dinámicos únicos de datosFormulario
        const camposDinamicos = new Map<string, string>(); // nombre -> label
        asistencias.forEach((a) => {
            // Obtener labels de los campos del tipo
            if (a.tipo?.campos) {
                a.tipo.campos.forEach((campo) => {
                    if (!camposDinamicos.has(campo.nombre)) {
                        camposDinamicos.set(campo.nombre, campo.label);
                    }
                });
            }
            // También revisar datosFormulario por si hay campos sin tipo definido
            if (a.datosFormulario && typeof a.datosFormulario === 'object') {
                Object.keys(a.datosFormulario as object).forEach((key) => {
                    if (!camposDinamicos.has(key)) {
                        // Convertir snake_case a título
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        camposDinamicos.set(key, label);
                    }
                });
            }
        });

        // Crear workbook de Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Covima JA';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Asistencias');

        // Definir columnas base
        const columnasBase: Partial<ExcelJS.Column>[] = [
            { header: 'ID', key: 'id', width: 8 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Tipo Asistencia', key: 'tipo', width: 20 },
            { header: 'Fecha Registro', key: 'fechaRegistro', width: 18 },
            { header: 'Estado', key: 'estado', width: 15 },
        ];

        // Agregar columnas dinámicas de datosFormulario
        const columnasDinamicas: Partial<ExcelJS.Column>[] = [];
        camposDinamicos.forEach((label, nombre) => {
            columnasDinamicas.push({ header: label, key: `campo_${nombre}`, width: 20 });
        });

        // Columnas finales
        const columnasFinales: Partial<ExcelJS.Column>[] = [
            { header: 'Método', key: 'metodo', width: 12 },
            { header: 'Código QR', key: 'codigoQR', width: 15 },
            { header: 'Confirmado Por', key: 'confirmadoPor', width: 25 },
            { header: 'Fecha Confirmación', key: 'fechaConfirmacion', width: 18 },
            { header: 'Notas', key: 'notas', width: 30 },
        ];

        worksheet.columns = [...columnasBase, ...columnasDinamicas, ...columnasFinales];

        // Estilo del header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' },
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Agregar datos
        asistencias.forEach((a) => {
            const rowData: Record<string, any> = {
                id: a.id,
                nombre: a.usuario?.nombre || a.nombreRegistro || 'Sin nombre',
                telefono: a.usuario
                    ? `+${a.usuario.codigoPais}${a.usuario.telefono}`
                    : (a.telefonoRegistro || ''),
                tipo: a.tipo?.label || 'Sin tipo',
                fechaRegistro: a.createdAt.toLocaleString('es-PE', { timeZone: 'America/Lima' }),
                estado: a.estado === 'confirmado' ? 'Confirmado' : a.estado === 'rechazado' ? 'Rechazado' : 'Pendiente',
                metodo: a.metodoRegistro || 'qr_web',
                codigoQR: a.qr?.codigo || '',
                confirmadoPor: a.confirmador?.nombre || '',
                fechaConfirmacion: a.confirmadoAt ? a.confirmadoAt.toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '',
                notas: a.notasConfirmacion || '',
            };

            // Agregar datos dinámicos del formulario
            camposDinamicos.forEach((_, nombre) => {
                const datos = a.datosFormulario as Record<string, any> | null;
                let valor = datos?.[nombre];

                // Formatear booleanos
                if (typeof valor === 'boolean') {
                    valor = valor ? 'Sí' : 'No';
                }

                rowData[`campo_${nombre}`] = valor ?? '';
            });

            worksheet.addRow(rowData);
        });

        // Generar buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
