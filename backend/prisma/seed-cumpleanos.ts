import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos extraídos de la imagen de cumpleaños GP Shekinah
const cumpleanos = [
  { nombre: 'Fanny Calderón', dia: 31, mes: 7 },
  { nombre: 'Anyela Calle', dia: 13, mes: 10 },
  { nombre: 'A. Patricia Tola', dia: 13, mes: 5 },
  { nombre: 'Belen Diaz Solis', dia: 9, mes: 10 },
  { nombre: 'Jhefren Espino Roman', dia: 6, mes: 10 },
  { nombre: 'Diego Orduña Moreno', dia: 29, mes: 6 },
  { nombre: 'Jorge Vásquez', dia: 15, mes: 5 },
  { nombre: 'Pamela Maldonado', dia: 2, mes: 7 },
  { nombre: 'Jean Caso Mauricio', dia: 7, mes: 4 },
  { nombre: 'Dany Quezada', dia: 30, mes: 12 },
  { nombre: 'Zeli Santiago', dia: 18, mes: 4 },
  { nombre: 'Grethel Chávez', dia: 16, mes: 4 },
  { nombre: 'Gina Mamani', dia: 6, mes: 9 },
  { nombre: 'Milca Humpiri', dia: 14, mes: 9 },
  { nombre: 'Gabriel Salomé', dia: 19, mes: 1 },
  { nombre: 'Antonio Peña', dia: 20, mes: 11 },
  { nombre: 'Diego', dia: 4, mes: 4 },
];

// Función para normalizar nombres (quitar acentos, lowercase)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

// Función para verificar si dos nombres son similares
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  // Match exacto
  if (n1 === n2) return true;

  // Uno contiene al otro
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Match por primer nombre
  const firstName1 = n1.split(' ')[0];
  const firstName2 = n2.split(' ')[0];
  if (firstName1 === firstName2 && firstName1.length >= 4) return true;

  // Match por apellido
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  if (parts1.length > 1 && parts2.length > 1) {
    const lastName1 = parts1[parts1.length - 1];
    const lastName2 = parts2[parts2.length - 1];
    if (lastName1 === lastName2 && lastName1.length >= 4) {
      // También verificar que el primer nombre sea similar
      if (firstName1.startsWith(firstName2.substring(0, 3)) ||
        firstName2.startsWith(firstName1.substring(0, 3))) {
        return true;
      }
    }
  }

  return false;
}

async function main() {
  console.log('🎂 Procesando cumpleaños...\n');

  // Obtener todos los usuarios de la BD
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, telefono: true, fechaNacimiento: true },
    orderBy: { nombre: 'asc' },
  });

  console.log(`📋 Usuarios en BD: ${usuarios.length}\n`);

  const matches: { cumple: typeof cumpleanos[0]; usuario: typeof usuarios[0] }[] = [];
  const noMatches: typeof cumpleanos[0][] = [];

  // Buscar matches
  for (const cumple of cumpleanos) {
    const match = usuarios.find(u => namesMatch(cumple.nombre, u.nombre));

    if (match) {
      matches.push({ cumple, usuario: match });
    } else {
      noMatches.push(cumple);
    }
  }

  // Mostrar matches encontrados
  console.log('✅ USUARIOS ENCONTRADOS EN BD:');
  console.log('================================');
  for (const { cumple, usuario } of matches) {
    const fechaActual = usuario.fechaNacimiento
      ? `(actual: ${usuario.fechaNacimiento.toLocaleDateString('es-PE')})`
      : '(sin fecha)';
    const nuevaFecha = `${cumple.dia}/${cumple.mes}`;
    console.log(`  ${cumple.nombre} → ${usuario.nombre} (ID: ${usuario.id}) - ${nuevaFecha} ${fechaActual}`);
  }

  // Mostrar no encontrados
  console.log('\n❌ USUARIOS NO ENCONTRADOS EN BD:');
  console.log('==================================');
  for (const cumple of noMatches) {
    console.log(`  ${cumple.nombre} - ${cumple.dia}/${cumple.mes}`);
  }

  // Preguntar si actualizar
  console.log('\n📊 RESUMEN:');
  console.log(`  - Encontrados: ${matches.length}`);
  console.log(`  - No encontrados: ${noMatches.length}`);

  // Actualizar fechas de nacimiento para los matches
  console.log('\n🔄 Actualizando fechas de nacimiento...');
  let actualizados = 0;

  for (const { cumple, usuario } of matches) {
    // Crear fecha con año arbitrario (2000) para solo guardar día/mes
    const fechaNacimiento = new Date(2000, cumple.mes - 1, cumple.dia);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { fechaNacimiento },
    });
    actualizados++;
  }

  console.log(`✅ ${actualizados} fechas de nacimiento actualizadas`);

  // Mostrar usuarios que necesitan ser creados
  if (noMatches.length > 0) {
    console.log('\n⚠️  Los siguientes usuarios NO existen en la BD:');
    console.log('   Pásame el número de teléfono para crearlos:\n');
    noMatches.forEach((cumple, i) => {
      console.log(`   ${i + 1}. ${cumple.nombre} (cumple: ${cumple.dia}/${cumple.mes})`);
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
