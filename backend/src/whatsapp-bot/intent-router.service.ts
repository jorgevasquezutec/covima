import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from './openai.service';
import { WhatsappBotService } from './whatsapp-bot.service';
import { AsistenciaHandler } from './handlers/asistencia.handler';
import { UsuariosHandler } from './handlers/usuarios.handler';
import { ProgramasHandler } from './handlers/programas.handler';
import { NotificacionesHandler } from './handlers/notificaciones.handler';
import { ConversationContext, IntentResult } from './dto';

@Injectable()
export class IntentRouterService {
    private readonly logger = new Logger(IntentRouterService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly openaiService: OpenAIService,
        private readonly whatsappService: WhatsappBotService,
        private readonly asistenciaHandler: AsistenciaHandler,
        private readonly usuariosHandler: UsuariosHandler,
        private readonly programasHandler: ProgramasHandler,
        private readonly notificacionesHandler: NotificacionesHandler,
    ) { }

    /**
     * Procesar mensaje entrante y enrutar al handler correcto
     */
    async processMessage(
        conversationId: number,
        message: string,
        telefono: string,
        nombreWhatsapp: string,
        messageId?: string,
    ): Promise<void> {
        // Registrar teléfono y messageId para poder enviar respuestas y typing indicator
        this.whatsappService.registerConversation(conversationId, telefono, messageId);

        // Mostrar typing indicator mientras procesamos
        await this.whatsappService.toggleTypingStatus(conversationId, true);

        // Obtener o crear contexto de conversación
        const context = await this.getOrCreateContext(conversationId, telefono, nombreWhatsapp);

        // Si hay un módulo activo con flujo pendiente, continuar ese flujo
        if (context.moduloActivo && context.estado !== 'inicio') {
            await this.continueActiveFlow(context, message);
            return;
        }

        // Clasificar intención del mensaje
        const intentResult = await this.openaiService.classifyIntent(message, context);
        this.logger.debug(`Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);

        // Verificar permisos
        if (intentResult.requiresAuth && !context.usuarioId) {
            await this.whatsappService.sendMessage(conversationId, {
                content: '⚠️ Esta acción requiere que estés registrado en el sistema. Contacta a un administrador.',
            });
            return;
        }

        if (intentResult.requiredRoles.length > 0) {
            const hasRole = intentResult.requiredRoles.some(role => context.roles.includes(role));
            if (!hasRole) {
                await this.whatsappService.sendMessage(conversationId, {
                    content: `🔒 No tienes permisos para esta acción. Se requiere rol: ${intentResult.requiredRoles.join(' o ')}`,
                });
                return;
            }
        }

        // Enrutar al handler correspondiente
        await this.routeToHandler(context, intentResult, message);
    }

    /**
     * Continuar flujo activo (ej: formulario de asistencia)
     */
    private async continueActiveFlow(context: ConversationContext, message: string): Promise<void> {
        switch (context.moduloActivo) {
            case 'asistencia':
                await this.asistenciaHandler.continueFlow(context, message);
                break;
            case 'usuarios':
                await this.usuariosHandler.continueFlow(context, message);
                break;
            case 'programas':
                await this.programasHandler.continueFlow(context, message);
                break;
            default:
                // Resetear si el módulo no existe
                await this.resetContext(context.conversationId);
        }
    }

    /**
     * Enrutar al handler según la intención
     */
    private async routeToHandler(
        context: ConversationContext,
        intent: IntentResult,
        message: string,
    ): Promise<void> {
        switch (intent.intent) {
            case 'registrar_asistencia':
                await this.asistenciaHandler.handle(context, intent.entities, message);
                break;

            case 'registrar_asistencia_manual':
                await this.asistenciaHandler.handleManual(context, intent.entities, message);
                break;

            case 'crear_usuario':
            case 'buscar_usuario':
                await this.usuariosHandler.handle(context, intent, message);
                break;

            case 'crear_programa':
            case 'ver_programa':
            case 'asignar_parte':
            case 'editar_programa_texto':
                await this.programasHandler.handle(context, intent, message);
                break;

            case 'enviar_programa':
                await this.notificacionesHandler.handle(context, intent, message);
                break;

            case 'ayuda':
                await this.sendHelpMessage(context);
                break;

            case 'saludo':
                await this.sendGreeting(context);
                break;

            default:
                await this.sendUnknownIntent(context);
        }
    }

    /**
     * Obtener o crear contexto de conversación
     */
    private async getOrCreateContext(
        conversationId: number,
        telefono: string,
        nombreWhatsapp: string,
    ): Promise<ConversationContext> {
        // Normalizar teléfono
        const telefonoLimpio = telefono.replace(/\D/g, '');

        // Buscar usuario existente
        const usuario = await this.prisma.usuario.findFirst({
            where: {
                telefono: { endsWith: telefonoLimpio.slice(-9) },
            },
            include: {
                roles: { include: { rol: true } },
            },
        });

        // Buscar o crear conversación en BD
        let conversacion = await this.prisma.conversacion.findFirst({
            where: { telefono: telefonoLimpio },
            orderBy: { updatedAt: 'desc' },
        });

        if (!conversacion) {
            conversacion = await this.prisma.conversacion.create({
                data: {
                    telefono: telefonoLimpio,
                    usuarioId: usuario?.id,
                    estado: 'inicio',
                    contexto: {},
                },
            });
        }

        return {
            conversationId,
            telefono: telefonoLimpio,
            nombreWhatsapp,
            usuarioId: usuario?.id,
            roles: usuario?.roles?.map(r => r.rol.nombre) || [],
            estado: conversacion.estado,
            moduloActivo: conversacion.moduloActivo || undefined,
            datos: (conversacion.contexto as Record<string, any>) || {},
        };
    }

    /**
     * Actualizar contexto en BD
     */
    async updateContext(
        telefono: string,
        updates: Partial<{ estado: string; moduloActivo: string | null; contexto: any }>,
    ): Promise<void> {
        await this.prisma.conversacion.updateMany({
            where: { telefono },
            data: {
                ...updates,
                ultimoMensajeAt: new Date(),
            },
        });
    }

    /**
     * Resetear contexto
     */
    async resetContext(conversationId: number): Promise<void> {
        // Usamos el conversationId para buscar por teléfono en la práctica
        // Por ahora solo logueamos
        this.logger.debug(`Reset context for conversation ${conversationId}`);
    }

    /**
     * Mensaje de ayuda
     */
    private async sendHelpMessage(context: ConversationContext): Promise<void> {
        let helpText = `🤖 *Comandos disponibles:*\n\n`;
        helpText += `📋 *Asistencia:*\n`;
        helpText += `   Envía el código QR (ej: JA-A1B2C3D4)\n\n`;
        helpText += `📝 *Ver programa:*\n`;
        helpText += `   • "ver programa MA-X3kP9m" (por código)\n`;
        helpText += `   • "programa del 25/01" (por fecha)\n\n`;

        if (context.roles.includes('admin') || context.roles.includes('lider')) {
            helpText += `📋 *Registro manual de asistencia:*\n`;
            helpText += `   • "registrar asistencia de Juan en JA-XXXXXXXX"\n`;
            helpText += `   • "registrar a María Pérez en JA-XXXXXXXX"\n\n`;
            helpText += `✏️ *Gestión de programas:*\n`;
            helpText += `   • "crear programa para el sábado"\n`;
            helpText += `   • "asignar bienvenida a María"\n`;
            helpText += `   • "asignar oración a Juan en PMA-X3kP9m"\n`;
            helpText += `   • "enviar programa a participantes"\n\n`;
        }

        if (context.roles.includes('admin')) {
            helpText += `👤 *Usuarios:*\n`;
            helpText += `   • "registrar a Juan 999888777"\n`;
            helpText += `   • "buscar María"\n`;
        }

        await this.whatsappService.sendMessage(context.conversationId, { content: helpText });
    }

    /**
     * Saludo inicial
     */
    private async sendGreeting(context: ConversationContext): Promise<void> {
        const nombre = context.usuarioId ? context.nombreWhatsapp : 'hermano/a';
        const greeting = `¡Hola ${nombre}! 👋\n\n¿En qué puedo ayudarte?\n\nEscribe *ayuda* para ver los comandos disponibles.`;
        await this.whatsappService.sendMessage(context.conversationId, { content: greeting });
    }

    /**
     * Intención desconocida
     */
    private async sendUnknownIntent(context: ConversationContext): Promise<void> {
        await this.whatsappService.sendMessage(context.conversationId, {
            content: '🤔 No entendí tu mensaje. Escribe *ayuda* para ver los comandos disponibles.',
        });
    }
}
