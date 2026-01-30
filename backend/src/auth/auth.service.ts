import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { codigoPais, telefono, password } = loginDto;

    const user = await this.prisma.usuario.findUnique({
      where: {
        codigoPais_telefono: { codigoPais, telefono },
      },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    });

    const roles = user.roles.map((ur) => ur.rol.nombre);

    const payload = {
      sub: user.id,
      nombre: user.nombre,
      codigoPais: user.codigoPais,
      telefono: user.telefono,
      roles,
    };

    // Construir URL completa para la foto
    let fotoUrl = user.fotoUrl;
    if (user.fotoUrl && !user.fotoUrl.startsWith('http')) {
      const baseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
      fotoUrl = `${baseUrl}${user.fotoUrl}`;
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        codigoPais: user.codigoPais,
        telefono: user.telefono,
        nombre: user.nombre,
        roles,
        debeCambiarPassword: user.debeCambiarPassword,
        fotoUrl,
      },
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Contraseña actual incorrecta');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        debeCambiarPassword: false,
      },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Construir URL completa para la foto
    let fotoUrl = user.fotoUrl;
    if (user.fotoUrl && !user.fotoUrl.startsWith('http')) {
      const baseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 3000}`;
      fotoUrl = `${baseUrl}${user.fotoUrl}`;
    }

    return {
      id: user.id,
      codigoPais: user.codigoPais,
      telefono: user.telefono,
      nombre: user.nombre,
      nombreWhatsapp: user.nombreWhatsapp,
      email: user.email,
      roles: user.roles.map((ur) => ur.rol.nombre),
      debeCambiarPassword: user.debeCambiarPassword,
      ultimoLogin: user.ultimoLogin,
      fotoUrl,
    };
  }
}
