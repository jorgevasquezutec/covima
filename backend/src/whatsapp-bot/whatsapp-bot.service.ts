import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendMessageDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { DireccionMensaje, EstadoMensaje } from '@prisma/client';
import { InboxGateway } from '../inbox/inbox.gateway';

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
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InboxGateway))
    private readonly inboxGateway: InboxGateway,
  ) {
    this.token = this.configService.get<string>('WHATSAPP_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
      '',
    );

    if (!this.token || !this.phoneNumberId) {
      this.logger.warn('WhatsApp credentials not configured');
    } else {
      this.logger.log('WhatsApp direct messaging service initialized');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Registrar el teléfono y messageId asociado a un conversationId
   * Debe llamarse al inicio de cada mensaje procesado
   */
  registerConversation(
    conversationId: number,
    telefono: string,
    messageId?: string,
  ): void {
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
  async toggleTypingStatus(
    conversationId: number,
    isTyping: boolean,
  ): Promise<void> {
    if (!isTyping) return;

    const messageId = this.lastMessageIdMap.get(conversationId);
    if (!messageId) {
      this.logger.debug(
        `No messageId found for conversation ${conversationId}`,
      );
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
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
            typing_indicator: {
              type: 'text',
            },
          },
          { headers: this.getHeaders() },
        ),
      );
      this.logger.debug(`Typing indicator sent for message ${messageId}`);
    } catch (error) {
      this.logger.warn(`Error sending typing indicator: ${error.message}`);
    }
  }

  /**
   * Enviar mensaje a una conversación (compatible con interfaz anterior)
   * Automáticamente guarda el mensaje en la BD como mensaje del bot
   */
  async sendMessage(
    conversationId: number,
    message: SendMessageDto,
  ): Promise<any> {
    // Usar sendBotMessage que guarda Y envía
    return this.sendBotMessage(conversationId, message.content);
  }

  /**
   * Enviar mensaje directamente a WhatsApp
   */
  private async sendWhatsAppMessage(to: string, message: string): Promise<any> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
    const normalizedTo = to.replace(/[\s+\-]/g, '');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedTo,
            type: 'text',
            text: {
              preview_url: false,
              body: message,
            },
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.debug(
        `Message sent to ${normalizedTo}: ${response.data?.messages?.[0]?.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error sending message to ${normalizedTo}: ${error.message}`,
      );
      if (error.response?.data) {
        this.logger.error(
          `WhatsApp API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Enviar múltiples mensajes en secuencia
   */
  async sendMessages(
    conversationId: number,
    messages: string[],
  ): Promise<void> {
    for (const content of messages) {
      await this.sendMessage(conversationId, { content });
      await new Promise((resolve) => setTimeout(resolve, 500));
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
  async updateContactAttributes(
    contactId: number,
    customAttributes: Record<string, any>,
  ): Promise<any> {
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
      this.logger.error(
        `Error enviando mensaje a ${phoneNumber}: ${error.message}`,
      );
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
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          },
          { headers: this.getHeaders() },
        ),
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
   * @param messageContentForInbox Contenido del mensaje para guardar en inbox (opcional)
   */
  async sendTemplateToPhone(
    phoneNumber: string,
    templateName: string,
    languageCode: string,
    bodyParameters: string[],
    messageContentForInbox?: string,
    urlButtonParams?: { index: number; text: string }[],
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
    const normalizedPhone = phoneNumber.replace(/[\s+\-]/g, '');

    const components: any[] = [
      {
        type: 'body',
        parameters: bodyParameters.map((text) => ({
          type: 'text',
          text,
        })),
      },
    ];

    // Agregar botones de URL dinámica si se proporcionan
    if (urlButtonParams) {
      for (const btn of urlButtonParams) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: String(btn.index),
          parameters: [{ type: 'text', text: btn.text }],
        });
      }
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers: this.getHeaders() }),
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(
        `Template "${templateName}" sent to ${normalizedPhone}: ${messageId}`,
      );

      // Guardar el mensaje en el inbox si se proporciona el contenido
      if (messageContentForInbox) {
        await this.saveOutgoingMessageToInbox(normalizedPhone, messageContentForInbox);
      }

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(
        `Error sending template to ${normalizedPhone}: ${error.message}`,
      );
      if (error.response?.data) {
        this.logger.error(
          `WhatsApp API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Guardar un mensaje saliente en el inbox
   * Busca o crea la conversación y guarda el mensaje
   */
  private async saveOutgoingMessageToInbox(
    phoneNumber: string,
    content: string,
  ): Promise<void> {
    try {
      // Normalizar teléfono (extraer últimos 9 dígitos para buscar)
      const telefonoCorto = phoneNumber.slice(-9);

      // Buscar conversación existente
      let conversacion = await this.prisma.conversacion.findFirst({
        where: {
          telefono: { endsWith: telefonoCorto },
        },
      });

      // Si no existe, crear una nueva
      if (!conversacion) {
        // Buscar usuario por teléfono
        const usuario = await this.prisma.usuario.findFirst({
          where: { telefono: { endsWith: telefonoCorto } },
        });

        conversacion = await this.prisma.conversacion.create({
          data: {
            telefono: phoneNumber,
            estado: 'inicio',
            ultimoMensajeAt: new Date(),
            usuarioId: usuario?.id,
          },
        });
      }

      // Guardar mensaje saliente
      const mensaje = await this.prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          contenido: content,
          direccion: DireccionMensaje.SALIENTE,
          tipo: 'bot',
          estado: EstadoMensaje.ENVIADO,
        },
      });

      // Actualizar último mensaje de la conversación
      await this.prisma.conversacion.update({
        where: { id: conversacion.id },
        data: {
          ultimoMensaje: content.substring(0, 500),
          ultimoMensajeAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Emitir evento WebSocket
      try {
        await this.inboxGateway.emitMensajeNuevo(conversacion.id, {
          id: mensaje.id,
          contenido: mensaje.contenido,
          tipo: mensaje.tipo,
          direccion: mensaje.direccion,
          estado: mensaje.estado,
          createdAt: mensaje.createdAt,
        });
      } catch {
        // Ignorar errores de WebSocket
      }

      this.logger.debug(`Mensaje guardado en inbox para ${phoneNumber}`);
    } catch (error) {
      this.logger.error(
        `Error guardando mensaje en inbox para ${phoneNumber}: ${error.message}`,
      );
    }
  }

  /**
   * Enviar mensaje interactivo con botones (máx 3)
   */
  async sendInteractiveButtons(
    conversationId: number,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<any> {
    const telefono = this.conversationPhoneMap.get(conversationId);
    if (!telefono) {
      this.logger.error(`No phone found for conversationId ${conversationId}`);
      return null;
    }

    const result = await this.sendWhatsAppInteractive(telefono, {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    });

    // Guardar en inbox como texto
    await this.saveBotMessageToInbox(conversationId, telefono, body);
    return result;
  }

  /**
   * Enviar mensaje interactivo tipo lista (máx 10 items)
   */
  async sendInteractiveList(
    conversationId: number,
    body: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  ): Promise<any> {
    const telefono = this.conversationPhoneMap.get(conversationId);
    if (!telefono) {
      this.logger.error(`No phone found for conversationId ${conversationId}`);
      return null;
    }

    const result = await this.sendWhatsAppInteractive(telefono, {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: r.description?.slice(0, 72),
          })),
        })),
      },
    });

    // Guardar en inbox como texto
    await this.saveBotMessageToInbox(conversationId, telefono, body);
    return result;
  }

  /**
   * Enviar mensaje interactivo a WhatsApp Cloud API
   */
  private async sendWhatsAppInteractive(to: string, interactive: any): Promise<any> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
    const normalizedTo = to.replace(/[\s+\-]/g, '');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedTo,
            type: 'interactive',
            interactive,
          },
          { headers: this.getHeaders() },
        ),
      );

      this.logger.debug(
        `Interactive message sent to ${normalizedTo}: ${response.data?.messages?.[0]?.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error sending interactive to ${normalizedTo}: ${error.message}`,
      );
      if (error.response?.data) {
        this.logger.error(
          `WhatsApp API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }

  /**
   * Guardar mensaje del bot en inbox (helper)
   */
  private async saveBotMessageToInbox(
    conversationId: number,
    telefono: string,
    content: string,
  ): Promise<void> {
    const conversacion = await this.prisma.conversacion.findFirst({
      where: { telefono },
    });

    if (conversacion) {
      const mensaje = await this.prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          contenido: content,
          direccion: DireccionMensaje.SALIENTE,
          tipo: 'bot',
          estado: EstadoMensaje.ENVIADO,
        },
      });

      await this.prisma.conversacion.update({
        where: { id: conversacion.id },
        data: {
          ultimoMensaje: content.substring(0, 500),
          updatedAt: new Date(),
        },
      });

      try {
        await this.inboxGateway.emitMensajeNuevo(conversacion.id, {
          id: mensaje.id,
          contenido: mensaje.contenido,
          tipo: mensaje.tipo,
          direccion: mensaje.direccion,
          estado: mensaje.estado,
          createdAt: mensaje.createdAt,
          leidoAt: null,
          enviadoPor: null,
        });
      } catch {
        // Ignorar errores de WebSocket
      }
    }
  }

  /**
   * Enviar mensaje del bot Y guardarlo en la BD
   * Usar este método para todas las respuestas automáticas del bot
   */
  async sendBotMessage(conversationId: number, content: string): Promise<any> {
    const telefono = this.conversationPhoneMap.get(conversationId);

    if (!telefono) {
      this.logger.error(`No phone found for conversationId ${conversationId}`);
      return null;
    }

    // Buscar conversación en BD para guardar el mensaje
    const conversacion = await this.prisma.conversacion.findFirst({
      where: { telefono },
    });

    if (conversacion) {
      // Guardar mensaje saliente del bot
      const mensaje = await this.prisma.mensaje.create({
        data: {
          conversacionId: conversacion.id,
          contenido: content,
          direccion: DireccionMensaje.SALIENTE,
          tipo: 'bot',
          estado: EstadoMensaje.ENVIADO,
        },
      });

      // Actualizar último mensaje de la conversación
      await this.prisma.conversacion.update({
        where: { id: conversacion.id },
        data: {
          ultimoMensaje: content.substring(0, 500),
          updatedAt: new Date(),
        },
      });

      // Emitir evento WebSocket para actualizar el inbox en tiempo real
      try {
        await this.inboxGateway.emitMensajeNuevo(conversacion.id, {
          id: mensaje.id,
          contenido: mensaje.contenido,
          tipo: mensaje.tipo,
          direccion: mensaje.direccion,
          estado: mensaje.estado,
          createdAt: mensaje.createdAt,
          leidoAt: null,
          enviadoPor: null, // Mensaje del bot
        });
      } catch (error) {
        this.logger.warn(`Error emitting WebSocket event: ${error.message}`);
      }
    }

    // Enviar a WhatsApp
    return this.sendWhatsAppMessage(telefono, content);
  }
}
