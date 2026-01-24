import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IntentResult } from './dto';

const INTENT_CLASSIFICATION_PROMPT = `Eres un asistente de clasificación de intenciones para un bot de WhatsApp de una iglesia.

Analiza el mensaje del usuario y devuelve un JSON con:
- intent: la intención detectada
- entities: entidades extraídas del mensaje
- confidence: 0.0 a 1.0
- requiresAuth: si necesita usuario registrado
- requiredRoles: roles necesarios (vacío si es público)

INTENCIONES DISPONIBLES:

1. "registrar_asistencia" - Usuario envía código QR (formato JA-XXXXXXXX)
   - entities: { codigoQR: "JA-..." }
   - requiresAuth: false

2. "registrar_asistencia_manual" - Admin/Líder registra asistencia de OTRA persona
   - entities: { codigoQR: "JA-...", nombreUsuario?: "...", telefonoUsuario?: "..." }
   - Ejemplos: "registrar asistencia de Juan en JA-XXXX", "registrar a María Pérez en JA-XXXX", "asistencia de 987654321 en JA-XXXX"
   - Patrón: "registrar asistencia de [nombre/telefono] en [codigoQR]" o "registrar a [nombre] en [codigoQR]"
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

3. "crear_usuario" - Crear nuevo usuario (SOLO ADMIN)
   - entities: { nombre, telefono, codigoPais? }
   - Ejemplos: "registrar a Juan 999888777", "crear usuario María +51987654321"
   - requiresAuth: true, requiredRoles: ["admin"]

4. "buscar_usuario" - Buscar usuario existente
   - entities: { busqueda }
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

5. "crear_programa" - Crear programa para una fecha (ADMIN/LIDER)
   - entities: { fecha }
   - Ejemplos: "crear programa para el sábado", "programa del 25/01"
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

6. "ver_programa" - Ver programa existente
   - entities: { fecha?, codigo? }
   - Se puede buscar por fecha O por código único (formato: XXX-XXXXXX, ej: PMA-kEVHD8)
   - Ejemplos: "ver programa", "ver programa del sábado", "programa del 25/01", "ver programa PMA-kEVHD8", "PMA-kEVHD8"
   - requiresAuth: true, requiredRoles: ["admin", "lider", "participante"]

7. "asignar_parte" - Asignar parte del programa a un usuario (ADMIN/LIDER)
   - entities: { parte, usuario, codigo? }
   - Ejemplos: "asignar bienvenida a María", "asignar oración a Juan en PMA-kEVHD8"
   - Patrón: "asignar [parte] a [usuario]" o "asignar [parte] a [usuario] en [codigo]"
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

8. "enviar_programa" - Enviar programa a participantes (ADMIN/LIDER)
   - entities: { fecha? }
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

9. "editar_programa_texto" - Usuario envía programa completo en texto para crear/actualizar
   - Detectar cuando el mensaje tiene múltiples líneas con formato "Parte: Nombres"
   - Ejemplos: Mensaje largo tipo "Programa 21/01/2026\nBienvenida: María\nOración: Juan..."
   - Contiene fecha y lista de partes con asignaciones
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

10. "ayuda" - Mostrar comandos disponibles
    - requiresAuth: false

11. "saludo" - Saludo genérico
    - requiresAuth: false

12. "desconocido" - No se puede determinar la intención
    - Cuando el mensaje no coincide con ninguna intención

FECHAS: Si detectas fechas relativas como "sábado", "este sábado", "próximo sábado", extrae como entidad.

Responde SOLO con JSON válido.`;

@Injectable()
export class OpenAIService {
    private readonly logger = new Logger(OpenAIService.name);
    private readonly openai: OpenAI;
    private readonly enabled: boolean;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        this.enabled = !!apiKey;

        if (this.enabled) {
            this.openai = new OpenAI({ apiKey });
            this.logger.log('OpenAI service initialized');
        } else {
            this.logger.warn('OpenAI API key not configured - using fallback classification');
        }
    }

    /**
     * Clasificar la intención del mensaje usando OpenAI
     */
    async classifyIntent(message: string, context?: any): Promise<IntentResult> {
        // Detectar registro manual de asistencia ANTES de detectar solo el QR
        // Patrón: "registrar asistencia de Juan en JA-XXX" o "registrar a María en JA-XXX"
        const registrarManualMatch = message.match(/registrar\s+(?:asistencia\s+de\s+)?(.+?)\s+en\s+(JA-[A-Z0-9]{8})/i);
        if (registrarManualMatch) {
            return {
                intent: 'registrar_asistencia_manual',
                entities: {
                    nombreUsuario: registrarManualMatch[1].trim(),
                    codigoQR: registrarManualMatch[2].toUpperCase(),
                },
                confidence: 1.0,
                requiresAuth: true,
                requiredRoles: ['admin', 'lider'],
            };
        }

        // Detectar código QR sin AI (registro personal)
        const qrMatch = message.match(/JA-[A-Z0-9]{8}/i);
        if (qrMatch) {
            return {
                intent: 'registrar_asistencia',
                entities: { codigoQR: qrMatch[0].toUpperCase() },
                confidence: 1.0,
                requiresAuth: false,
                requiredRoles: [],
            };
        }

        // Detectar "editar programa CODIGO" explícito (formato preferido)
        const editarProgramaMatch = message.match(/^editar\s+programa\s+([A-Z]{2,3}-[A-Za-z0-9]{6})/im);
        if (editarProgramaMatch) {
            return {
                intent: 'editar_programa_texto',
                entities: { codigo: editarProgramaMatch[1] },
                confidence: 1.0,
                requiresAuth: true,
                requiredRoles: ['admin', 'lider'],
            };
        }

        // Detectar programa completo para editar (múltiples líneas con formato "Parte: Nombre")
        // Esto debe verificarse ANTES de detectar solo el código para ver_programa
        const lineas = message.split('\n').filter(l => l.trim().length > 0);
        if (lineas.length >= 3) {
            // Verificar si al menos 2 líneas tienen formato "Parte: Nombre"
            const lineasConFormato = lineas.filter(l => /^[^•\-\*].+?:\s*.+/.test(l.trim()));
            if (lineasConFormato.length >= 2) {
                return {
                    intent: 'editar_programa_texto',
                    entities: {},
                    confidence: 0.95,
                    requiresAuth: true,
                    requiredRoles: ['admin', 'lider'],
                };
            }
        }

        // Detectar código de programa sin AI (ej: PMA-kEVHD8) - solo si NO es edición
        const codigoMatch = message.match(/([A-Z]{2,3}-[A-Za-z0-9]{6})/i);
        if (codigoMatch) {
            return {
                intent: 'ver_programa',
                entities: { codigo: codigoMatch[1] },
                confidence: 1.0,
                requiresAuth: true,
                requiredRoles: ['admin', 'lider', 'participante'],
            };
        }

        if (!this.enabled) {
            return this.fallbackClassification(message);
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: INTENT_CLASSIFICATION_PROMPT },
                    { role: 'user', content: message }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 500,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const result = JSON.parse(content);
            this.logger.debug(`Intent classified: ${result.intent} (${result.confidence})`);

            return {
                intent: result.intent || 'desconocido',
                entities: result.entities || {},
                confidence: result.confidence || 0.5,
                requiresAuth: result.requiresAuth || false,
                requiredRoles: result.requiredRoles || [],
            };
        } catch (error) {
            this.logger.error(`Error classifying intent: ${error.message}`);
            return this.fallbackClassification(message);
        }
    }

    /**
     * Clasificación básica sin AI
     */
    private fallbackClassification(message: string): IntentResult {
        const lowerMsg = message.toLowerCase().trim();

        // Patrones básicos
        if (/hola|buenos?\s*(d[ií]as?|tardes?|noches?)/i.test(lowerMsg)) {
            return { intent: 'saludo', entities: {}, confidence: 0.8, requiresAuth: false, requiredRoles: [] };
        }

        if (/ayuda|help|comandos|menu|menú/i.test(lowerMsg)) {
            return { intent: 'ayuda', entities: {}, confidence: 0.8, requiresAuth: false, requiredRoles: [] };
        }

        if (/crear\s*(programa|session)/i.test(lowerMsg)) {
            return { intent: 'crear_programa', entities: {}, confidence: 0.7, requiresAuth: true, requiredRoles: ['admin', 'lider'] };
        }

        if (/enviar\s*programa/i.test(lowerMsg)) {
            return { intent: 'enviar_programa', entities: {}, confidence: 0.7, requiresAuth: true, requiredRoles: ['admin', 'lider'] };
        }

        // Asignar parte a usuario: "asignar bienvenida a Liz"
        const asignarMatch = lowerMsg.match(/asignar\s+(.+?)\s+a\s+(.+)/i);
        if (asignarMatch) {
            return {
                intent: 'asignar_parte',
                entities: { parte: asignarMatch[1].trim(), usuario: asignarMatch[2].trim() },
                confidence: 0.8,
                requiresAuth: true,
                requiredRoles: ['admin', 'lider']
            };
        }

        // Registrar asistencia manual: "registrar asistencia de Juan en JA-XXX" o "registrar a María en JA-XXX"
        const registrarManualMatch = message.match(/registrar\s+(?:asistencia\s+de\s+)?(.+?)\s+en\s+(JA-[A-Z0-9]{8})/i);
        if (registrarManualMatch) {
            return {
                intent: 'registrar_asistencia_manual',
                entities: {
                    nombreUsuario: registrarManualMatch[1].trim(),
                    codigoQR: registrarManualMatch[2].toUpperCase(),
                },
                confidence: 0.9,
                requiresAuth: true,
                requiredRoles: ['admin', 'lider'],
            };
        }

        if (/registrar\s*(a|usuario)|crear\s*usuario/i.test(lowerMsg)) {
            return { intent: 'crear_usuario', entities: {}, confidence: 0.7, requiresAuth: true, requiredRoles: ['admin'] };
        }

        // Detectar código de programa (ej: PMA-kEVHD8)
        if (/[A-Z]{2,3}-[A-Za-z0-9]{6}/i.test(message)) {
            return { intent: 'ver_programa', entities: {}, confidence: 0.8, requiresAuth: true, requiredRoles: ['admin', 'lider', 'participante'] };
        }

        if (/ver\s+programa|programa\s+del/i.test(lowerMsg)) {
            return { intent: 'ver_programa', entities: {}, confidence: 0.7, requiresAuth: true, requiredRoles: ['admin', 'lider', 'participante'] };
        }

        // Detectar programa completo en texto (múltiples líneas con formato "Parte: Nombres")
        const lineas = message.split('\n').filter(l => l.trim().length > 0);
        if (lineas.length >= 3) {
            // Verificar si al menos 2 líneas tienen formato "Parte: Nombre"
            const lineasConFormato = lineas.filter(l => /^.+?[:/]\s*.+/.test(l.trim()));
            if (lineasConFormato.length >= 2) {
                return {
                    intent: 'editar_programa_texto',
                    entities: {},
                    confidence: 0.9,
                    requiresAuth: true,
                    requiredRoles: ['admin', 'lider']
                };
            }
        }

        return { intent: 'desconocido', entities: {}, confidence: 0.3, requiresAuth: false, requiredRoles: [] };
    }

    /**
     * Generar respuesta conversacional
     */
    async generateResponse(prompt: string, context?: string): Promise<string> {
        if (!this.enabled) {
            return prompt; // Sin AI, devolver el prompt como está
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un asistente amigable de la Iglesia Adventista. Responde de forma breve y amable. ${context || ''}`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 200,
            });

            return response.choices[0]?.message?.content || prompt;
        } catch (error) {
            this.logger.error(`Error generating response: ${error.message}`);
            return prompt;
        }
    }
}
