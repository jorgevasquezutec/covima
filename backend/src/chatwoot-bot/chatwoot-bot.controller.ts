import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { IntentRouterService } from './intent-router.service';

@ApiTags('Chatwoot Bot')
@Controller('chatwoot')
export class ChatwootBotController {
    private readonly logger = new Logger(ChatwootBotController.name);

    constructor(private readonly intentRouter: IntentRouterService) { }

    @Post('webhook')
    @HttpCode(200)
    @ApiOperation({ summary: 'Webhook para recibir eventos de Chatwoot' })
    @ApiExcludeEndpoint() // Ocultar del Swagger público
    async handleWebhook(@Body() payload: any): Promise<{ status: string }> {
        this.logger.debug(`Webhook received: ${JSON.stringify(payload).substring(0, 500)}...`);

        // Para Agent Bot, el event viene como "message_created" 
        // y el contenido está directamente en payload.content
        const event = payload.event || 'message_created';

        // Solo procesar mensajes entrantes
        if (event !== 'message_created') {
            this.logger.debug(`Ignoring event: ${event}`);
            return { status: 'ignored' };
        }

        // El Agent Bot recibe el contenido directamente en payload
        const message = payload.content || payload.message?.content;
        const messageType = payload.message_type || payload.message?.message_type;

        // Ignorar mensajes salientes o privados
        if (messageType === 'outgoing' || payload.message?.private) {
            this.logger.debug('Ignoring outgoing or private message');
            return { status: 'ignored' };
        }

        const conversationId = payload.conversation?.id;

        // Obtener teléfono del contacto - múltiples fuentes posibles
        const telefono = payload.sender?.phone_number ||
            payload.conversation?.meta?.sender?.phone_number ||
            payload.conversation?.contact_inbox?.source_id ||
            payload.message?.sender?.phone_number ||
            '';

        // Obtener nombre del contacto
        const nombreWhatsapp = payload.sender?.name ||
            payload.conversation?.meta?.sender?.name ||
            payload.message?.sender?.name ||
            'Usuario';

        this.logger.log(`Processing message: "${message}" from ${nombreWhatsapp} (${telefono}) - conv: ${conversationId}`);

        if (!message || !conversationId || !telefono) {
            this.logger.warn('Webhook missing required data', { message: !!message, conversationId, telefono: !!telefono });
            return { status: 'error' };
        }

        // Procesar mensaje de forma asíncrona (no bloquear respuesta del webhook)
        setImmediate(async () => {
            try {
                await this.intentRouter.processMessage(
                    conversationId,
                    message,
                    telefono,
                    nombreWhatsapp,
                );
            } catch (error) {
                this.logger.error(`Error processing message: ${error.message}`, error.stack);
            }
        });

        return { status: 'ok' };
    }

    @Post('test')
    @ApiOperation({ summary: 'Endpoint de prueba para simular mensajes' })
    async testMessage(
        @Body() body: { message: string; telefono: string; nombre?: string },
    ): Promise<any> {
        // Solo para desarrollo/pruebas
        this.logger.log(`Test message: ${body.message} from ${body.telefono}`);

        // Simular conversationId para pruebas
        const fakeConversationId = 9999;

        try {
            await this.intentRouter.processMessage(
                fakeConversationId,
                body.message,
                body.telefono,
                body.nombre || 'Test User',
            );
            return { status: 'processed' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
}
