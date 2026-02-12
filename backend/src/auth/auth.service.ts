import {
  Injectable,
  Inject,
  forwardRef,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';
import {
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordWithTokenDto,
} from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    @Inject(forwardRef(() => WhatsappBotService))
    private whatsappService: WhatsappBotService,
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

  // ==================== RECUPERAR CONTRASEÑA ====================

  private generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { codigoPais, telefono } = dto;
    const redisKey = `reset:${codigoPais}:${telefono}`;
    const cooldownKey = `reset:cooldown:${codigoPais}:${telefono}`;
    const attemptsKey = `reset:attempts:${codigoPais}:${telefono}`;

    // Rate limiting: máximo 3 solicitudes cada 15 min
    const attempts = await this.redisService.get<string>(attemptsKey);
    if (attempts && parseInt(attempts) >= 3) {
      throw new BadRequestException(
        'Demasiados intentos. Espera 15 minutos.',
      );
    }

    // Cooldown: 60 segundos entre solicitudes
    const cooldown = await this.redisService.get(cooldownKey);
    if (cooldown) {
      throw new BadRequestException(
        'Espera 60 segundos antes de solicitar otro código.',
      );
    }

    // Buscar usuario (no revelar si existe o no)
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigoPais_telefono: { codigoPais, telefono } },
    });

    if (!usuario || !usuario.activo) {
      return { message: 'Si el número está registrado, recibirás un código por WhatsApp.' };
    }

    // Generar y guardar código (limpiar intentos fallidos del código anterior)
    const failedKey = `reset:failed:${codigoPais}:${telefono}`;
    await this.redisService.del(failedKey);
    const code = this.generateResetCode();
    await this.redisService.set(redisKey, code, 300); // 5 min TTL
    await this.redisService.set(cooldownKey, '1', 60); // 60 seg cooldown
    await this.redisService.incr(attemptsKey);
    await this.redisService.expire(attemptsKey, 900); // 15 min TTL

    // Enviar WhatsApp con template covima_code
    const phoneNumber = `${codigoPais}${telefono}`;
    await this.whatsappService.sendTemplateToPhone(
      phoneNumber,
      'covima_code',
      'es_ES',
      [code],
    );

    return { message: 'Si el número está registrado, recibirás un código por WhatsApp.' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const { codigoPais, telefono, code } = dto;
    const redisKey = `reset:${codigoPais}:${telefono}`;
    const failedKey = `reset:failed:${codigoPais}:${telefono}`;

    // Verificar intentos fallidos (máximo 5)
    const failed = await this.redisService.get<string>(failedKey);
    if (failed && parseInt(failed) >= 5) {
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un nuevo código.',
      );
    }

    // Obtener código guardado
    const savedCode = await this.redisService.get<string>(redisKey);
    if (!savedCode) {
      throw new BadRequestException('Código expirado o no existe.');
    }

    // Comparar (savedCode puede ser number por JSON.parse de Redis)
    if (String(savedCode) !== code) {
      await this.redisService.incr(failedKey);
      await this.redisService.expire(failedKey, 900); // 15 min
      throw new BadRequestException('Código incorrecto.');
    }

    // Código correcto: eliminar de Redis
    await this.redisService.del(redisKey);
    await this.redisService.del(failedKey);

    // Buscar usuario
    const usuario = await this.prisma.usuario.findUnique({
      where: { codigoPais_telefono: { codigoPais, telefono } },
    });

    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado.');
    }

    // Generar resetToken (JWT corto)
    const resetToken = this.jwtService.sign(
      { sub: usuario.id, type: 'reset' },
      { expiresIn: '10m' },
    );

    return { resetToken };
  }

  async resetPasswordWithToken(dto: ResetPasswordWithTokenDto) {
    const { resetToken, newPassword } = dto;

    // Validar token
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken);
    } catch {
      throw new BadRequestException('Token inválido o expirado.');
    }

    if (payload.type !== 'reset') {
      throw new BadRequestException('Token inválido.');
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: payload.sub },
      data: {
        passwordHash: hashedPassword,
        debeCambiarPassword: false,
      },
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }
}
