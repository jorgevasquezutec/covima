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
export class ChatwootBotService {
    private readonly logger = new Logger(ChatwootBotService.name);
    private readonly token: string;
    private readonly phoneNumberId: string;
    private readonly apiUrl = 'https://graph.facebook.com/v18.0';

    // Mapa de conversationId -> telefono para mantener compatibilidad
    private conversationPhoneMap = new Map<number, string>();

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
     * Registrar el teléfono asociado a un conversationId
     * Debe llamarse al inicio de cada mensaje procesado
     */
    registerConversation(conversationId: number, telefono: string): void {
        this.conversationPhoneMap.set(conversationId, telefono);
    }

    /**
     * Obtener teléfono de un conversationId
     */
    getPhone(conversationId: number): string | undefined {
        return this.conversationPhoneMap.get(conversationId);
    }

    /**
     * Toggle typing status - no-op para WhatsApp directo
     */
    async toggleTypingStatus(conversationId: number, isTyping: boolean): Promise<void> {
        // No-op: WhatsApp API no soporta controlar el indicador de escritura
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
}
