import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto, ResetPasswordDto } from './dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(options?: {
    search?: string;
    rol?: string;
    activo?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, rol, activo, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (rol) {
      where.roles = {
        some: {
          rol: { nombre: rol },
        },
      };
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios.map((u) => this.formatUsuario(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.formatUsuario(usuario);
  }

  async create(dto: CreateUsuarioDto, createdBy?: number) {
    // Verificar si ya existe
    const existing = await this.prisma.usuario.findUnique({
      where: {
        codigoPais_telefono: {
          codigoPais: dto.codigoPais,
          telefono: dto.telefono,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con este teléfono');
    }

    // Hash de contraseña (usar 'password' por defecto si no se proporciona)
    const passwordHash = await bcrypt.hash(dto.password || 'password', 10);

    // Crear usuario
    const usuario = await this.prisma.usuario.create({
      data: {
        codigoPais: dto.codigoPais,
        telefono: dto.telefono,
        nombre: dto.nombre,
        passwordHash,
        email: dto.email,
        nombreWhatsapp: dto.nombreWhatsapp,
        activo: dto.activo ?? true,
        esJA: dto.esJA ?? true,
        debeCambiarPassword: true,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : undefined,
        direccion: dto.direccion,
        biografia: dto.biografia,
      },
    });

    // Asignar roles
    if (dto.roles && dto.roles.length > 0) {
      await this.assignRoles(usuario.id, dto.roles, createdBy);
    } else {
      // Asignar rol participante por defecto
      await this.assignRoles(usuario.id, ['participante'], createdBy);
    }

    return this.findOne(usuario.id);
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        email: dto.email,
        nombreWhatsapp: dto.nombreWhatsapp,
        activo: dto.activo,
        esJA: dto.esJA,
        fechaNacimiento:
          dto.fechaNacimiento === null
            ? null
            : dto.fechaNacimiento
              ? new Date(dto.fechaNacimiento)
              : undefined,
        direccion: dto.direccion,
        biografia: dto.biografia,
      },
    });

    // Actualizar roles si se proporcionan
    if (dto.roles) {
      await this.updateRoles(id, dto.roles);
    }

    return this.findOne(id);
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: {
        passwordHash,
        debeCambiarPassword: true,
      },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async toggleActive(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { activo: !usuario.activo },
    });

    return this.findOne(id);
  }

  async toggleRanking(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { participaEnRanking: !usuario.participaEnRanking },
    });

    return this.findOne(id);
  }

  /**
   * Actualizar teléfono de usuario (solo admin)
   */
  async updateTelefono(id: number, codigoPais: string, telefono: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que el nuevo teléfono no exista
    const existing = await this.prisma.usuario.findUnique({
      where: {
        codigoPais_telefono: { codigoPais, telefono },
      },
    });

    if (existing && existing.id !== id) {
      throw new ConflictException('Ya existe un usuario con este teléfono');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { codigoPais, telefono },
    });

    return this.findOne(id);
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(
    id: number,
    data: {
      nombre?: string;
      email?: string;
      fotoUrl?: string;
      fechaNacimiento?: Date;
      direccion?: string;
      biografia?: string;
      notificarNuevasConversaciones?: boolean;
      modoHandoffDefault?: 'WEB' | 'WHATSAPP' | 'AMBOS';
    },
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: {
        nombre: data.nombre,
        email: data.email,
        fotoUrl: data.fotoUrl,
        fechaNacimiento: data.fechaNacimiento,
        direccion: data.direccion,
        biografia: data.biografia,
        notificarNuevasConversaciones: data.notificarNuevasConversaciones,
        modoHandoffDefault: data.modoHandoffDefault,
      },
    });

    return this.getProfile(id);
  }

  /**
   * Obtener perfil completo incluye nuevos campos
   */
  async getProfile(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        roles: { include: { rol: true } },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Construir URL completa para la foto
    let fotoUrlCompleta = usuario.fotoUrl;
    if (usuario.fotoUrl && !usuario.fotoUrl.startsWith('http')) {
      const baseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
      fotoUrlCompleta = `${baseUrl}${usuario.fotoUrl}`;
    }

    return {
      ...this.formatUsuario(usuario),
      fotoUrl: fotoUrlCompleta,
      fechaNacimiento: usuario.fechaNacimiento,
      direccion: usuario.direccion,
      biografia: usuario.biografia,
      notificarNuevasConversaciones: usuario.notificarNuevasConversaciones,
      modoHandoffDefault: usuario.modoHandoffDefault,
    };
  }

  async getRoles() {
    return this.prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtener cumpleaños de un mes específico
   */
  async getCumpleanosDelMes(mes?: number, anio?: number) {
    const now = new Date();
    const mesConsulta = mes ?? now.getMonth() + 1; // 1-12
    const anioConsulta = anio ?? now.getFullYear();

    // Crear fecha para obtener nombre del mes
    const fechaRef = new Date(anioConsulta, mesConsulta - 1, 1);

    // Obtener usuarios activos con cumpleaños
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        activo: true,
        fechaNacimiento: { not: null },
      },
      select: {
        id: true,
        nombre: true,
        fechaNacimiento: true,
      },
    });

    // Filtrar por mes
    const cumpleaneros = usuarios
      .filter((u) => {
        if (!u.fechaNacimiento) return false;
        const mesCumple = u.fechaNacimiento.getMonth() + 1;
        return mesCumple === mesConsulta;
      })
      .map((u) => ({
        id: u.id,
        nombre: u.nombre,
        dia: u.fechaNacimiento!.getDate(),
        mes: u.fechaNacimiento!.getMonth() + 1,
      }))
      .sort((a, b) => a.dia - b.dia);

    return {
      mes: mesConsulta,
      mesNombre: fechaRef.toLocaleDateString('es-PE', { month: 'long' }),
      anio: anioConsulta,
      cumpleaneros,
    };
  }

  private async assignRoles(
    usuarioId: number,
    roleNames: string[],
    assignedBy?: number,
  ) {
    const roles = await this.prisma.rol.findMany({
      where: { nombre: { in: roleNames } },
    });

    for (const rol of roles) {
      await this.prisma.usuarioRol.upsert({
        where: {
          usuarioId_rolId: {
            usuarioId,
            rolId: rol.id,
          },
        },
        update: {},
        create: {
          usuarioId,
          rolId: rol.id,
          asignadoPor: assignedBy,
        },
      });
    }
  }

  private async updateRoles(usuarioId: number, roleNames: string[]) {
    // Eliminar roles actuales
    await this.prisma.usuarioRol.deleteMany({
      where: { usuarioId },
    });

    // Asignar nuevos roles
    await this.assignRoles(usuarioId, roleNames);
  }

  private formatUsuario(usuario: any) {
    return {
      id: usuario.id,
      codigoPais: usuario.codigoPais,
      telefono: usuario.telefono,
      nombre: usuario.nombre,
      nombreWhatsapp: usuario.nombreWhatsapp,
      email: usuario.email,
      activo: usuario.activo,
      participaEnRanking: usuario.participaEnRanking,
      esJA: usuario.esJA,
      debeCambiarPassword: usuario.debeCambiarPassword,
      ultimoLogin: usuario.ultimoLogin,
      createdAt: usuario.createdAt,
      fechaNacimiento: usuario.fechaNacimiento,
      roles: usuario.roles?.map((ur: any) => ur.rol.nombre) || [],
    };
  }
}
