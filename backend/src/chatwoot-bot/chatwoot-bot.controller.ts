import { Controller, Get, Post, Body, Query, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IntentRouterService } from './intent-router.service';
import { ChatwootBotService } from './chatwoot-bot.service';

interface WhatsAppWebhookPayload {
    object: string;
    entry: {
        id: string;
        changes: {
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: {
                    profile: { name: string };
                    wa_id: string;
                }[];
                messages?: {
                    from: string;
                    id: string;
                    timestamp: string;
                    type: string;
                    text?: { body: string };
                    interactive?: {
                        type: string;
                        button_reply?: { id: string; title: string };
                        list_reply?: { id: string; title: string };
                    };
                }[];
                statuses?: {
                    id: string;
                    status: string;
                    timestamp: string;
                    recipient_id: string;
                }[];
            };
            field: string;
        }[];
    }[];
}

@ApiTags('WhatsApp Bot')
@Controller('whatsapp')
export class ChatwootBotController {
    private readonly logger = new Logger(ChatwootBotController.name);
    private readonly verifyToken: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly intentRouter: IntentRouterService,
        private readonly chatwootService: ChatwootBotService,
    ) {
        this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN', 'covima_verify_token');
    }

    /**
     * Verificación del webhook (requerido por Meta)
     */
    @Get('webhook')
    @ApiOperation({ summary: 'Verificación del webhook de WhatsApp' })
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
    ): string | number {
        this.logger.log(`Webhook verification: mode=${mode}, token=${token}`);

        if (mode === 'subscribe' && token === this.verifyToken) {
            this.logger.log('Webhook verified successfully');
            return challenge;
        }

        this.logger.warn('Webhook verification failed');
        return 'Verification failed';
    }

    /**
     * Recibir mensajes de WhatsApp (directo de Meta API)
     */
    @Post('webhook')
    @HttpCode(200)
    @ApiExcludeEndpoint()
    async handleWebhook(@Body() payload: WhatsAppWebhookPayload): Promise<{ status: string }> {
        this.logger.debug(`Webhook received: ${JSON.stringify(payload).substring(0, 500)}...`);

        // Verificar que es un mensaje de WhatsApp
        if (payload.object !== 'whatsapp_business_account') {
            return { status: 'ignored' };
        }

        // Procesar cada entrada
        for (const entry of payload.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== 'messages') continue;

                const value = change.value;
                const messages = value.messages || [];
                const contacts = value.contacts || [];

                for (const message of messages) {
                    // Solo procesar mensajes de texto o respuestas interactivas
                    if (!['text', 'interactive'].includes(message.type)) {
                        this.logger.debug(`Ignoring message type: ${message.type}`);
                        continue;
                    }

                    // Extraer contenido del mensaje
                    let content = '';
                    if (message.type === 'text') {
                        content = message.text?.body || '';
                    } else if (message.type === 'interactive') {
                        content = message.interactive?.button_reply?.title ||
                            message.interactive?.list_reply?.title || '';
                    }

                    if (!content) continue;

                    // Obtener información del contacto
                    const telefono = message.from;
                    const contact = contacts.find(c => c.wa_id === telefono);
                    const nombreWhatsapp = contact?.profile?.name || 'Usuario';

                    this.logger.log(`Message from ${nombreWhatsapp} (${telefono}): "${content}"`);

                    // Procesar mensaje de forma asíncrona
                    const messageId = message.id;
                    setImmediate(async () => {
                        try {
                            await this.intentRouter.processMessage(
                                // Usamos el teléfono como "conversationId"
                                parseInt(telefono.slice(-8), 10) || Date.now(),
                                content,
                                telefono,
                                nombreWhatsapp,
                                messageId, // Para typing indicator
                            );
                        } catch (error) {
                            this.logger.error(`Error processing message: ${error.message}`, error.stack);
                        }
                    });
                }
            }
        }

        return { status: 'ok' };
    }

    /**
     * Endpoint de prueba para simular mensajes
     */
    @Post('test')
    @ApiOperation({ summary: 'Endpoint de prueba para simular mensajes' })
    async testMessage(
        @Body() body: { message: string; telefono: string; nombre?: string },
    ): Promise<any> {
        this.logger.log(`Test message: ${body.message} from ${body.telefono}`);

        const fakeConversationId = parseInt(body.telefono.slice(-8), 10) || Date.now();

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
