import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendMessageDto } from './dto';

/**
 * Servicio de mensajería que envía mensajes directamente a WhatsApp API
 * (Sin Chatwoot como intermediario)
 *
 * Mantiene la misma interfaz que la versión con Chatwoot para compatibilidad
 * con los handlers existentes.
 */
@Injectable()
export class WhatsappBotService {
    private readonly logger = new Logger(WhatsappBotService.name);
    private readonly token: string;
    private readonly phoneNumberId: string;
    private readonly apiUrl = 'https://graph.facebook.com/v18.0';

    // Mapa de conversationId -> telefono para mantener compatibilidad
    private conversationPhoneMap = new Map<number, string>();
    // Mapa de conversationId -> último messageId recibido (para typing indicator)
    private lastMessageIdMap = new Map<number, string>();

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.token = this.configService.get<string>('WHATSAPP_TOKEN', '');
        this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');

        if (!this.token || !this.phoneNumberId) {
            this.logger.warn('WhatsApp credentials not configured');
        } else {
            this.logger.log('WhatsApp direct messaging service initialized');
        }
    }

    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
        };
    }

    /**
     * Registrar el teléfono y messageId asociado a un conversationId
     * Debe llamarse al inicio de cada mensaje procesado
     */
    registerConversation(conversationId: number, telefono: string, messageId?: string): void {
        this.conversationPhoneMap.set(conversationId, telefono);
        if (messageId) {
            this.lastMessageIdMap.set(conversationId, messageId);
        }
    }

    /**
     * Obtener teléfono de un conversationId
     */
    getPhone(conversationId: number): string | undefined {
        return this.conversationPhoneMap.get(conversationId);
    }

    /**
     * Mostrar typing indicator en WhatsApp
     * Marca el mensaje como leído y muestra "escribiendo..."
     */
    async toggleTypingStatus(conversationId: number, isTyping: boolean): Promise<void> {
        if (!isTyping) return;

        const messageId = this.lastMessageIdMap.get(conversationId);
        if (!messageId) {
            this.logger.debug(`No messageId found for conversation ${conversationId}`);
            return;
        }

        await this.showTypingIndicator(messageId);
    }

    /**
     * Enviar typing indicator a WhatsApp Cloud API
     * Marca como leído + muestra "escribiendo..." por hasta 25 segundos
     */
    private async showTypingIndicator(messageId: string): Promise<void> {
        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

        try {
            await firstValueFrom(
                this.httpService.post(url, {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                    typing_indicator: {
                        type: 'text',
                    },
                }, { headers: this.getHeaders() })
            );
            this.logger.debug(`Typing indicator sent for message ${messageId}`);
        } catch (error) {
            this.logger.warn(`Error sending typing indicator: ${error.message}`);
        }
    }

    /**
     * Enviar mensaje a una conversación (compatible con interfaz anterior)
     */
    async sendMessage(conversationId: number, message: SendMessageDto): Promise<any> {
        const telefono = this.conversationPhoneMap.get(conversationId);

        if (!telefono) {
            this.logger.error(`No phone found for conversationId ${conversationId}`);
            return null;
        }

        return this.sendWhatsAppMessage(telefono, message.content);
    }

    /**
     * Enviar mensaje directamente a WhatsApp
     */
    private async sendWhatsAppMessage(to: string, message: string): Promise<any> {
        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
        const normalizedTo = to.replace(/[\s+\-]/g, '');

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: normalizedTo,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: message,
                    },
                }, { headers: this.getHeaders() })
            );

            this.logger.debug(`Message sent to ${normalizedTo}: ${response.data?.messages?.[0]?.id}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Error sending message to ${normalizedTo}: ${error.message}`);
            if (error.response?.data) {
                this.logger.error(`WhatsApp API error: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Enviar múltiples mensajes en secuencia
     */
    async sendMessages(conversationId: number, messages: string[]): Promise<void> {
        for (const content of messages) {
            await this.sendMessage(conversationId, { content });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Obtener información del contacto - stub
     */
    async getContact(contactId: number): Promise<any> {
        return null;
    }

    /**
     * Actualizar atributos del contacto - stub
     */
    async updateContactAttributes(contactId: number, customAttributes: Record<string, any>): Promise<any> {
        return null;
    }

    /**
     * Resolver conversación - limpia el mapa
     */
    async resolveConversation(conversationId: number): Promise<void> {
        this.conversationPhoneMap.delete(conversationId);
    }

    /**
     * Buscar contacto por teléfono - stub
     */
    async findContactByPhone(phoneNumber: string): Promise<any | null> {
        return { phone_number: phoneNumber };
    }

    /**
     * Crear contacto - stub
     */
    async createContact(phoneNumber: string, name: string): Promise<any | null> {
        return { id: Date.now(), phone_number: phoneNumber, name };
    }

    /**
     * Obtener o crear conversación - stub
     */
    async getOrCreateConversation(contactId: number): Promise<number | null> {
        return contactId;
    }

    /**
     * Enviar mensaje a un número de teléfono específico (para notificaciones)
     */
    async sendMessageToPhone(
        phoneNumber: string,
        name: string,
        message: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            await this.sendWhatsAppMessage(phoneNumber, message);
            return { success: true };
        } catch (error) {
            this.logger.error(`Error enviando mensaje a ${phoneNumber}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marcar mensaje como leído
     */
    async markAsRead(messageId: string): Promise<void> {
        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

        try {
            await firstValueFrom(
                this.httpService.post(url, {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                }, { headers: this.getHeaders() })
            );
        } catch (error) {
            this.logger.warn(`Error marking message as read: ${error.message}`);
        }
    }

    /**
     * Enviar plantilla de WhatsApp a un número de teléfono
     * @param phoneNumber Número de teléfono con código de país
     * @param templateName Nombre de la plantilla aprobada en Meta
     * @param languageCode Código de idioma (ej: es_PE)
     * @param bodyParameters Parámetros del cuerpo de la plantilla
     */
    async sendTemplateToPhone(
        phoneNumber: string,
        templateName: string,
        languageCode: string,
        bodyParameters: string[],
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
        const normalizedPhone = phoneNumber.replace(/[\s+\-]/g, '');

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: [
                    {
                        type: 'body',
                        parameters: bodyParameters.map(text => ({
                            type: 'text',
                            text,
                        })),
                    },
                ],
            },
        };

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, { headers: this.getHeaders() })
            );

            const messageId = response.data?.messages?.[0]?.id;
            this.logger.log(`Template "${templateName}" sent to ${normalizedPhone}: ${messageId}`);
            return { success: true, messageId };
        } catch (error) {
            this.logger.error(`Error sending template to ${normalizedPhone}: ${error.message}`);
            if (error.response?.data) {
                this.logger.error(`WhatsApp API error: ${JSON.stringify(error.response.data)}`);
            }
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }
}
