import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Payload del webhook de Chatwoot Agent Bot
// El formato es más flexible porque Chatwoot envía diferentes estructuras
export class ChatwootWebhookDto {
  @IsString()
  @IsOptional()
  event?: string; // 'message_created', 'conversation_created', etc.

  @IsOptional()
  id?: number;

  @IsObject()
  @IsOptional()
  account?: {
    id: number;
    name: string;
  };

  @IsObject()
  @IsOptional()
  inbox?: {
    id: number;
    name: string;
  };

  @IsObject()
  @IsOptional()
  conversation?: {
    id: number;
    status?: string;
    inbox_id?: number;
    contact_inbox?: {
      source_id?: string; // Número de WhatsApp
    };
    messages?: any[];
    meta?: {
      sender?: {
        id?: number;
        name?: string;
        phone_number?: string;
      };
    };
  };

  // Para Agent Bot, el contenido viene directo
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  message_type?: string;

  @IsObject()
  @IsOptional()
  message?: {
    id?: number;
    content?: string;
    message_type?: 'incoming' | 'outgoing' | 'activity';
    content_type?: string;
    private?: boolean;
    sender?: {
      id?: number;
      name?: string;
      type?: string;
      phone_number?: string;
    };
  };

  @IsObject()
  @IsOptional()
  sender?: {
    id?: number;
    name?: string;
    email?: string;
    phone_number?: string;
  };
}

// Respuesta para enviar mensaje a Chatwoot
export class SendMessageDto {
  content: string;
  message_type?: 'outgoing' | 'template';
  private?: boolean;
  content_attributes?: Record<string, any>;
}

// Intent clasificado por OpenAI
export class IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  requiresAuth: boolean;
  requiredRoles: string[];
}

// Contexto de conversación
export class ConversationContext {
  conversationId: number;
  telefono: string;
  nombreWhatsapp: string;
  usuarioId?: number;
  roles: string[];
  estado: string;
  moduloActivo?: string;
  datos: Record<string, any>;
}
