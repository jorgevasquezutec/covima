import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendMessageDto } from './dto';

@Injectable()
export class ChatwootBotService {
    private readonly logger = new Logger(ChatwootBotService.name);
    private readonly baseUrl: string;
    private readonly accountId: string;
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('CHATWOOT_BASE_URL', 'http://localhost:3000');
        this.accountId = this.configService.get<string>('CHATWOOT_ACCOUNT_ID', '1');
        this.apiKey = this.configService.get<string>('CHATWOOT_API_KEY', '');
    }

    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            'api_access_token': this.apiKey,
        };
    }

    /**
     * Activar/desactivar indicador de "escribiendo..."
     */
    async toggleTypingStatus(conversationId: number, isTyping: boolean): Promise<void> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/toggle_typing_status`;

        try {
            await firstValueFrom(
                this.httpService.post(url, {
                    typing_status: isTyping ? 'on' : 'off',
                }, { headers: this.getHeaders() })
            );
            this.logger.debug(`Typing ${isTyping ? 'ON' : 'OFF'} para conversación ${conversationId}`);
        } catch (error) {
            this.logger.warn(`Error toggling typing status: ${error.message}`);
        }
    }

    /**
     * Calcular tiempo de escritura simulado basado en longitud del mensaje
     */
    private calculateTypingDelay(content: string): number {
        // ~40ms por carácter, mínimo 800ms, máximo 2500ms
        const delay = Math.min(2500, Math.max(800, content.length * 40));
        return delay;
    }

    /**
     * Enviar mensaje a una conversación
     */
    async sendMessage(conversationId: number, message: SendMessageDto): Promise<any> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages`;

        try {
            // Mostrar indicador de "escribiendo..." antes de enviar
            await this.toggleTypingStatus(conversationId, true);

            // Simular tiempo de escritura basado en longitud del mensaje
            const typingDelay = this.calculateTypingDelay(message.content);
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            const response = await firstValueFrom(
                this.httpService.post(url, {
                    content: message.content,
                    message_type: message.message_type || 'outgoing',
                    private: message.private || false,
                    content_attributes: message.content_attributes,
                }, { headers: this.getHeaders() })
            );

            this.logger.debug(`Mensaje enviado a conversación ${conversationId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Error enviando mensaje: ${error.message}`);
            throw error;
        } finally {
            // Asegurar que el typing indicator se apague
            await this.toggleTypingStatus(conversationId, false);
        }
    }

    /**
     * Enviar múltiples mensajes en secuencia
     */
    async sendMessages(conversationId: number, messages: string[]): Promise<void> {
        for (const content of messages) {
            await this.sendMessage(conversationId, { content });
            // Pequeña pausa para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Obtener información del contacto
     */
    async getContact(contactId: number): Promise<any> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/contacts/${contactId}`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, { headers: this.getHeaders() })
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Error obteniendo contacto: ${error.message}`);
            return null;
        }
    }

    /**
     * Actualizar atributos personalizados del contacto
     */
    async updateContactAttributes(contactId: number, customAttributes: Record<string, any>): Promise<any> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/contacts/${contactId}`;

        try {
            const response = await firstValueFrom(
                this.httpService.put(url, {
                    custom_attributes: customAttributes,
                }, { headers: this.getHeaders() })
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Error actualizando contacto: ${error.message}`);
            throw error;
        }
    }

    /**
     * Resolver conversación (marcar como resuelta)
     */
    async resolveConversation(conversationId: number): Promise<void> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/toggle_status`;

        try {
            await firstValueFrom(
                this.httpService.post(url, { status: 'resolved' }, { headers: this.getHeaders() })
            );
        } catch (error) {
            this.logger.error(`Error resolviendo conversación: ${error.message}`);
        }
    }

    /**
     * Buscar contacto por número de teléfono
     */
    async findContactByPhone(phoneNumber: string): Promise<any | null> {
        // Normalizar número (quitar + y espacios)
        const normalizedPhone = phoneNumber.replace(/[\s+\-]/g, '');
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/contacts/search?q=${normalizedPhone}`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, { headers: this.getHeaders() })
            );

            const contacts = response.data?.payload || [];
            // Buscar el contacto que coincida con el número
            return contacts.find((c: any) =>
                c.phone_number?.replace(/[\s+\-]/g, '') === normalizedPhone ||
                c.phone_number?.replace(/[\s+\-]/g, '').endsWith(normalizedPhone) ||
                normalizedPhone.endsWith(c.phone_number?.replace(/[\s+\-]/g, '') || '')
            ) || null;
        } catch (error) {
            this.logger.error(`Error buscando contacto: ${error.message}`);
            return null;
        }
    }

    /**
     * Crear un nuevo contacto
     */
    async createContact(phoneNumber: string, name: string): Promise<any | null> {
        const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}/contacts`;
        const inboxId = this.configService.get<string>('CHATWOOT_INBOX_ID');

        try {
            const response = await firstValueFrom(
                this.httpService.post(url, {
                    inbox_id: inboxId ? parseInt(inboxId) : undefined,
                    name,
                    phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
                }, { headers: this.getHeaders() })
            );
            return response.data?.payload?.contact || response.data;
        } catch (error) {
            this.logger.error(`Error creando contacto: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtener o crear una conversación para un contacto
     */
    async getOrCreateConversation(contactId: number): Promise<number | null> {
        const inboxId = this.configService.get<string>('CHATWOOT_INBOX_ID');

        if (!inboxId) {
            this.logger.error('CHATWOOT_INBOX_ID no configurado');
            return null;
        }

        // Primero buscar conversaciones existentes abiertas
        const searchUrl = `${this.baseUrl}/api/v1/accounts/${this.accountId}/contacts/${contactId}/conversations`;

        try {
            const searchResponse = await firstValueFrom(
                this.httpService.get(searchUrl, { headers: this.getHeaders() })
            );

            const conversations = searchResponse.data?.payload || [];
            // Buscar una conversación abierta en el inbox correcto
            const openConversation = conversations.find((c: any) =>
                c.inbox_id === parseInt(inboxId) && c.status !== 'resolved'
            );

            if (openConversation) {
                return openConversation.id;
            }

            // Si no hay conversación abierta, crear una nueva
            const createUrl = `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations`;
            const createResponse = await firstValueFrom(
                this.httpService.post(createUrl, {
                    source_id: `covima_${contactId}_${Date.now()}`,
                    inbox_id: parseInt(inboxId),
                    contact_id: contactId,
                    status: 'open',
                }, { headers: this.getHeaders() })
            );

            return createResponse.data?.id || null;
        } catch (error) {
            this.logger.error(`Error obteniendo/creando conversación: ${error.message}`);
            return null;
        }
    }

    /**
     * Enviar mensaje a un número de teléfono específico
     * Busca o crea el contacto y la conversación automáticamente
     */
    async sendMessageToPhone(
        phoneNumber: string,
        name: string,
        message: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Normalizar número
            const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

            // Buscar o crear contacto
            let contact = await this.findContactByPhone(normalizedPhone);

            if (!contact) {
                contact = await this.createContact(normalizedPhone, name);
                if (!contact) {
                    return { success: false, error: 'No se pudo crear el contacto' };
                }
            }

            // Obtener o crear conversación
            const conversationId = await this.getOrCreateConversation(contact.id);
            if (!conversationId) {
                return { success: false, error: 'No se pudo crear la conversación' };
            }

            // Enviar el mensaje
            await this.sendMessage(conversationId, { content: message });

            return { success: true };
        } catch (error) {
            this.logger.error(`Error enviando mensaje a ${phoneNumber}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}
