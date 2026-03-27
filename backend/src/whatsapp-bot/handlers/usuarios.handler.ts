import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from '../whatsapp-bot.service';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { ConversationContext, IntentResult } from '../dto';
import { extraerNumeroLocal } from '../utils/telefono.utils';

@Injectable()
export class UsuariosHandler {
  private readonly logger = new Logger(UsuariosHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappBotService,
    private readonly usuariosService: UsuariosService,
  ) {}

  /**
   * Manejar intenciones relacionadas con usuarios
   */
  async handle(
    context: ConversationContext,
    intent: IntentResult,
    message: string,
  ): Promise<void> {
    switch (intent.intent) {
      case 'crear_usuario':
        await this.crearUsuario(context, intent.entities, message);
        break;
      case 'buscar_usuario':
        await this.buscarUsuario(context, intent.entities, message);
        break;
      default:
        await this.whatsappService.sendMessage(context.conversationId, {
          content: '❓ Acción de usuarios no reconocida.',
        });
    }
  }

  /**
   * Crear nuevo usuario
   */
  private async crearUsuario(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    // Extraer nombre, teléfono y código de país del mensaje si no están en entities
    let nombre = entities.nombre as string;
    let telefono = entities.telefono as string;
    const codigoPais = (entities.codigoPais as string) || '51';

    if (!nombre || !telefono) {
      // Intentar extraer del mensaje
      // Formatos soportados:
      // - "registrar a rubi +51 924 999 954"
      // - "registrar a rubi +51924999954"
      // - "registrar a rubi 51924999954"
      // - "registrar a rubi 924999954"
      const match = message.match(
        /registrar\s+a?\s*(.+?)\s+(\+?\d[\d\s]{8,})/i,
      );
      if (match) {
        nombre = nombre || match[1].trim();
        telefono = telefono || match[2];
      }
    }

    if (!nombre || !telefono) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Para crear un usuario necesito:\n\n*Nombre* y *Teléfono*\n\nEjemplos:\n• "Registrar a Juan +51 999 888 777"\n• "Registrar a Juan 999888777"',
      });
      return;
    }

    // Limpiar teléfono: remover todo excepto dígitos, luego tomar los últimos 9
    telefono = extraerNumeroLocal(telefono);

    try {
      // Verificar si ya existe
      const existente = await this.prisma.usuario.findFirst({
        where: {
          telefono: { endsWith: telefono },
        },
      });

      if (existente) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content: `⚠️ Ya existe un usuario con el teléfono ${telefono}:\n\n👤 ${existente.nombre}`,
        });
        return;
      }

      // Crear usuario
      const usuario = await this.usuariosService.create({
        nombre,
        telefono,
        codigoPais,
        roles: ['participante'],
      });

      let respuesta = `✅ *Usuario creado exitosamente*\n\n`;
      respuesta += `👤 *Nombre:* ${usuario.nombre}\n`;
      respuesta += `📱 *Teléfono:* +${codigoPais} ${telefono}\n`;
      respuesta += `🎭 *Rol:* Participante\n`;
      respuesta += `🔐 *Contraseña:* password (debe cambiarla al iniciar sesión)`;

      await this.whatsappService.sendMessage(context.conversationId, {
        content: respuesta,
      });
    } catch (error) {
      this.logger.error(`Error creando usuario: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al crear el usuario. Intenta de nuevo.',
      });
    }
  }

  /**
   * Buscar usuario
   */
  private async buscarUsuario(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    let busqueda = entities.busqueda as string;

    if (!busqueda) {
      // Extraer del mensaje: "buscar María" o "buscar 999888777"
      const match = message.match(/buscar\s+(.+)/i);
      busqueda = match ? match[1].trim() : '';
    }

    if (!busqueda) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Indica el nombre o teléfono a buscar.\n\nEjemplo: "Buscar María"',
      });
      return;
    }

    try {
      const resultado = await this.usuariosService.findAll({
        search: busqueda,
        limit: 5,
      });

      if (resultado.data.length === 0) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content: `🔍 No se encontraron usuarios con "${busqueda}".`,
        });
        return;
      }

      let respuesta = `🔍 *Resultados para "${busqueda}":*\n\n`;

      for (const usuario of resultado.data) {
        respuesta += `👤 *${usuario.nombre}*\n`;
        respuesta += `   📱 +${usuario.codigoPais} ${usuario.telefono}\n`;
        respuesta += `   🎭 ${usuario.roles.join(', ')}\n`;
        respuesta += `   ${usuario.activo ? '✅ Activo' : '❌ Inactivo'}\n\n`;
      }

      if (resultado.meta.total > 5) {
        respuesta += `_...y ${resultado.meta.total - 5} más_`;
      }

      await this.whatsappService.sendMessage(context.conversationId, {
        content: respuesta,
      });
    } catch (error) {
      this.logger.error(`Error buscando usuario: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al buscar usuarios.',
      });
    }
  }

  /**
   * Continuar flujo (si hay uno activo)
   */
  async continueFlow(
    context: ConversationContext,
    message: string,
  ): Promise<void> {
    // Por ahora el módulo de usuarios no tiene flujo multi-paso
    await this.whatsappService.sendMessage(context.conversationId, {
      content:
        '❓ No hay una operación de usuarios pendiente. ¿Qué deseas hacer?',
    });

    // Resetear contexto
    await this.prisma.conversacion.updateMany({
      where: { telefono: context.telefono },
      data: {
        estado: 'inicio',
        moduloActivo: null,
        contexto: {},
      },
    });
  }
}
