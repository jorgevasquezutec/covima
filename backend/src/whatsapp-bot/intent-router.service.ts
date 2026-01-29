import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from './openai.service';
import { WhatsappBotService } from './whatsapp-bot.service';
import { AsistenciaHandler } from './handlers/asistencia.handler';
import { UsuariosHandler } from './handlers/usuarios.handler';
import { ProgramasHandler } from './handlers/programas.handler';
import { NotificacionesHandler } from './handlers/notificaciones.handler';
import { ConversationContext, IntentResult } from './dto';
import { InboxService } from '../inbox/inbox.service';
import { DireccionMensaje, ModoConversacion } from '@prisma/client';

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
        private readonly inboxService: InboxService,
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

        // Obtener o crear conversación en BD usando InboxService
        const { conversacion } = await this.inboxService.getOrCreateConversacion(telefono, nombreWhatsapp);

        // Guardar mensaje entrante SIEMPRE
        await this.inboxService.guardarMensaje({
            conversacionId: conversacion.id,
            contenido: message,
            direccion: DireccionMensaje.ENTRANTE,
            tipo: 'texto',
            whatsappMsgId: messageId,
        });

        // Verificar si es un admin enviando mensaje
        const { esAdmin, usuario: adminUsuario } = await this.inboxService.esAdmin(telefono);

        // Si es admin, verificar comandos especiales
        if (esAdmin && adminUsuario) {
            const comandoProcesado = await this.procesarComandoAdmin(
                conversacion.id,
                message,
                adminUsuario,
                telefono,
            );
            if (comandoProcesado) {
                return;
            }
        }

        // Verificar modo de la conversación
        if (conversacion.modo === ModoConversacion.HANDOFF) {
            // En modo HANDOFF, no procesar con bot
            this.logger.debug(`Conversación ${conversacion.id} en modo HANDOFF, no procesando con bot`);

            // Si el admin tiene notificaciones activas, reenviar a su WhatsApp
            if (conversacion.derivadaA) {
                await this.notificarAdminHandoff(conversacion, message, nombreWhatsapp);
            }
            return;
        }

        if (conversacion.modo === ModoConversacion.PAUSADO) {
            // En modo PAUSADO, informar al usuario
            await this.whatsappService.sendMessage(conversationId, {
                content: '⏳ Tu conversación está en espera. Un administrador te atenderá pronto.',
            });
            return;
        }

        // Modo BOT - procesar normalmente
        await this.whatsappService.toggleTypingStatus(conversationId, true);

        // Obtener contexto de conversación
        const context = await this.getOrCreateContext(conversationId, telefono, nombreWhatsapp, conversacion);

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
     * Procesar comandos especiales de admin
     * Retorna true si el comando fue procesado
     */
    private async procesarComandoAdmin(
        conversacionIdBD: number,
        message: string,
        admin: { id: number; nombre: string; telefono: string },
        telefonoAdmin: string,
    ): Promise<boolean> {
        const msgLower = message.toLowerCase().trim();

        // Comando: /cerrar - cerrar handoff de una conversación asignada
        if (msgLower === '/cerrar') {
            const conversaciones = await this.inboxService.getConversacionesHandoffDeAdmin(admin.id);

            if (conversaciones.length === 0) {
                await this.whatsappService.sendMessageToPhone(
                    telefonoAdmin,
                    admin.nombre,
                    '📭 No tienes conversaciones en handoff activas.',
                );
                return true;
            }

            if (conversaciones.length === 1) {
                // Cerrar la única conversación
                await this.inboxService.cerrarHandoff(conversaciones[0].id, admin.id, {});
                await this.whatsappService.sendMessageToPhone(
                    telefonoAdmin,
                    admin.nombre,
                    `✅ Handoff cerrado para la conversación con ${conversaciones[0].usuario?.nombre || conversaciones[0].telefono}`,
                );
                return true;
            }

            // Múltiples conversaciones, listar
            let lista = '📋 *Conversaciones en handoff:*\n\n';
            conversaciones.forEach((c, i) => {
                lista += `${i + 1}. ${c.usuario?.nombre || c.telefono}\n`;
            });
            lista += '\nResponde con el número para cerrar esa conversación.';
            await this.whatsappService.sendMessageToPhone(telefonoAdmin, admin.nombre, lista);
            return true;
        }

        // Comando: /pendientes - ver conversaciones pendientes
        if (msgLower === '/pendientes') {
            const pendientes = await this.inboxService.contarPendientes();
            await this.whatsappService.sendMessageToPhone(
                telefonoAdmin,
                admin.nombre,
                `📊 *Conversaciones:*\n• Sin asignar: ${pendientes.sinAsignar}\n• En handoff: ${pendientes.enHandoff}\n• Total: ${pendientes.total}`,
            );
            return true;
        }

        // Comando: /ayuda - comandos de admin
        if (msgLower === '/ayuda' || msgLower === '/help') {
            const ayuda = `🔧 *Comandos de Admin:*

/pendientes - Ver conversaciones pendientes
/cerrar - Cerrar handoff activo
/mis - Ver mis conversaciones en handoff

*Responder a usuario:*
>> mensaje - Enviar mensaje (si tienes 1 conversación)
>>1 mensaje - Enviar a conversación #1 (si tienes varias)

*Ejemplo:*
>> Hola, ¿en qué puedo ayudarte?
>>2 Te ayudo en un momento`;
            await this.whatsappService.sendMessageToPhone(telefonoAdmin, admin.nombre, ayuda);
            return true;
        }

        // Comando: /mis - ver mis conversaciones en handoff
        if (msgLower === '/mis') {
            const conversaciones = await this.inboxService.getConversacionesHandoffDeAdmin(admin.id);

            if (conversaciones.length === 0) {
                await this.whatsappService.sendMessageToPhone(
                    telefonoAdmin,
                    admin.nombre,
                    '📭 No tienes conversaciones en handoff.',
                );
                return true;
            }

            let lista = '📋 *Mis conversaciones en handoff:*\n\n';
            conversaciones.forEach((c, i) => {
                lista += `${i + 1}. ${c.usuario?.nombre || c.usuario?.nombreWhatsapp || c.telefono}\n`;
                lista += `   📱 ${c.telefono}\n`;
                if (c.ultimoMensaje) {
                    lista += `   💬 "${c.ultimoMensaje.substring(0, 30)}..."\n`;
                }
                lista += '\n';
            });
            await this.whatsappService.sendMessageToPhone(telefonoAdmin, admin.nombre, lista);
            return true;
        }

        // Prefijo: >> mensaje - responder a usuario en handoff
        // Soporta: >> mensaje (una conv) o >>1 mensaje (especificar número)
        if (message.startsWith('>>')) {
            let resto = message.substring(2).trim();
            if (!resto) {
                return false; // No hay contenido, procesar normalmente
            }

            // Buscar conversación en handoff del admin
            const conversaciones = await this.inboxService.getConversacionesHandoffDeAdmin(admin.id);

            if (conversaciones.length === 0) {
                await this.whatsappService.sendMessageToPhone(
                    telefonoAdmin,
                    admin.nombre,
                    '⚠️ No tienes conversaciones en handoff. Primero toma una conversación desde el panel.',
                );
                return true;
            }

            // Filtrar solo las que permiten respuesta por WhatsApp
            const conversacionesWhatsApp = conversaciones.filter((conv) => {
                const modo = conv.modoRespuesta || conv.derivadaA?.modoHandoffDefault || 'AMBOS';
                return modo === 'WHATSAPP' || modo === 'AMBOS';
            });

            if (conversacionesWhatsApp.length === 0) {
                await this.whatsappService.sendMessageToPhone(
                    telefonoAdmin,
                    admin.nombre,
                    '⚠️ Todas tus conversaciones están configuradas para responder solo desde la Web.\nCambia la configuración en el panel si quieres responder por WhatsApp.',
                );
                return true;
            }

            let convDestino: any;
            let contenido: string;

            // Verificar si empieza con un número (>>1 mensaje, >>2 mensaje, etc.)
            const matchNumero = resto.match(/^(\d+)\s+(.+)/);

            if (conversacionesWhatsApp.length === 1) {
                // Solo una conversación disponible para WhatsApp
                convDestino = conversacionesWhatsApp[0];
                contenido = resto;
            } else if (matchNumero) {
                // Múltiples conversaciones y especificó número
                const numero = parseInt(matchNumero[1], 10);
                contenido = matchNumero[2];

                if (numero < 1 || numero > conversacionesWhatsApp.length) {
                    await this.whatsappService.sendMessageToPhone(
                        telefonoAdmin,
                        admin.nombre,
                        `⚠️ Número inválido. Tienes ${conversacionesWhatsApp.length} conversaciones para WhatsApp.\nUsa >>1, >>2, etc. hasta >>${conversacionesWhatsApp.length}`,
                    );
                    return true;
                }
                convDestino = conversacionesWhatsApp[numero - 1];
            } else {
                // Múltiples conversaciones y no especificó número - mostrar lista
                let lista = `📋 *Tienes ${conversacionesWhatsApp.length} conversaciones para responder por WhatsApp:*\n\n`;
                conversacionesWhatsApp.forEach((conv, idx) => {
                    const nombre = conv.usuario?.nombre || conv.usuario?.nombreWhatsapp || conv.telefono;
                    lista += `*${idx + 1}.* ${nombre}\n`;
                });
                lista += `\n💡 Usa *>>${1} tu mensaje* para responder a la primera, *>>${2} tu mensaje* para la segunda, etc.`;

                if (conversaciones.length > conversacionesWhatsApp.length) {
                    lista += `\n\n_Nota: ${conversaciones.length - conversacionesWhatsApp.length} conversación(es) solo se pueden responder desde la Web._`;
                }

                await this.whatsappService.sendMessageToPhone(telefonoAdmin, admin.nombre, lista);
                return true;
            }

            // Guardar mensaje saliente
            await this.inboxService.guardarMensaje({
                conversacionId: convDestino.id,
                contenido,
                direccion: DireccionMensaje.SALIENTE,
                tipo: 'texto',
                enviadoPorId: admin.id,
            });

            // Enviar a WhatsApp del usuario
            await this.whatsappService.sendMessageToPhone(
                convDestino.telefono,
                convDestino.usuario?.nombre || 'Usuario',
                contenido,
            );

            // Confirmar al admin
            const nombreDestino = convDestino.usuario?.nombre || convDestino.usuario?.nombreWhatsapp || convDestino.telefono;
            await this.whatsappService.sendMessageToPhone(
                telefonoAdmin,
                admin.nombre,
                `✅ Mensaje enviado a ${nombreDestino}`,
            );
            return true;
        }

        return false; // No fue un comando de admin
    }

    /**
     * Notificar al admin cuando recibe mensaje en modo HANDOFF
     */
    private async notificarAdminHandoff(
        conversacion: any,
        mensaje: string,
        nombreRemitente: string,
    ): Promise<void> {
        if (!conversacion.derivadaA?.id) return;

        // Obtener preferencias del admin
        const admin = await this.prisma.usuario.findUnique({
            where: { id: conversacion.derivadaA.id },
            select: {
                id: true,
                nombre: true,
                telefono: true,
                codigoPais: true,
                modoHandoffDefault: true,
            },
        });

        if (!admin) {
            this.logger.debug(`Admin ${conversacion.derivadaA.id} no encontrado`);
            return;
        }

        // Determinar modo de respuesta: override de la conv o default del admin
        const modoRespuesta = conversacion.modoRespuesta || admin.modoHandoffDefault || 'AMBOS';

        // Solo notificar por WhatsApp si el modo es WHATSAPP o AMBOS
        if (modoRespuesta === 'WEB') {
            this.logger.debug(`Admin ${admin.id} tiene modo WEB para esta conversación, no se envía notificación WhatsApp`);
            return;
        }

        // Enviar notificación al admin
        const telefonoAdmin = `${admin.codigoPais}${admin.telefono}`;
        const notificacion = `📩 *Nuevo mensaje de ${nombreRemitente}:*\n\n"${mensaje.substring(0, 200)}${mensaje.length > 200 ? '...' : ''}"\n\nResponde con >> tu mensaje`;

        await this.whatsappService.sendMessageToPhone(telefonoAdmin, admin.nombre, notificacion);
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
        conversacionDB: any,
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

        // Obtener datos de la conversación
        const conversacion = await this.prisma.conversacion.findUnique({
            where: { id: conversacionDB.id },
        });

        return {
            conversationId,
            telefono: telefonoLimpio,
            nombreWhatsapp,
            usuarioId: usuario?.id,
            roles: usuario?.roles?.map(r => r.rol.nombre) || [],
            estado: conversacion?.estado || 'inicio',
            moduloActivo: conversacion?.moduloActivo || undefined,
            datos: (conversacion?.contexto as Record<string, any>) || {},
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
            helpText += `🔧 *Admin:*\n`;
            helpText += `   • /pendientes - ver pendientes\n`;
            helpText += `   • /mis - mis conversaciones\n`;
            helpText += `   • >> mensaje - responder en handoff\n\n`;
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
