import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappBotService } from '../whatsapp-bot.service';
import { ProgramasService } from '../../programas/programas.service';
import { ConversationContext, IntentResult } from '../dto';

@Injectable()
export class ProgramasHandler {
  private readonly logger = new Logger(ProgramasHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsappBotService,
    private readonly programasService: ProgramasService,
  ) {}

  /**
   * Manejar intenciones relacionadas con programas
   */
  async handle(
    context: ConversationContext,
    intent: IntentResult,
    message: string,
  ): Promise<void> {
    switch (intent.intent) {
      case 'crear_programa':
        await this.crearPrograma(context, intent.entities, message);
        break;
      case 'ver_programa':
        await this.verPrograma(context, intent.entities, message);
        break;
      case 'asignar_parte':
        await this.asignarParte(context, intent.entities, message);
        break;
      case 'editar_programa_texto':
        await this.editarProgramaDesdeTexto(context, message);
        break;
      default:
        await this.whatsappService.sendMessage(context.conversationId, {
          content: '❓ Acción de programas no reconocida.',
        });
    }
  }

  /**
   * Crear nuevo programa
   */
  private async crearPrograma(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    // Determinar fecha
    const fecha = this.parseFecha(entities.fecha || message);

    if (!fecha) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Por favor especifica la fecha del programa.\n\nEjemplo: "crear programa para el 25/01" o "crear programa para mañana"',
      });
      return;
    }

    const fechaStr = fecha.toISOString().split('T')[0];

    try {
      // Verificar si ya existen programas para esa fecha
      const existentes = await this.prisma.programa.findMany({
        where: { fecha },
      });

      if (existentes.length > 0) {
        const listaExistentes = existentes
          .map((p) => `• ${p.codigo} - ${p.titulo}`)
          .join('\n');
        await this.whatsappService.sendMessage(context.conversationId, {
          content: `⚠️ Ya existen ${existentes.length} programa(s) para el ${this.formatFecha(fecha)}:\n\n${listaExistentes}\n\n¿Deseas crear otro? Escribe "crear programa para el ${this.formatFecha(fecha)}" de nuevo para confirmar.`,
        });
        return;
      }

      // Obtener partes obligatorias
      const partesObligatorias =
        await this.programasService.getPartesObligatorias();

      // Crear programa
      const programa = await this.programasService.create(
        {
          fecha: fechaStr,
          titulo: 'Programa Maranatha Adoración',
          partes: partesObligatorias.map((p, i) => ({
            parteId: p.id,
            orden: i + 1,
          })),
        },
        context.usuarioId!,
      );

      let respuesta = `✅ *Programa creado*\n\n`;
      respuesta += `🔖 *Código:* ${programa.codigo}\n`;
      respuesta += `📅 *Fecha:* ${this.formatFecha(fecha)}\n`;
      respuesta += `📋 *Título:* ${programa.titulo}\n`;
      respuesta += `📝 *Partes:* ${partesObligatorias.length}\n\n`;
      respuesta += `Para asignar participantes, escribe:\n`;
      respuesta += `"Asignar [parte] a [nombre] en ${programa.codigo}"`;

      await this.whatsappService.sendMessage(context.conversationId, {
        content: respuesta,
      });
    } catch (error) {
      this.logger.error(`Error creando programa: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al crear el programa.',
      });
    }
  }

  /**
   * Ver programa existente (por código o fecha)
   */
  private async verPrograma(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    // Primero intentar buscar por código (formato: XXXXXXXXX sin guión, debe tener al menos un dígito)
    const codigoMatch = message.match(
      /([A-Z]{2,3}(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6})/i,
    );
    let fecha = this.parseFecha(entities.fecha || message);
    let programa;

    try {
      // Buscar por código si se detecta
      if (codigoMatch) {
        const codigo = codigoMatch[1];
        programa = await this.programasService.findByCodigo(codigo);

        if (!programa) {
          await this.whatsappService.sendMessage(context.conversationId, {
            content: `📭 No encontré el programa con código *${codigo}*.\n\nVerifica el código o escribe "ver programa del [fecha]"`,
          });
          return;
        }

        fecha = this.parseLocalDate(programa.fecha);
      } else if (fecha) {
        // Buscar todos los programas de esa fecha
        const programas = await this.prisma.programa.findMany({
          where: { fecha },
          orderBy: { createdAt: 'asc' },
          include: {
            partes: {
              include: { parte: true },
              orderBy: { orden: 'asc' },
            },
            asignaciones: {
              include: {
                parte: true,
                usuario: { select: { id: true, nombre: true } },
              },
              orderBy: { orden: 'asc' },
            },
            links: {
              include: { parte: true },
              orderBy: { orden: 'asc' },
            },
          },
        });

        if (programas.length === 0) {
          await this.whatsappService.sendMessage(context.conversationId, {
            content: `📭 No hay programas para el ${this.formatFecha(fecha)}.\n\n¿Deseas crear uno? Escribe "crear programa para el ${this.formatFecha(fecha)}"`,
          });
          return;
        }

        if (programas.length > 1) {
          // Múltiples programas: listar para que el usuario elija
          let lista = `📋 *Encontré ${programas.length} programas para el ${this.formatFecha(fecha)}:*\n\n`;
          for (const p of programas) {
            const hora = p.horaInicio
              ? ` (${this.formatTime(p.horaInicio)})`
              : '';
            lista += `• *${p.codigo}* - ${p.titulo}${hora}\n`;
          }
          lista += `\nEscribe el código para ver detalles.\nEj: "ver ${programas[0].codigo}"`;

          await this.whatsappService.sendMessage(context.conversationId, {
            content: lista,
          });
          return;
        }

        programa = programas[0];
      } else {
        // Buscar el próximo programa
        programa = await this.programasService.getProximoPrograma();
        if (programa) {
          fecha = programa.fecha;
        }
      }

      if (!programa || !fecha) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content:
            '📭 No hay programas próximos.\n\n¿Deseas crear uno? Escribe "crear programa para el [fecha]"',
        });
        return;
      }

      let respuesta = `📋 *${programa.titulo}*\n`;
      respuesta += `🔖 Código: ${programa.codigo}\n`;
      respuesta += `📅 ${this.formatFecha(fecha)}\n`;
      respuesta += `📊 Estado: ${programa.estado}\n\n`;

      // Agrupar asignaciones y links por parte
      const asignacionesPorParte = new Map<number, any[]>();
      const linksPorParte = new Map<number, any[]>();

      for (const asig of programa.asignaciones) {
        if (!asignacionesPorParte.has(asig.parteId)) {
          asignacionesPorParte.set(asig.parteId, []);
        }
        asignacionesPorParte.get(asig.parteId)!.push(asig);
      }

      for (const link of programa.links || []) {
        if (!linksPorParte.has(link.parteId)) {
          linksPorParte.set(link.parteId, []);
        }
        linksPorParte.get(link.parteId)!.push(link);
      }

      for (const pp of programa.partes) {
        const asignaciones = asignacionesPorParte.get(pp.parteId) || [];
        const links = linksPorParte.get(pp.parteId) || [];
        const nombres = asignaciones
          .map((a) => a.usuario?.nombre || a.nombreLibre)
          .join(', ');

        if (pp.parte.esFija && pp.parte.textoFijo) {
          respuesta += `*${pp.parte.nombre}:* ${pp.parte.textoFijo}\n`;
        } else if (nombres) {
          respuesta += `*${pp.parte.nombre}:* ${nombres}\n`;
        } else {
          respuesta += `*${pp.parte.nombre}:* _(sin asignar)_\n`;
        }

        // Agregar links de esta parte
        for (const link of links) {
          respuesta += `• ${link.nombre}: ${link.url}\n`;
        }
      }

      await this.whatsappService.sendMessage(context.conversationId, {
        content: respuesta,
      });
    } catch (error) {
      this.logger.error(`Error viendo programa: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al obtener el programa.',
      });
    }
  }

  /**
   * Asignar parte a usuario
   */
  private async asignarParte(
    context: ConversationContext,
    entities: Record<string, any>,
    message: string,
  ): Promise<void> {
    const parteNombre = entities.parte as string;
    const usuarioNombre = entities.usuario as string;

    if (!parteNombre || !usuarioNombre) {
      await this.whatsappService.sendMessage(context.conversationId, {
        content:
          '⚠️ Usa el formato: "Asignar [parte] a [nombre]"\n\nEjemplo: "Asignar bienvenida a María"\nO con código: "Asignar bienvenida a María en PMA-X3kP9m"',
      });
      return;
    }

    try {
      // Buscar código de programa en el mensaje (formato sin guión)
      const codigoMatch = message.match(/([A-Z]{2,3}[A-Z0-9]{6})/i);
      let programa;

      if (codigoMatch) {
        // Buscar por código específico
        programa = await this.programasService.findByCodigo(codigoMatch[1]);
        if (!programa) {
          await this.whatsappService.sendMessage(context.conversationId, {
            content: `❌ No encontré el programa con código "${codigoMatch[1]}"`,
          });
          return;
        }
      } else {
        // Obtener el próximo programa
        programa = await this.programasService.getProximoPrograma();
      }

      if (!programa) {
        await this.whatsappService.sendMessage(context.conversationId, {
          content:
            '❌ No hay programas próximos.\n\nPrimero crea uno con "crear programa para el [fecha]"',
        });
        return;
      }

      const fecha = programa.fecha;

      // Buscar la parte por nombre (búsqueda flexible)
      const parteEncontrada = programa.partes.find(
        (pp) =>
          pp.parte.nombre.toLowerCase().includes(parteNombre.toLowerCase()) ||
          parteNombre.toLowerCase().includes(pp.parte.nombre.toLowerCase()),
      );

      if (!parteEncontrada) {
        const partesDisponibles = programa.partes
          .map((pp) => pp.parte.nombre)
          .join(', ');
        await this.whatsappService.sendMessage(context.conversationId, {
          content: `❌ No encontré la parte "${parteNombre}".\n\n📋 Partes disponibles:\n${partesDisponibles}`,
        });
        return;
      }

      // Usar el servicio con soporte para nombreLibre
      const resultado = await this.programasService.asignarPorNombre(
        programa.id,
        parteEncontrada.parteId,
        usuarioNombre,
      );

      // Construir mensaje con todas las asignaciones realizadas
      const asig = resultado.asignaciones[0];
      const indicadorUsuario = asig?.esUsuario ? '' : ' _(nombre libre)_';
      const mensajeAsignaciones = resultado.asignaciones
        .map((a) => `📌 ${a.parteNombre}`)
        .join('\n');

      await this.whatsappService.sendMessage(context.conversationId, {
        content: `✅ *¡Asignación realizada!*\n\n🔖 *Programa:* ${programa.codigo}\n👤 ${asig?.nombre}${indicadorUsuario}\n${mensajeAsignaciones}\n📅 ${this.formatFecha(fecha)}`,
      });
    } catch (error) {
      this.logger.error(`Error asignando parte: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al asignar. Intenta de nuevo.',
      });
    }
  }

  /**
   * Procesar programa completo desde texto
   */
  private async editarProgramaDesdeTexto(
    context: ConversationContext,
    message: string,
  ): Promise<void> {
    try {
      const resultado =
        await this.programasService.procesarProgramaConIA(message);

      let respuesta = `✅ *Programa procesado*\n\n`;
      respuesta += `🔖 *Código:* ${resultado.codigo}\n`;
      respuesta += `📅 Fecha: ${this.formatFecha(resultado.fecha)}\n`;
      respuesta += `📋 Partes actualizadas: ${resultado.partesActualizadas}\n`;
      respuesta += `👥 Asignaciones creadas: ${resultado.asignacionesCreadas}\n`;

      if (resultado.errores.length > 0) {
        respuesta += `\n⚠️ *Advertencias:*\n`;
        for (const error of resultado.errores.slice(0, 5)) {
          respuesta += `  • ${error}\n`;
        }
        if (resultado.errores.length > 5) {
          respuesta += `  ... y ${resultado.errores.length - 5} más\n`;
        }
      }

      await this.whatsappService.sendMessage(context.conversationId, {
        content: respuesta,
      });
    } catch (error) {
      this.logger.error(`Error procesando programa: ${error.message}`);
      await this.whatsappService.sendMessage(context.conversationId, {
        content: '❌ Error al procesar el programa. Verifica el formato.',
      });
    }
  }

  /**
   * Continuar flujo
   */
  async continueFlow(
    context: ConversationContext,
    message: string,
  ): Promise<void> {
    // Por ahora el módulo de programas no tiene flujo multi-paso
    await this.whatsappService.sendMessage(context.conversationId, {
      content: '❓ No hay una operación de programas pendiente.',
    });

    await this.prisma.conversacion.updateMany({
      where: { telefono: context.telefono },
      data: {
        estado: 'inicio',
        moduloActivo: null,
        contexto: {},
      },
    });
  }

  // === Helpers ===

  private parseFecha(texto: string): Date | null {
    if (!texto) return null;

    const lower = texto.toLowerCase();

    // "hoy"
    if (/\bhoy\b/i.test(lower)) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return hoy;
    }

    // "mañana"
    if (/ma[ñn]ana/i.test(lower)) {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setHours(0, 0, 0, 0);
      return manana;
    }

    // Fechas en formato dd/mm o dd/mm/yyyy
    const matchFecha = texto.match(
      /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
    );
    if (matchFecha) {
      const dia = parseInt(matchFecha[1], 10);
      const mes = parseInt(matchFecha[2], 10) - 1;
      let anio = matchFecha[3]
        ? parseInt(matchFecha[3], 10)
        : new Date().getFullYear();
      if (anio < 100) anio += 2000;

      const fecha = new Date(anio, mes, dia);
      fecha.setHours(0, 0, 0, 0);
      return fecha;
    }

    return null;
  }

  private formatFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private formatTime(time: Date | null): string | null {
    if (!time) return null;
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Parsea una fecha evitando problemas de zona horaria
   * Extrae YYYY-MM-DD y crea la fecha en zona horaria local
   */
  private parseLocalDate(fecha: string | Date): Date {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const [datePart] = fechaStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
