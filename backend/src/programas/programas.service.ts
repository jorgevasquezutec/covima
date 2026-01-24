import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramaDto, UpdateProgramaDto } from './dto';
import { WhatsappBotService } from '../whatsapp-bot/whatsapp-bot.service';
import { nanoid } from 'nanoid';

@Injectable()
export class ProgramasService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappBotService))
    private whatsappService: WhatsappBotService,
  ) { }

  /**
   * Genera un código único para el programa
   * Formato: INICIALES-XXXXXX (ej: MA-X3kP9m)
   */
  private generarCodigo(titulo: string): string {
    // Extraer iniciales del título (máximo 3 letras)
    const palabras = titulo.split(/\s+/).filter(p => p.length > 0);
    let iniciales = '';

    if (palabras.length === 1) {
      // Si es una sola palabra, tomar las primeras 2-3 letras
      iniciales = palabras[0].substring(0, 3).toUpperCase();
    } else {
      // Tomar la primera letra de cada palabra (máximo 3)
      iniciales = palabras
        .slice(0, 3)
        .map(p => p.charAt(0).toUpperCase())
        .join('');
    }

    // Si no hay iniciales válidas, usar 'PRG'
    if (!iniciales || iniciales.length < 2) {
      iniciales = 'PRG';
    }

    // Generar nanoid de 6 caracteres
    const uniqueId = nanoid(6);

    return `${iniciales}-${uniqueId}`;
  }

  async findAll(options?: { page?: number; limit?: number; estado?: string }) {
    const { page = 1, limit = 10, estado } = options || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (estado) {
      where.estado = estado;
    }

    const [programas, total] = await Promise.all([
      this.prisma.programa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          creador: { select: { id: true, nombre: true } },
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
      }),
      this.prisma.programa.count({ where }),
    ]);

    return {
      data: programas.map((p) => this.formatPrograma(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const programa = await this.prisma.programa.findUnique({
      where: { id },
      include: {
        creador: { select: { id: true, nombre: true } },
        partes: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            parte: true,
            usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
          },
          orderBy: { orden: 'asc' },
        },
        links: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }

    return this.formatPrograma(programa);
  }

  async create(dto: CreateProgramaDto, createdBy: number) {
    const titulo = dto.titulo || 'Programa Maranatha Adoración';

    // Generar código único
    const codigo = this.generarCodigo(titulo);

    // Parsear horas si vienen en el DTO
    const horaInicio = dto.horaInicio ? this.parseTime(dto.horaInicio) : null;
    const horaFin = dto.horaFin ? this.parseTime(dto.horaFin) : null;

    // Crear programa (ya no hay restricción de fecha única)
    const programa = await this.prisma.programa.create({
      data: {
        codigo,
        fecha: new Date(dto.fecha),
        horaInicio,
        horaFin,
        titulo,
        creadoPor: createdBy,
      },
    });

    // Agregar partes del programa con su orden
    if (dto.partes && dto.partes.length > 0) {
      for (const parte of dto.partes) {
        await this.prisma.programaParte.create({
          data: {
            programaId: programa.id,
            parteId: parte.parteId,
            orden: parte.orden,
          },
        });
      }
    }

    // Agregar asignaciones si se proporcionan
    if (dto.asignaciones && dto.asignaciones.length > 0) {
      for (const asig of dto.asignaciones) {
        let orden = 1;
        // Procesar usuarios registrados
        if (asig.usuarioIds && asig.usuarioIds.length > 0) {
          for (const usuarioId of asig.usuarioIds) {
            await this.prisma.programaAsignacion.create({
              data: {
                programaId: programa.id,
                parteId: asig.parteId,
                usuarioId,
                orden: orden++,
              },
            });
          }
        }
        // Procesar nombres libres (usuarios no registrados)
        if (asig.nombresLibres && asig.nombresLibres.length > 0) {
          for (const nombreLibre of asig.nombresLibres) {
            await this.prisma.programaAsignacion.create({
              data: {
                programaId: programa.id,
                parteId: asig.parteId,
                nombreLibre,
                orden: orden++,
              },
            });
          }
        }
      }
    }

    // Agregar links si se proporcionan
    if (dto.links && dto.links.length > 0) {
      let orden = 1;
      let currentParteId = dto.links[0]?.parteId;

      for (const link of dto.links) {
        if (link.parteId !== currentParteId) {
          orden = 1;
          currentParteId = link.parteId;
        }
        await this.prisma.programaLink.create({
          data: {
            programaId: programa.id,
            parteId: link.parteId,
            nombre: link.nombre,
            url: link.url,
            orden: orden++,
          },
        });
      }
    }

    return this.findOne(programa.id);
  }

  async update(id: number, dto: UpdateProgramaDto) {
    const programa = await this.prisma.programa.findUnique({ where: { id } });

    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }

    // Actualizar datos básicos
    await this.prisma.programa.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        estado: dto.estado,
        ...(dto.fecha && { fecha: new Date(dto.fecha) }),
        ...(dto.horaInicio !== undefined && { horaInicio: dto.horaInicio ? this.parseTime(dto.horaInicio) : null }),
        ...(dto.horaFin !== undefined && { horaFin: dto.horaFin ? this.parseTime(dto.horaFin) : null }),
      },
    });

    // Si se proporcionan partes, reemplazar las existentes
    if (dto.partes) {
      await this.prisma.programaParte.deleteMany({
        where: { programaId: id },
      });

      for (const parte of dto.partes) {
        await this.prisma.programaParte.create({
          data: {
            programaId: id,
            parteId: parte.parteId,
            orden: parte.orden,
          },
        });
      }
    }

    // Si se proporcionan asignaciones, reemplazar las existentes
    if (dto.asignaciones) {
      await this.prisma.programaAsignacion.deleteMany({
        where: { programaId: id },
      });

      for (const asig of dto.asignaciones) {
        let orden = 1;
        // Procesar usuarios registrados
        if (asig.usuarioIds && asig.usuarioIds.length > 0) {
          for (const usuarioId of asig.usuarioIds) {
            await this.prisma.programaAsignacion.create({
              data: {
                programaId: id,
                parteId: asig.parteId,
                usuarioId,
                orden: orden++,
              },
            });
          }
        }
        // Procesar nombres libres (usuarios no registrados)
        if (asig.nombresLibres && asig.nombresLibres.length > 0) {
          for (const nombreLibre of asig.nombresLibres) {
            await this.prisma.programaAsignacion.create({
              data: {
                programaId: id,
                parteId: asig.parteId,
                nombreLibre,
                orden: orden++,
              },
            });
          }
        }
      }
    }

    // Si se proporcionan links, reemplazar los existentes
    if (dto.links) {
      await this.prisma.programaLink.deleteMany({
        where: { programaId: id },
      });

      let orden = 1;
      let currentParteId = dto.links[0]?.parteId;

      for (const link of dto.links) {
        if (link.parteId !== currentParteId) {
          orden = 1;
          currentParteId = link.parteId;
        }
        await this.prisma.programaLink.create({
          data: {
            programaId: id,
            parteId: link.parteId,
            nombre: link.nombre,
            url: link.url,
            orden: orden++,
          },
        });
      }
    }

    return this.findOne(id);
  }

  async delete(id: number) {
    const programa = await this.prisma.programa.findUnique({ where: { id } });

    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }

    await this.prisma.programa.delete({ where: { id } });

    return { message: 'Programa eliminado' };
  }

  /**
   * Asignar una parte a un usuario con lógica automática:
   * - Si la parte es "bienvenida" y es la primera persona, auto-asignar a "oración inicial"
   * - Si la parte es "bienvenida" y es la segunda persona, auto-asignar a "oración final"
   * - Si la parte es "espacio de cantos", auto-asignar a "himno final"
   */
  async asignarParteConAuto(programaId: number, parteId: number, usuarioId: number): Promise<{
    asignaciones: { parteNombre: string; usuarioId: number }[];
  }> {
    const asignacionesCreadas: { parteNombre: string; usuarioId: number }[] = [];

    // Obtener la parte
    const parte = await this.prisma.parte.findUnique({ where: { id: parteId } });
    if (!parte) {
      throw new NotFoundException('Parte no encontrada');
    }

    // Contar asignaciones existentes en esta parte
    const countExistentes = await this.prisma.programaAsignacion.count({
      where: { programaId, parteId },
    });

    // Crear la asignación principal
    await this.prisma.programaAsignacion.create({
      data: {
        programaId,
        parteId,
        usuarioId,
        orden: countExistentes + 1,
      },
    });
    asignacionesCreadas.push({ parteNombre: parte.nombre, usuarioId });

    const nombreLower = parte.nombre.toLowerCase();

    // Lógica automática para "bienvenida"
    if (nombreLower.includes('bienvenida')) {
      // Primera persona en bienvenida -> oración inicial
      // Segunda persona en bienvenida -> oración final
      const oracionNombre = countExistentes === 0 ? 'oración inicial' : 'oración final';

      // Buscar la parte de oración
      const parteOracion = await this.prisma.parte.findFirst({
        where: {
          nombre: { contains: oracionNombre, mode: 'insensitive' },
          activo: true,
        },
      });

      if (parteOracion) {
        // Verificar si ya está asignado a esta oración
        const yaAsignado = await this.prisma.programaAsignacion.findFirst({
          where: {
            programaId,
            parteId: parteOracion.id,
            usuarioId,
          },
        });

        if (!yaAsignado) {
          // Contar asignaciones en la oración
          const countOracion = await this.prisma.programaAsignacion.count({
            where: { programaId, parteId: parteOracion.id },
          });

          await this.prisma.programaAsignacion.create({
            data: {
              programaId,
              parteId: parteOracion.id,
              usuarioId,
              orden: countOracion + 1,
            },
          });
          asignacionesCreadas.push({ parteNombre: parteOracion.nombre, usuarioId });
        }
      }
    }

    // Lógica automática para "espacio de cantos" -> "himno final"
    if (nombreLower.includes('espacio de cantos') || nombreLower.includes('cantos')) {
      const parteHimnoFinal = await this.prisma.parte.findFirst({
        where: {
          nombre: { contains: 'himno final', mode: 'insensitive' },
          activo: true,
        },
      });

      if (parteHimnoFinal) {
        // Verificar si ya está asignado al himno final
        const yaAsignado = await this.prisma.programaAsignacion.findFirst({
          where: {
            programaId,
            parteId: parteHimnoFinal.id,
            usuarioId,
          },
        });

        if (!yaAsignado) {
          const countHimno = await this.prisma.programaAsignacion.count({
            where: { programaId, parteId: parteHimnoFinal.id },
          });

          await this.prisma.programaAsignacion.create({
            data: {
              programaId,
              parteId: parteHimnoFinal.id,
              usuarioId,
              orden: countHimno + 1,
            },
          });
          asignacionesCreadas.push({ parteNombre: parteHimnoFinal.nombre, usuarioId });
        }
      }
    }

    return { asignaciones: asignacionesCreadas };
  }

  /**
   * Asignar una parte por nombre - busca usuario, si no existe usa nombreLibre
   * Incluye lógica automática:
   * - Bienvenida -> Oración Inicial/Final
   * - Espacio de Cantos -> Himno Final
   */
  async asignarPorNombre(programaId: number, parteId: number, nombre: string): Promise<{
    asignaciones: { parteNombre: string; nombre: string; esUsuario: boolean }[];
  }> {
    const asignacionesCreadas: { parteNombre: string; nombre: string; esUsuario: boolean }[] = [];

    // Obtener la parte
    const parte = await this.prisma.parte.findUnique({ where: { id: parteId } });
    if (!parte) {
      throw new NotFoundException('Parte no encontrada');
    }

    // Buscar usuario por nombre
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        nombre: { contains: nombre, mode: 'insensitive' },
        activo: true,
      },
    });

    // Contar asignaciones existentes en esta parte
    const countExistentes = await this.prisma.programaAsignacion.count({
      where: { programaId, parteId },
    });

    // Crear la asignación principal
    await this.prisma.programaAsignacion.create({
      data: {
        programaId,
        parteId,
        usuarioId: usuario?.id || null,
        nombreLibre: usuario ? null : nombre,
        orden: countExistentes + 1,
      },
    });

    const nombreFinal = usuario?.nombre || nombre;
    asignacionesCreadas.push({ parteNombre: parte.nombre, nombre: nombreFinal, esUsuario: !!usuario });

    const nombreLower = parte.nombre.toLowerCase();

    // Lógica automática para "bienvenida"
    if (nombreLower.includes('bienvenida')) {
      const oracionNombre = countExistentes === 0 ? 'oración inicial' : 'oración final';

      const parteOracion = await this.prisma.parte.findFirst({
        where: {
          nombre: { contains: oracionNombre, mode: 'insensitive' },
          activo: true,
        },
      });

      if (parteOracion) {
        // Verificar si ya está asignado
        const yaAsignado = await this.prisma.programaAsignacion.findFirst({
          where: {
            programaId,
            parteId: parteOracion.id,
            OR: [
              { usuarioId: usuario?.id },
              { nombreLibre: { equals: nombreFinal } },
            ],
          },
        });

        if (!yaAsignado) {
          const countOracion = await this.prisma.programaAsignacion.count({
            where: { programaId, parteId: parteOracion.id },
          });

          await this.prisma.programaAsignacion.create({
            data: {
              programaId,
              parteId: parteOracion.id,
              usuarioId: usuario?.id || null,
              nombreLibre: usuario ? null : nombreFinal,
              orden: countOracion + 1,
            },
          });
          asignacionesCreadas.push({ parteNombre: parteOracion.nombre, nombre: nombreFinal, esUsuario: !!usuario });
        }
      }
    }

    // Lógica automática para "espacio de cantos" -> "himno final"
    if (nombreLower.includes('espacio de cantos') || nombreLower.includes('cantos')) {
      const parteHimnoFinal = await this.prisma.parte.findFirst({
        where: {
          nombre: { contains: 'himno final', mode: 'insensitive' },
          activo: true,
        },
      });

      if (parteHimnoFinal) {
        // Verificar si ya está asignado al himno final
        const yaAsignado = await this.prisma.programaAsignacion.findFirst({
          where: {
            programaId,
            parteId: parteHimnoFinal.id,
            OR: [
              { usuarioId: usuario?.id },
              { nombreLibre: { equals: nombreFinal } },
            ],
          },
        });

        if (!yaAsignado) {
          const countHimno = await this.prisma.programaAsignacion.count({
            where: { programaId, parteId: parteHimnoFinal.id },
          });

          await this.prisma.programaAsignacion.create({
            data: {
              programaId,
              parteId: parteHimnoFinal.id,
              usuarioId: usuario?.id || null,
              nombreLibre: usuario ? null : nombreFinal,
              orden: countHimno + 1,
            },
          });
          asignacionesCreadas.push({ parteNombre: parteHimnoFinal.nombre, nombre: nombreFinal, esUsuario: !!usuario });
        }
      }
    }

    return { asignaciones: asignacionesCreadas };
  }

  /**
   * Procesar programa completo desde texto
   * Parsea líneas tipo "Parte: Nombre1 - Nombre2" y crea/actualiza asignaciones
   */
  async procesarProgramaDesdeTexto(texto: string): Promise<{
    codigo: string;
    fecha: Date;
    partesActualizadas: number;
    asignacionesCreadas: number;
    errores: string[];
  }> {
    const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const errores: string[] = [];
    let partesActualizadas = 0;
    let asignacionesCreadas = 0;

    // 1. Primero buscar código de programa en las primeras 3 líneas (formato: XXX-XXXXXX)
    let codigoMatch: RegExpMatchArray | null = null;
    for (let i = 0; i < Math.min(3, lineas.length); i++) {
      codigoMatch = lineas[i].match(/([A-Z]{2,3}-[A-Za-z0-9]{6})/i);
      if (codigoMatch) break;
    }

    // 2. Extraer fecha de cualquier línea (buscar en las primeras 3)
    let fechaMatch: RegExpMatchArray | null = null;
    for (let i = 0; i < Math.min(3, lineas.length); i++) {
      fechaMatch = lineas[i].match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
      if (fechaMatch) break;
    }

    let fecha: Date;
    if (fechaMatch) {
      const dia = parseInt(fechaMatch[1], 10);
      const mes = parseInt(fechaMatch[2], 10) - 1;
      let anio = fechaMatch[3] ? parseInt(fechaMatch[3], 10) : new Date().getFullYear();
      if (anio < 100) anio += 2000;
      fecha = new Date(anio, mes, dia);
    } else {
      // Si no hay fecha, usar la fecha de hoy como fallback
      fecha = new Date();
      fecha.setHours(0, 0, 0, 0);
    }

    // 3. Buscar programa: primero por código, luego por fecha
    let programa;

    if (codigoMatch) {
      // Buscar por código específico
      programa = await this.prisma.programa.findFirst({
        where: { codigo: { equals: codigoMatch[1], mode: 'insensitive' } },
      });
      if (programa) {
        // Actualizar la fecha con la del programa encontrado
        fecha = programa.fecha;
      }
    }

    if (!programa) {
      // Si no se encontró por código, buscar por fecha
      programa = await this.prisma.programa.findFirst({
        where: { fecha },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!programa) {
      // Si no existe, crear nuevo programa
      const titulo = 'Programa Maranatha Adoración';
      programa = await this.prisma.programa.create({
        data: {
          codigo: this.generarCodigo(titulo),
          fecha,
          titulo,
          estado: 'borrador',
          creadoPor: 1, // Admin por defecto
        },
      });
    }

    // Limpiar asignaciones, links y partes existentes
    await this.prisma.programaAsignacion.deleteMany({
      where: { programaId: programa.id },
    });
    await this.prisma.programaLink.deleteMany({
      where: { programaId: programa.id },
    });
    await this.prisma.programaParte.deleteMany({
      where: { programaId: programa.id },
    });

    // Mapa de alias para nombres de partes con variaciones comunes
    // Las claves son versiones sin acentos, los valores son los nombres correctos en la DB
    const aliasPartes: Record<string, string> = {
      'oracion intercesora': 'Oración Intercesora',
      'oracion inicial': 'Oración Inicial',
      'oracion final': 'Oración Final',
    };

    // Variable para trackear la última parte procesada (para asociar links)
    let ultimaParteId: number | null = null;
    let linksCreados = 0;
    let ordenParte = 1;
    const partesAgregadas = new Set<number>(); // Para evitar duplicados

    // Procesar cada línea (excepto la primera con la fecha)
    for (let i = 1; i < lineas.length; i++) {
      const linea = lineas[i];

      // Detectar si es una línea de link (bullet con URL)
      const esLink = linea.startsWith('•') || linea.startsWith('-') || linea.startsWith('*');
      const tieneUrl = /https?:\/\/[^\s\]]+/.test(linea);

      if (esLink || tieneUrl) {
        // Procesar como link si tenemos una parte asociada
        if (ultimaParteId && tieneUrl) {
          // Extraer URL
          const urlMatch = linea.match(/(https?:\/\/[^\s\]]+)/);
          const url = urlMatch ? urlMatch[1] : '';

          // Extraer nombre del link (todo antes de la URL o entre corchetes)
          let nombreLink = linea
            .replace(/^[•\-\*]\s*/, '') // Quitar bullet
            .replace(/\[Link\]/gi, '') // Quitar [Link]
            .replace(url, '') // Quitar URL
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convertir [texto](url) a texto
            .trim();

          // Si el nombre está vacío, usar parte de la URL como nombre
          if (!nombreLink) {
            nombreLink = 'Link';
          }

          if (url) {
            await this.prisma.programaLink.create({
              data: {
                programaId: programa.id,
                parteId: ultimaParteId,
                nombre: nombreLink,
                url,
                orden: ++linksCreados,
              },
            });
          }
        }
        continue;
      }

      // Saltar líneas que contienen fechas (son headers, no asignaciones)
      if (/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(linea)) {
        continue;
      }

      // Formato esperado: "Parte: Nombre1 - Nombre2" o "Parte / Dirigir: Nombres"
      const match = linea.match(/^(.+?):\s*(.*)$/);
      if (!match) {
        continue;
      }

      // Limpiar caracteres invisibles/especiales (zero-width spaces, nbsp, etc)
      let parteNombre = match[1].trim()
        .replace(/\s*\/\s*Dirigir/i, '')
        .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0\u202F\u205F\u3000\u2800-\u28FF]/g, '') // Quitar zero-width, nbsp y braille chars
        .replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, '') // Solo letras, números, espacios y acentos
        .trim();
      const contenido = match[2].trim().replace(/[\u200B-\u200D\uFEFF\u2060\u00A0\u2800-\u28FF]/g, '');

      // Aplicar alias si existe (normalizar sin acentos para comparar)
      const parteNombreLowerNorm = parteNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const nombreBuscado = aliasPartes[parteNombreLowerNorm] || parteNombre;


      // Buscar la parte - primero exacto, luego flexible
      let parte = await this.prisma.parte.findFirst({
        where: {
          nombre: { equals: nombreBuscado, mode: 'insensitive' },
          activo: true,
        },
      });

      // Si no encuentra exacto, buscar por contenido pero con más precisión
      if (!parte) {
        const todasPartes = await this.prisma.parte.findMany({
          where: { activo: true },
        });

        // Buscar la parte que mejor coincida
        const parteNombreLower = nombreBuscado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        for (const p of todasPartes) {
          const nombreParteLower = p.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

          // Coincidencia exacta sin acentos
          if (nombreParteLower === parteNombreLower) {
            parte = p;
            break;
          }

          // Una contiene a la otra completamente
          if (nombreParteLower.includes(parteNombreLower) || parteNombreLower.includes(nombreParteLower)) {
            // Evitar falsos positivos: "Oración Inicial" no debe coincidir con "Oración Intercesora"
            // Verificar que las palabras clave coincidan
            const palabrasInput = parteNombreLower.split(/\s+/);
            const palabrasParte = nombreParteLower.split(/\s+/);

            // Si tienen más de una palabra, verificar que la segunda también coincida
            if (palabrasInput.length > 1 && palabrasParte.length > 1) {
              if (palabrasInput[1].substring(0, 4) === palabrasParte[1].substring(0, 4)) {
                parte = p;
                break;
              }
            } else {
              parte = p;
              break;
            }
          }
        }
      }

      if (!parte) {
        errores.push(`Línea ${i + 1}: Parte "${parteNombre}" no encontrada`);
        continue;
      }

      // Agregar la parte al programa si no está ya
      if (!partesAgregadas.has(parte.id)) {
        await this.prisma.programaParte.create({
          data: {
            programaId: programa.id,
            parteId: parte.id,
            orden: ordenParte++,
          },
        });
        partesAgregadas.add(parte.id);
      }

      // Actualizar última parte para asociar links subsecuentes
      ultimaParteId = parte.id;
      linksCreados = 0; // Reiniciar contador de links para esta parte

      // Si el contenido parece ser un himno/canción (no nombres), no crear asignaciones
      if (/himno|adventista|youtube|kahoot/i.test(contenido) || !contenido) {
        partesActualizadas++;
        continue;
      }

      // Separar nombres por coma o guión
      const nombres = contenido.split(/[-,]/).map(n => n.trim()).filter(n => n.length > 0);

      // Asignar cada nombre
      let orden = 1;
      for (const nombre of nombres) {
        // Buscar usuario
        const usuario = await this.prisma.usuario.findFirst({
          where: {
            nombre: { contains: nombre, mode: 'insensitive' },
            activo: true,
          },
        });

        await this.prisma.programaAsignacion.create({
          data: {
            programaId: programa.id,
            parteId: parte.id,
            usuarioId: usuario?.id || null,
            nombreLibre: usuario ? null : nombre,
            orden: orden++,
          },
        });
        asignacionesCreadas++;
      }
      partesActualizadas++;
    }

    // === Auto-asignación: Himno Final hereda de Espacio de Cantos si está vacío ===
    const parteEspacioCantos = await this.prisma.parte.findFirst({
      where: { nombre: { contains: 'Espacio de Cantos', mode: 'insensitive' }, activo: true },
    });
    const parteHimnoFinal = await this.prisma.parte.findFirst({
      where: { nombre: { contains: 'Himno Final', mode: 'insensitive' }, activo: true },
    });

    if (parteEspacioCantos && parteHimnoFinal) {
      // Verificar si Himno Final tiene asignaciones
      const asignacionesHimnoFinal = await this.prisma.programaAsignacion.count({
        where: { programaId: programa.id, parteId: parteHimnoFinal.id },
      });

      // Si Himno Final no tiene asignaciones, copiar de Espacio de Cantos
      if (asignacionesHimnoFinal === 0) {
        const asignacionesCantos = await this.prisma.programaAsignacion.findMany({
          where: { programaId: programa.id, parteId: parteEspacioCantos.id },
          orderBy: { orden: 'asc' },
        });

        let ordenHimno = 1;
        for (const asig of asignacionesCantos) {
          await this.prisma.programaAsignacion.create({
            data: {
              programaId: programa.id,
              parteId: parteHimnoFinal.id,
              usuarioId: asig.usuarioId,
              nombreLibre: asig.nombreLibre,
              orden: ordenHimno++,
            },
          });
          asignacionesCreadas++;
        }
      }
    }

    return { codigo: programa.codigo, fecha, partesActualizadas, asignacionesCreadas, errores };
  }

  /**
   * Obtener el próximo programa por fecha (>= hoy)
   */
  async getProximoPrograma() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.prisma.programa.findFirst({
      where: {
        fecha: { gte: hoy },
      },
      orderBy: { fecha: 'asc' },
      include: {
        creador: { select: { id: true, nombre: true } },
        partes: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            parte: true,
            usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
          },
          orderBy: { orden: 'asc' },
        },
        links: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  async getPartes() {
    return this.prisma.parte.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }

  async getPartesObligatorias() {
    return this.prisma.parte.findMany({
      where: {
        activo: true,
        esObligatoria: true,
      },
      orderBy: { orden: 'asc' },
    });
  }

  async getPartesOpcionales() {
    return this.prisma.parte.findMany({
      where: {
        activo: true,
        esObligatoria: false,
      },
      orderBy: { orden: 'asc' },
    });
  }

  async generarTexto(id: number) {
    const programa = await this.findOne(id);

    // Parsear fecha evitando problemas de zona horaria
    const fecha = this.parseLocalDate(programa.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const diaSemana = fecha.toLocaleDateString('es-PE', { weekday: 'long' });
    let texto = `Programa Maranatha Adoración el ${diaSemana} *${fechaFormateada}*:\n\n`;

    // Agrupar asignaciones y links por parte
    const asignacionesPorParte = new Map<number, any[]>();
    const linksPorParte = new Map<number, any[]>();

    for (const asig of programa.asignaciones) {
      const parteId = asig.parte.id;
      if (!asignacionesPorParte.has(parteId)) {
        asignacionesPorParte.set(parteId, []);
      }
      asignacionesPorParte.get(parteId)!.push(asig);
    }

    for (const link of programa.links) {
      const parteId = link.parte.id;
      if (!linksPorParte.has(parteId)) {
        linksPorParte.set(parteId, []);
      }
      linksPorParte.get(parteId)!.push(link);
    }

    // Obtener partes del programa en orden
    const partesDelPrograma = programa.partes || [];

    // Si no hay partes guardadas, usar las partes basadas en asignaciones/links
    if (partesDelPrograma.length === 0) {
      const todasPartes = await this.getPartes();
      for (const parte of todasPartes) {
        const asignaciones = asignacionesPorParte.get(parte.id) || [];
        const links = linksPorParte.get(parte.id) || [];

        if (asignaciones.length === 0 && links.length === 0 && !parte.esFija) {
          continue;
        }

        texto += this.formatearParteParaWhatsapp(parte, asignaciones, links);
      }
    } else {
      // Usar el orden guardado en programa_partes
      for (const pp of partesDelPrograma) {
        const parte = pp.parte;
        const asignaciones = asignacionesPorParte.get(parte.id) || [];
        const links = linksPorParte.get(parte.id) || [];

        texto += this.formatearParteParaWhatsapp(parte, asignaciones, links);
      }
    }

    // Guardar el texto generado
    await this.prisma.programa.update({
      where: { id },
      data: { textoGenerado: texto },
    });

    return { texto };
  }

  /**
   * Formatea una parte del programa para WhatsApp
   * Los links se muestran en formato: • NombreLink: URL
   */
  private formatearParteParaWhatsapp(
    parte: any,
    asignaciones: any[],
    links: any[],
  ): string {
    let resultado = '';

    if (parte.esFija && parte.textoFijo) {
      resultado += `*${parte.nombre}:* ${parte.textoFijo}\n`;
    } else if (asignaciones.length > 0) {
      const nombres = asignaciones.map((a) => a.usuario?.nombre || a.nombreLibre).join(', ');
      resultado += `*${parte.nombre}:* ${nombres}\n`;
    } else {
      resultado += `*${parte.nombre}:*\n`;
    }

    // Los links se muestran con el nombre y la URL directa (WhatsApp auto-detecta URLs)
    for (const link of links) {
      resultado += `• ${link.nombre}: ${link.url}\n`;
    }

    return resultado;
  }

  async getUsuariosParaAsignar() {
    return this.prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        codigoPais: true,
        telefono: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Preview de notificaciones WhatsApp para un programa
   * Agrupa las partes asignadas por usuario y genera el mensaje
   * Solo incluye usuarios con número de teléfono
   */
  async previewNotificaciones(programaId: number): Promise<{
    programa: {
      id: number;
      codigo: string;
      fecha: string;
      titulo: string;
    };
    notificaciones: {
      usuario: {
        id: number;
        nombre: string;
        telefono: string;
        codigoPais: string;
      };
      partes: string[];
      mensaje: string;
    }[];
    usuariosSinTelefono: {
      id: number;
      nombre: string;
      partes: string[];
    }[];
    resumen: {
      totalUsuariosConTelefono: number;
      totalUsuariosSinTelefono: number;
      totalAsignaciones: number;
    };
  }> {
    // Obtener el programa con todas las asignaciones
    const programa = await this.prisma.programa.findUnique({
      where: { id: programaId },
      include: {
        partes: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            parte: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                codigoPais: true,
                telefono: true,
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        links: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }

    // Agrupar asignaciones por usuario
    const asignacionesPorUsuario = new Map<number, {
      usuario: { id: number; nombre: string; codigoPais: string; telefono: string };
      partes: string[];
    }>();

    const usuariosSinTelefonoMap = new Map<number, {
      id: number;
      nombre: string;
      partes: string[];
    }>();

    for (const asig of programa.asignaciones) {
      // Solo procesar asignaciones con usuario (no nombreLibre)
      if (!asig.usuario) continue;

      const usuario = asig.usuario;
      const parteNombre = asig.parte.nombre;

      // Verificar si tiene teléfono
      if (usuario.telefono) {
        if (!asignacionesPorUsuario.has(usuario.id)) {
          asignacionesPorUsuario.set(usuario.id, {
            usuario: {
              id: usuario.id,
              nombre: usuario.nombre,
              codigoPais: usuario.codigoPais || '+51',
              telefono: usuario.telefono,
            },
            partes: [],
          });
        }
        asignacionesPorUsuario.get(usuario.id)!.partes.push(parteNombre);
      } else {
        // Usuario sin teléfono
        if (!usuariosSinTelefonoMap.has(usuario.id)) {
          usuariosSinTelefonoMap.set(usuario.id, {
            id: usuario.id,
            nombre: usuario.nombre,
            partes: [],
          });
        }
        usuariosSinTelefonoMap.get(usuario.id)!.partes.push(parteNombre);
      }
    }

    // Formatear fecha
    const fecha = this.parseLocalDate(programa.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Generar el texto completo del programa
    const textoPrograma = await this.generarTextoParaNotificacion(programa);

    // Crear las notificaciones
    const notificaciones = Array.from(asignacionesPorUsuario.values()).map(({ usuario, partes }) => {
      const partesUnicas = [...new Set(partes)];
      const mensaje = this.generarMensajeNotificacion(
        usuario.nombre,
        partesUnicas,
        fechaFormateada,
        textoPrograma,
        programa.codigo,
      );

      return {
        usuario,
        partes: partesUnicas,
        mensaje,
      };
    });

    const usuariosSinTelefono = Array.from(usuariosSinTelefonoMap.values()).map(u => ({
      ...u,
      partes: [...new Set(u.partes)],
    }));

    return {
      programa: {
        id: programa.id,
        codigo: programa.codigo,
        fecha: programa.fecha.toISOString(),
        titulo: programa.titulo,
      },
      notificaciones,
      usuariosSinTelefono,
      resumen: {
        totalUsuariosConTelefono: notificaciones.length,
        totalUsuariosSinTelefono: usuariosSinTelefono.length,
        totalAsignaciones: programa.asignaciones.length,
      },
    };
  }

  /**
   * Genera el mensaje de notificación personalizado para un usuario
   */
  private generarMensajeNotificacion(
    nombreUsuario: string,
    partes: string[],
    fechaFormateada: string,
    textoPrograma: string,
    codigo: string,
  ): string {
    const partesTexto = partes.length === 1
      ? `la parte *${partes[0]}*`
      : `las partes:\n${partes.map(p => `• *${p}*`).join('\n')}`;

    return `¡Hola ${nombreUsuario}! 👋

Has sido asignado/a a ${partesTexto} para el programa del *${fechaFormateada}*.

📋 *PROGRAMA COMPLETO:*

${textoPrograma}

🔖 *Código:* ${codigo}
_Responde "ver programa ${codigo}" para ver el programa actualizado._

¡Que Dios te bendiga! 🙏`;
  }

  /**
   * Genera el texto del programa para incluir en las notificaciones
   */
  private async generarTextoParaNotificacion(programa: any): Promise<string> {
    // Agrupar asignaciones y links por parte
    const asignacionesPorParte = new Map<number, any[]>();
    const linksPorParte = new Map<number, any[]>();

    for (const asig of programa.asignaciones) {
      const parteId = asig.parte.id;
      if (!asignacionesPorParte.has(parteId)) {
        asignacionesPorParte.set(parteId, []);
      }
      asignacionesPorParte.get(parteId)!.push(asig);
    }

    for (const link of programa.links) {
      const parteId = link.parte.id;
      if (!linksPorParte.has(parteId)) {
        linksPorParte.set(parteId, []);
      }
      linksPorParte.get(parteId)!.push(link);
    }

    let texto = '';

    // Usar el orden guardado en programa_partes
    for (const pp of programa.partes) {
      const parte = pp.parte;
      const asignaciones = asignacionesPorParte.get(parte.id) || [];
      const links = linksPorParte.get(parte.id) || [];

      texto += this.formatearParteParaWhatsapp(parte, asignaciones, links);
    }

    return texto;
  }

  /**
   * Obtener las próximas asignaciones de un usuario
   * Retorna programas futuros donde el usuario tiene partes asignadas
   */
  async getMisProximasAsignaciones(usuarioId: number): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar asignaciones futuras del usuario
    const asignaciones = await this.prisma.programaAsignacion.findMany({
      where: {
        usuarioId,
        programa: {
          fecha: { gte: today },
        },
      },
      include: {
        parte: { select: { id: true, nombre: true } },
        programa: {
          select: {
            id: true,
            fecha: true,
            titulo: true,
            estado: true,
          },
        },
      },
      orderBy: {
        programa: { fecha: 'asc' },
      },
    });

    // Agrupar por programa y eliminar partes duplicadas
    const programasMap = new Map<number, {
      id: number;
      fecha: Date;
      titulo: string;
      estado: string;
      partes: Map<number, { id: number; nombre: string }>;
    }>();

    for (const asig of asignaciones) {
      const prog = asig.programa;
      if (!programasMap.has(prog.id)) {
        programasMap.set(prog.id, {
          id: prog.id,
          fecha: prog.fecha,
          titulo: prog.titulo,
          estado: prog.estado,
          partes: new Map(),
        });
      }
      // Usar Map para evitar duplicados de partes
      const parteId = asig.parte.id;
      if (!programasMap.get(prog.id)!.partes.has(parteId)) {
        programasMap.get(prog.id)!.partes.set(parteId, {
          id: asig.parte.id,
          nombre: asig.parte.nombre,
        });
      }
    }

    // Convertir Maps a arrays
    return Array.from(programasMap.values()).map(prog => ({
      id: prog.id,
      fecha: prog.fecha,
      titulo: prog.titulo,
      estado: prog.estado,
      partes: Array.from(prog.partes.values()),
    }));
  }

  /**
   * Obtener estadísticas del dashboard para admins/líderes
   */
  /**
   * Buscar programas por fecha (puede devolver múltiples)
   */
  async findByFecha(fecha: Date) {
    const programas = await this.prisma.programa.findMany({
      where: { fecha },
      orderBy: [{ horaInicio: 'asc' }, { createdAt: 'asc' }],
      include: {
        creador: { select: { id: true, nombre: true } },
        partes: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            parte: true,
            usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
          },
          orderBy: { orden: 'asc' },
        },
        links: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    return programas.map((p) => this.formatPrograma(p));
  }

  /**
   * Buscar programa por código único (case-insensitive)
   */
  async findByCodigo(codigo: string) {
    const programa = await this.prisma.programa.findFirst({
      where: {
        codigo: { equals: codigo, mode: 'insensitive' }
      },
      include: {
        creador: { select: { id: true, nombre: true } },
        partes: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
        asignaciones: {
          include: {
            parte: true,
            usuario: { select: { id: true, nombre: true, codigoPais: true, telefono: true } },
          },
          orderBy: { orden: 'asc' },
        },
        links: {
          include: { parte: true },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!programa) {
      return null;
    }

    return this.formatPrograma(programa);
  }

  async getEstadisticasAdmin(): Promise<{
    programasEsteMes: number;
    programasPendientes: number;
    totalProgramas: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [programasEsteMes, programasPendientes, totalProgramas] = await Promise.all([
      this.prisma.programa.count({
        where: {
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
      this.prisma.programa.count({
        where: {
          estado: { in: ['borrador', 'completo'] },
          fecha: { gte: new Date() },
        },
      }),
      this.prisma.programa.count(),
    ]);

    return {
      programasEsteMes,
      programasPendientes,
      totalProgramas,
    };
  }

  private formatPrograma(programa: any) {
    return {
      id: programa.id,
      codigo: programa.codigo,
      fecha: programa.fecha,
      horaInicio: this.formatTime(programa.horaInicio),
      horaFin: this.formatTime(programa.horaFin),
      titulo: programa.titulo,
      estado: programa.estado,
      textoGenerado: programa.textoGenerado,
      creador: programa.creador,
      enviadoAt: programa.enviadoAt,
      createdAt: programa.createdAt,
      partes: programa.partes?.map((pp: any) => ({
        id: pp.id,
        parteId: pp.parteId,
        parte: pp.parte,
        orden: pp.orden,
      })) || [],
      asignaciones: programa.asignaciones?.map((a: any) => ({
        id: a.id,
        parteId: a.parteId,
        parte: a.parte,
        usuario: a.usuario,
        nombreLibre: a.nombreLibre,
        orden: a.orden,
        notificado: a.notificado,
        confirmado: a.confirmado,
      })) || [],
      links: programa.links?.map((l: any) => ({
        id: l.id,
        parteId: l.parteId,
        parte: l.parte,
        nombre: l.nombre,
        url: l.url,
        orden: l.orden,
      })) || [],
    };
  }

  /**
   * Parsea una fecha ISO evitando problemas de zona horaria
   * Extrae YYYY-MM-DD y crea la fecha en zona horaria local
   */
  private parseLocalDate(fecha: string | Date): Date {
    const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
    const [datePart] = fechaStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Parsea una hora en formato HH:MM a DateTime para Prisma
   * PostgreSQL Time se almacena como DateTime con fecha 1970-01-01
   */
  private parseTime(hora: string): Date | null {
    if (!hora) return null;
    const [hours, minutes] = hora.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return new Date(1970, 0, 1, hours, minutes, 0);
  }

  /**
   * Formatea un DateTime de Prisma Time a string HH:MM
   */
  private formatTime(time: Date | null): string | null {
    if (!time) return null;
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Enviar notificaciones WhatsApp a los participantes de un programa
   * Usa la lógica de previewNotificaciones y envía los mensajes
   */
  async enviarNotificaciones(programaId: number): Promise<{
    enviados: number;
    errores: number;
    detalles: { nombre: string; telefono: string; success: boolean; error?: string }[];
  }> {
    // Obtener el preview de notificaciones
    const preview = await this.previewNotificaciones(programaId);

    if (preview.notificaciones.length === 0) {
      return {
        enviados: 0,
        errores: 0,
        detalles: [],
      };
    }

    const detalles: { nombre: string; telefono: string; success: boolean; error?: string }[] = [];
    let enviados = 0;
    let errores = 0;

    // Enviar mensaje a cada participante
    for (const notif of preview.notificaciones) {
      const telefono = `${notif.usuario.codigoPais}${notif.usuario.telefono}`;

      try {
        const result = await this.whatsappService.sendMessageToPhone(
          telefono,
          notif.usuario.nombre,
          notif.mensaje,
        );

        if (result.success) {
          enviados++;
          detalles.push({
            nombre: notif.usuario.nombre,
            telefono,
            success: true,
          });

          // Marcar las asignaciones como notificadas
          await this.prisma.programaAsignacion.updateMany({
            where: {
              programaId,
              usuarioId: notif.usuario.id,
            },
            data: {
              notificado: true,
            },
          });
        } else {
          errores++;
          detalles.push({
            nombre: notif.usuario.nombre,
            telefono,
            success: false,
            error: result.error,
          });
        }

        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errores++;
        detalles.push({
          nombre: notif.usuario.nombre,
          telefono,
          success: false,
          error: error.message,
        });
      }
    }

    // Actualizar programa si se enviaron notificaciones
    if (enviados > 0) {
      await this.prisma.programa.update({
        where: { id: programaId },
        data: {
          enviadoAt: new Date(),
          estado: 'enviado',
        },
      });
    }

    return {
      enviados,
      errores,
      detalles,
    };
  }
}
