import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTipoAsistenciaDto,
  UpdateTipoAsistenciaDto,
  CreateCampoDto,
  UpdateCampoDto,
} from './dto';

@Injectable()
export class TiposAsistenciaService {
  constructor(private prisma: PrismaService) {}

  async findAll(options?: { activo?: boolean }) {
    const where: any = {};

    if (options?.activo !== undefined) {
      where.activo = options.activo;
    }

    const tipos = await this.prisma.tipoAsistencia.findMany({
      where,
      include: {
        campos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
        _count: {
          select: {
            qrs: true,
            asistencias: true,
          },
        },
      },
      orderBy: { orden: 'asc' },
    });

    return tipos.map((tipo) => this.formatTipo(tipo));
  }

  async findOne(id: number) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { id },
      include: {
        campos: {
          orderBy: { orden: 'asc' },
        },
        _count: {
          select: {
            qrs: true,
            asistencias: true,
          },
        },
      },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    return this.formatTipo(tipo);
  }

  async findByNombre(nombre: string) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { nombre },
      include: {
        campos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    return this.formatTipo(tipo);
  }

  async create(dto: CreateTipoAsistenciaDto) {
    // Verificar si ya existe
    const existing = await this.prisma.tipoAsistencia.findUnique({
      where: { nombre: dto.nombre },
    });

    if (existing) {
      throw new ConflictException('Ya existe un tipo de asistencia con este nombre');
    }

    // Obtener el siguiente orden si no se especifica
    let orden = dto.orden;
    if (orden === undefined) {
      const lastTipo = await this.prisma.tipoAsistencia.findFirst({
        orderBy: { orden: 'desc' },
      });
      orden = (lastTipo?.orden ?? 0) + 1;
    }

    const tipo = await this.prisma.tipoAsistencia.create({
      data: {
        nombre: dto.nombre,
        label: dto.label,
        descripcion: dto.descripcion,
        icono: dto.icono,
        color: dto.color,
        soloPresencia: dto.soloPresencia ?? false,
        orden,
        campos: dto.campos
          ? {
              create: dto.campos.map((campo, idx) => ({
                nombre: campo.nombre,
                label: campo.label,
                tipo: campo.tipo,
                requerido: campo.requerido ?? false,
                orden: campo.orden ?? idx,
                placeholder: campo.placeholder,
                valorMinimo: campo.valorMinimo,
                valorMaximo: campo.valorMaximo,
                opciones: campo.opciones,
              })),
            }
          : undefined,
      },
      include: {
        campos: {
          orderBy: { orden: 'asc' },
        },
      },
    });

    return this.formatTipo(tipo);
  }

  async update(id: number, dto: UpdateTipoAsistenciaDto) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { id },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    const updated = await this.prisma.tipoAsistencia.update({
      where: { id },
      data: {
        label: dto.label,
        descripcion: dto.descripcion,
        icono: dto.icono,
        color: dto.color,
        soloPresencia: dto.soloPresencia,
        orden: dto.orden,
        activo: dto.activo,
      },
      include: {
        campos: {
          orderBy: { orden: 'asc' },
        },
      },
    });

    return this.formatTipo(updated);
  }

  async delete(id: number) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            qrs: true,
            asistencias: true,
          },
        },
      },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    // Verificar si tiene QRs o asistencias asociadas
    if (tipo._count.qrs > 0 || tipo._count.asistencias > 0) {
      throw new BadRequestException(
        'No se puede eliminar un tipo de asistencia que tiene QRs o asistencias asociadas. Desactívalo en su lugar.',
      );
    }

    await this.prisma.tipoAsistencia.delete({
      where: { id },
    });

    return { message: 'Tipo de asistencia eliminado correctamente' };
  }

  // ==================== CAMPOS ====================

  async addCampo(tipoId: number, dto: CreateCampoDto) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { id: tipoId },
      include: { campos: true },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    // Verificar si ya existe un campo con ese nombre
    const existingCampo = tipo.campos.find((c) => c.nombre === dto.nombre);
    if (existingCampo) {
      throw new ConflictException('Ya existe un campo con este nombre en este tipo');
    }

    // Obtener el siguiente orden si no se especifica
    let orden = dto.orden;
    if (orden === undefined) {
      const maxOrden = tipo.campos.reduce((max, c) => Math.max(max, c.orden), 0);
      orden = maxOrden + 1;
    }

    const campo = await this.prisma.formularioCampo.create({
      data: {
        tipoAsistenciaId: tipoId,
        nombre: dto.nombre,
        label: dto.label,
        tipo: dto.tipo,
        requerido: dto.requerido ?? false,
        orden,
        placeholder: dto.placeholder,
        valorMinimo: dto.valorMinimo,
        valorMaximo: dto.valorMaximo,
        opciones: dto.opciones,
      },
    });

    return this.formatCampo(campo);
  }

  async updateCampo(campoId: number, dto: UpdateCampoDto) {
    const campo = await this.prisma.formularioCampo.findUnique({
      where: { id: campoId },
    });

    if (!campo) {
      throw new NotFoundException('Campo no encontrado');
    }

    const updated = await this.prisma.formularioCampo.update({
      where: { id: campoId },
      data: {
        label: dto.label,
        tipo: dto.tipo,
        requerido: dto.requerido,
        orden: dto.orden,
        placeholder: dto.placeholder,
        valorMinimo: dto.valorMinimo,
        valorMaximo: dto.valorMaximo,
        opciones: dto.opciones,
        activo: dto.activo,
      },
    });

    return this.formatCampo(updated);
  }

  async deleteCampo(campoId: number) {
    const campo = await this.prisma.formularioCampo.findUnique({
      where: { id: campoId },
    });

    if (!campo) {
      throw new NotFoundException('Campo no encontrado');
    }

    await this.prisma.formularioCampo.delete({
      where: { id: campoId },
    });

    return { message: 'Campo eliminado correctamente' };
  }

  async reorderCampos(tipoId: number, campoIds: number[]) {
    const tipo = await this.prisma.tipoAsistencia.findUnique({
      where: { id: tipoId },
      include: { campos: true },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de asistencia no encontrado');
    }

    // Verificar que todos los IDs pertenecen a este tipo
    const tipoCampoIds = tipo.campos.map((c) => c.id);
    for (const id of campoIds) {
      if (!tipoCampoIds.includes(id)) {
        throw new BadRequestException(`El campo ${id} no pertenece a este tipo de asistencia`);
      }
    }

    // Actualizar orden
    await Promise.all(
      campoIds.map((id, index) =>
        this.prisma.formularioCampo.update({
          where: { id },
          data: { orden: index },
        }),
      ),
    );

    return this.findOne(tipoId);
  }

  // ==================== HELPERS ====================

  private formatTipo(tipo: any) {
    return {
      id: tipo.id,
      nombre: tipo.nombre,
      label: tipo.label,
      descripcion: tipo.descripcion,
      icono: tipo.icono,
      color: tipo.color,
      soloPresencia: tipo.soloPresencia,
      activo: tipo.activo,
      orden: tipo.orden,
      campos: tipo.campos?.map((c: any) => this.formatCampo(c)) || [],
      totalQRs: tipo._count?.qrs ?? 0,
      totalAsistencias: tipo._count?.asistencias ?? 0,
      createdAt: tipo.createdAt,
      updatedAt: tipo.updatedAt,
    };
  }

  private formatCampo(campo: any) {
    return {
      id: campo.id,
      nombre: campo.nombre,
      label: campo.label,
      tipo: campo.tipo,
      requerido: campo.requerido,
      orden: campo.orden,
      placeholder: campo.placeholder,
      valorMinimo: campo.valorMinimo,
      valorMaximo: campo.valorMaximo,
      opciones: campo.opciones,
      activo: campo.activo,
    };
  }
}
