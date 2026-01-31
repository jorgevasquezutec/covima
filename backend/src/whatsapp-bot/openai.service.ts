import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IntentResult } from './dto';

export interface ParsedPrograma {
  fecha: string | null;
  titulo: string | null;
  partes: {
    nombre: string;
    asignaciones: string[];
    links?: { nombre: string; url: string }[];
  }[];
}

const INTENT_CLASSIFICATION_PROMPT = `Eres un asistente de clasificación de intenciones para un bot de WhatsApp de una iglesia.

Analiza el mensaje del usuario y devuelve un JSON con:
- intent: la intención detectada
- entities: entidades extraídas del mensaje
- confidence: 0.0 a 1.0
- requiresAuth: si necesita usuario registrado
- requiredRoles: roles necesarios (vacío si es público)

INTENCIONES DISPONIBLES:

1. "registrar_asistencia" - Usuario envía código QR (formato JAXXXXXXXX, 10 caracteres empezando con JA)
   - entities: { codigoQR: "JAXXXXXXXX" }
   - Formato: JA + 8 caracteres alfanuméricos (ej: JAABCD1234)
   - requiresAuth: false

2. "registrar_asistencia_manual" - Admin/Líder registra asistencia de OTRA persona
   - entities: { codigoQR: "JAXXXXXXXX", nombreUsuario?: "...", telefonoUsuario?: "..." }
   - Ejemplos: "registrar asistencia de Juan en JAABCD1234", "registrar a María Pérez en JAXYZ98765"
   - Patrón: "registrar asistencia de [nombre/telefono] en [codigoQR]" o "registrar a [nombre] en [codigoQR]"
   - OBLIGATORIO: DEBE contener código QR (empieza con JA, 10 caracteres total)
   - requiresAuth: true, requiredRoles: ["admin", "lider"]

3. "crear_usuario" - Crear nuevo usuario (SOLO ADMIN)
   - entities: { nombre, telefono, codigoPais? }
   - Ejemplos: "registrar a Juan 999888777", "crear usuario María +51987654321", "registrar a Esther Saucedo 900425478"
   - Patrón: "[registrar a|crear usuario] [nombre] [telefono]"
   - IMPORTANTE: Tiene teléfono pero NO tiene código QR (no contiene JAXXXXXXXX)
   - Si el mensaje tiene "registrar a [nombre] [telefono]" SIN código QR → es crear_usuario
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
   - Se puede buscar por fecha O por código único (formato: XXXXXXXXX, ej: PMAkEVHD8)
   - Ejemplos: "ver programa", "ver programa del sábado", "programa del 25/01", "ver programa PMAkEVHD8", "PMAkEVHD8"
   - requiresAuth: true, requiredRoles: ["admin", "lider", "participante"]

7. "asignar_parte" - Asignar parte del programa a un usuario (ADMIN/LIDER)
   - entities: { parte, usuario, codigo? }
   - Ejemplos: "asignar bienvenida a María", "asignar oración a Juan en PMAkEVHD8"
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
      this.logger.warn(
        'OpenAI API key not configured - using fallback classification',
      );
    }
  }

  /**
   * Clasificar la intención del mensaje usando OpenAI
   */
  async classifyIntent(message: string, context?: any): Promise<IntentResult> {
    // Detectar registro manual de asistencia ANTES de detectar solo el QR
    // Patrón: "registrar asistencia de Juan en JAXXXXXXXX" o "registrar a María en JAXXXXXXXX"
    const registrarManualMatch = message.match(
      /registrar\s+(?:asistencia\s+de\s+)?(.+?)\s+en\s+(JA-?[A-Z0-9]{8})/i,
    );
    if (registrarManualMatch) {
      // Normalizar código (compatibilidad con formato antiguo con guión)
      const codigoNormalizado = registrarManualMatch[2]
        .toUpperCase()
        .replace('-', '');
      return {
        intent: 'registrar_asistencia_manual',
        entities: {
          nombreUsuario: registrarManualMatch[1].trim(),
          codigoQR: codigoNormalizado,
        },
        confidence: 1.0,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider'],
      };
    }

    // Detectar crear usuario: "registrar a [nombre] [telefono]" o "crear usuario [nombre] [telefono]"
    // IMPORTANTE: Esto debe ir ANTES de detectar QR porque no tiene código QR
    // Patrón: nombre + teléfono (9 dígitos o con código +51)
    const crearUsuarioMatch = message.match(
      /(?:registrar\s+a|crear\s+usuario)\s+(.+?)\s+(\+?\d{2,3})?(\d{9})$/i,
    );
    if (crearUsuarioMatch) {
      const nombre = crearUsuarioMatch[1].trim();
      const codigoPais = crearUsuarioMatch[2]?.replace('+', '') || '51';
      const telefono = crearUsuarioMatch[3];
      return {
        intent: 'crear_usuario',
        entities: {
          nombre,
          telefono,
          codigoPais,
        },
        confidence: 1.0,
        requiresAuth: true,
        requiredRoles: ['admin'],
      };
    }

    // Detectar código QR sin AI (registro personal)
    // Formato: JAXXXXXXXX (10 caracteres)
    const qrMatch = message.match(/JA-?[A-Z0-9]{8}/i);
    if (qrMatch) {
      // Normalizar código (compatibilidad con formato antiguo con guión)
      const codigoNormalizado = qrMatch[0].toUpperCase().replace('-', '');
      return {
        intent: 'registrar_asistencia',
        entities: { codigoQR: codigoNormalizado },
        confidence: 1.0,
        requiresAuth: false,
        requiredRoles: [],
      };
    }

    // Detectar "editar programa CODIGO" explícito (formato preferido)
    // Formato: 2-3 letras + 6 caracteres alfanuméricos con al menos un dígito (ej: PMAkEVHD8)
    const editarProgramaMatch = message.match(
      /^editar\s+programa\s+([A-Z]{2,3}(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6})/im,
    );
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
    const lineas = message.split('\n').filter((l) => l.trim().length > 0);
    if (lineas.length >= 3) {
      // Verificar si al menos 2 líneas tienen formato "Parte: Nombre"
      const lineasConFormato = lineas.filter((l) =>
        /^[^•\-\*].+?:\s*.+/.test(l.trim()),
      );
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

    // Detectar código de programa sin AI (ej: PMAkEVHD8) - solo si NO es edición
    // Formato: 2-3 letras + 6 caracteres alfanuméricos (debe contener al menos un dígito para no confundir con palabras)
    const codigoMatch = message.match(
      /([A-Z]{2,3}(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6})/i,
    );
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
          { role: 'user', content: message },
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
      this.logger.debug(
        `Intent classified: ${result.intent} (${result.confidence})`,
      );

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
      return {
        intent: 'saludo',
        entities: {},
        confidence: 0.8,
        requiresAuth: false,
        requiredRoles: [],
      };
    }

    if (/ayuda|help|comandos|menu|menú/i.test(lowerMsg)) {
      return {
        intent: 'ayuda',
        entities: {},
        confidence: 0.8,
        requiresAuth: false,
        requiredRoles: [],
      };
    }

    if (/crear\s*(programa|session)/i.test(lowerMsg)) {
      return {
        intent: 'crear_programa',
        entities: {},
        confidence: 0.7,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider'],
      };
    }

    if (/enviar\s*programa/i.test(lowerMsg)) {
      return {
        intent: 'enviar_programa',
        entities: {},
        confidence: 0.7,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider'],
      };
    }

    // Asignar parte a usuario: "asignar bienvenida a Liz"
    const asignarMatch = lowerMsg.match(/asignar\s+(.+?)\s+a\s+(.+)/i);
    if (asignarMatch) {
      return {
        intent: 'asignar_parte',
        entities: {
          parte: asignarMatch[1].trim(),
          usuario: asignarMatch[2].trim(),
        },
        confidence: 0.8,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider'],
      };
    }

    // Registrar asistencia manual: "registrar asistencia de Juan en JAXXXXXXXX"
    const registrarManualMatchFallback = message.match(
      /registrar\s+(?:asistencia\s+de\s+)?(.+?)\s+en\s+(JA-?[A-Z0-9]{8})/i,
    );
    if (registrarManualMatchFallback) {
      // Normalizar código (compatibilidad con formato antiguo con guión)
      const codigoNormalizado = registrarManualMatchFallback[2]
        .toUpperCase()
        .replace('-', '');
      return {
        intent: 'registrar_asistencia_manual',
        entities: {
          nombreUsuario: registrarManualMatchFallback[1].trim(),
          codigoQR: codigoNormalizado,
        },
        confidence: 0.9,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider'],
      };
    }

    // Crear usuario: "registrar a [nombre] [telefono]" o "crear usuario [nombre] [telefono]"
    const crearUsuarioMatch = message.match(
      /(?:registrar\s+a|crear\s+usuario)\s+(.+?)\s+(\+?\d{2,3})?(\d{9})$/i,
    );
    if (crearUsuarioMatch) {
      const nombre = crearUsuarioMatch[1].trim();
      const codigoPais = crearUsuarioMatch[2]?.replace('+', '') || '51';
      const telefono = crearUsuarioMatch[3];
      return {
        intent: 'crear_usuario',
        entities: {
          nombre,
          telefono,
          codigoPais,
        },
        confidence: 0.9,
        requiresAuth: true,
        requiredRoles: ['admin'],
      };
    }

    // Fallback genérico para crear usuario (sin extraer entidades)
    if (/crear\s*usuario/i.test(lowerMsg)) {
      return {
        intent: 'crear_usuario',
        entities: {},
        confidence: 0.7,
        requiresAuth: true,
        requiredRoles: ['admin'],
      };
    }

    // Detectar código de programa (ej: PMAkEVHD8) - debe contener al menos un dígito
    if (/[A-Z]{2,3}(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6}/i.test(message)) {
      return {
        intent: 'ver_programa',
        entities: {},
        confidence: 0.8,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider', 'participante'],
      };
    }

    if (/ver\s+programa|programa\s+del/i.test(lowerMsg)) {
      return {
        intent: 'ver_programa',
        entities: {},
        confidence: 0.7,
        requiresAuth: true,
        requiredRoles: ['admin', 'lider', 'participante'],
      };
    }

    // Detectar programa completo en texto (múltiples líneas con formato "Parte: Nombres")
    const lineas = message.split('\n').filter((l) => l.trim().length > 0);
    if (lineas.length >= 3) {
      // Verificar si al menos 2 líneas tienen formato "Parte: Nombre"
      const lineasConFormato = lineas.filter((l) =>
        /^.+?[:/]\s*.+/.test(l.trim()),
      );
      if (lineasConFormato.length >= 2) {
        return {
          intent: 'editar_programa_texto',
          entities: {},
          confidence: 0.9,
          requiresAuth: true,
          requiredRoles: ['admin', 'lider'],
        };
      }
    }

    return {
      intent: 'desconocido',
      entities: {},
      confidence: 0.3,
      requiresAuth: false,
      requiredRoles: [],
    };
  }

  /**
   * Parsear un programa desde texto usando IA
   * Extrae fecha, título y partes con asignaciones de manera inteligente
   */
  async parsePrograma(
    mensaje: string,
    partesDisponibles: string[],
  ): Promise<ParsedPrograma> {
    const prompt = `Analiza el siguiente mensaje y extrae la información del programa de iglesia.

PARTES DISPONIBLES EN EL SISTEMA (usa estos nombres exactos):
${partesDisponibles.map((p) => `- ${p}`).join('\n')}

ALIAS DE PARTES (mapea estos nombres a la parte correcta):
- "Dirección" o "Dirigir" → "Bienvenida"
- "Alabanzas" o "Cantos" o "Música" → "Espacio de Cantos"
- "Oración" (sola) → "Oración Inicial"
- "Intercesión" → "Oración Intercesora"
- "Mensaje" o "Predicación" o "Palabra" → "Tema"
- "Himnos" → "Himno Final"

REGLAS:
1. Extrae la fecha si está presente (puede ser "31 de enero", "25/01", "sábado 25", etc.)
2. Extrae el título si lo hay (ej: "Programa JA", "Programa Maranatha", "Culto Joven")
3. Para cada línea que tenga formato "Parte: Nombres", extrae la parte y los nombres asignados
4. Los nombres pueden estar separados por comas, "y", guiones o espacios
5. Si una parte tiene múltiples personas, devuélvelas como array
6. IMPORTANTE: Extrae los links (YouTube, Kahoot, etc.) y asócialos a la parte correspondiente
   - Los links suelen estar en líneas con bullets (•, -, *) después de una parte
   - Extrae el nombre del link (texto antes de la URL) y la URL completa
   - Asocia los links a la parte que los precede (ej: links después de "Alabanzas" van con "Espacio de Cantos")
7. IMPORTANTE: Usa los ALIAS para convertir nombres de partes a los nombres del SISTEMA
8. Si no encuentras una parte en el sistema ni en los alias, usa el nombre tal cual

MENSAJE:
${mensaje}

Responde SOLO con JSON válido en este formato:
{
  "fecha": "31 de enero de 2026" o null,
  "titulo": "Programa JA" o null,
  "partes": [
    { "nombre": "Bienvenida", "asignaciones": ["Jorge", "Miguel"], "links": [] },
    { "nombre": "Espacio de Cantos", "asignaciones": ["José Olivera", "Esther Saucedo"], "links": [
      { "nombre": "El mejor lugar del mundo", "url": "https://www.youtube.com/watch?v=MkCN3NzDhIc" },
      { "nombre": "Oh buen Maestro despierta", "url": "https://www.youtube.com/watch?v=QWlOUXfkIE4" }
    ] }
  ]
}`;

    if (!this.enabled) {
      return this.fallbackParsePrograma(mensaje);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Eres un parser de programas de iglesia. Extrae información estructurada del texto.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(content);
      this.logger.debug(`Programa parseado: ${JSON.stringify(result)}`);

      return {
        fecha: result.fecha || null,
        titulo: result.titulo || null,
        partes: result.partes || [],
      };
    } catch (error) {
      this.logger.error(`Error parsing programa: ${error.message}`);
      return this.fallbackParsePrograma(mensaje);
    }
  }

  /**
   * Matchear nombres de usuarios del mensaje con usuarios de la BD
   * Devuelve un mapa de nombre_mensaje -> id_usuario (o null si no encontró)
   */
  async matchUsuarios(
    nombresDelMensaje: string[],
    usuariosDisponibles: { id: number; nombre: string }[],
  ): Promise<Map<string, number | null>> {
    const resultado = new Map<string, number | null>();

    if (nombresDelMensaje.length === 0) {
      return resultado;
    }

    const prompt = `Tienes una lista de nombres escritos en un mensaje y una lista de usuarios registrados en el sistema.
Tu tarea es encontrar el mejor match para cada nombre del mensaje.

USUARIOS REGISTRADOS EN EL SISTEMA:
${usuariosDisponibles.map((u) => `- ID ${u.id}: "${u.nombre}"`).join('\n')}

NOMBRES DEL MENSAJE A MATCHEAR:
${nombresDelMensaje.map((n) => `- "${n}"`).join('\n')}

REGLAS:
1. Busca coincidencias por nombre completo, nombre parcial, o apodos comunes
2. "Angela" puede matchear con "Anyela" (variación ortográfica)
3. "Rubi" puede matchear con "Rubí" (acentos)
4. Un nombre como "Jorge" debe matchear con "Jorge Vasquez"
5. Si no hay ninguna coincidencia razonable, devuelve null para ese nombre
6. No fuerces matches si los nombres son muy diferentes

Responde SOLO con JSON válido en este formato:
{
  "matches": {
    "nombre_del_mensaje": id_usuario_o_null,
    "Jorge": 1,
    "Angela": 7,
    "Persona Desconocida": null
  }
}`;

    if (!this.enabled) {
      // Fallback: búsqueda simple por contains
      for (const nombre of nombresDelMensaje) {
        const nombreLower = nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const match = usuariosDisponibles.find((u) => {
          const usuarioLower = u.nombre
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return (
            usuarioLower.includes(nombreLower) ||
            nombreLower.includes(usuarioLower.split(' ')[0])
          );
        });
        resultado.set(nombre, match?.id || null);
      }
      return resultado;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Eres un sistema de matching de nombres. Encuentra correspondencias entre nombres escritos informalmente y nombres registrados en una base de datos.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      this.logger.debug(`Usuarios matcheados: ${JSON.stringify(parsed)}`);

      if (parsed.matches) {
        for (const [nombre, id] of Object.entries(parsed.matches)) {
          resultado.set(nombre, id as number | null);
        }
      }

      return resultado;
    } catch (error) {
      this.logger.error(`Error matching usuarios: ${error.message}`);
      // Fallback
      for (const nombre of nombresDelMensaje) {
        resultado.set(nombre, null);
      }
      return resultado;
    }
  }

  /**
   * Parsing básico de programa sin IA (fallback)
   */
  private fallbackParsePrograma(mensaje: string): ParsedPrograma {
    const lineas = mensaje.split('\n').filter((l) => l.trim().length > 0);
    const partes: { nombre: string; asignaciones: string[] }[] = [];
    let fecha: string | null = null;
    let titulo: string | null = null;

    for (const linea of lineas) {
      // Detectar fecha en formato dd/mm o "dd de mes"
      const fechaMatch =
        linea.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/) ||
        linea.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/i);
      if (fechaMatch && !fecha) {
        fecha = fechaMatch[0];
      }

      // Detectar título (primera línea con "Programa")
      if (/programa/i.test(linea) && !titulo) {
        titulo = linea.trim();
        continue;
      }

      // Detectar formato "Parte: Nombres"
      const match = linea.match(/^(.+?):\s*(.+)$/);
      if (match) {
        const nombreParte = match[1].trim();
        const contenido = match[2].trim();

        // Ignorar si es URL o link
        if (/https?:\/\/|youtube|kahoot/i.test(contenido)) {
          continue;
        }

        // Separar nombres por coma, "y", o guión
        const nombres = contenido
          .split(/[,\-]|\s+y\s+/i)
          .map((n) => n.trim())
          .filter((n) => n.length > 0 && !/^https?:\/\//.test(n));

        if (nombres.length > 0) {
          partes.push({ nombre: nombreParte, asignaciones: nombres });
        }
      }
    }

    return { fecha, titulo, partes };
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
            content: `Eres un asistente amigable de la Iglesia Adventista. Responde de forma breve y amable. ${context || ''}`,
          },
          { role: 'user', content: prompt },
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
