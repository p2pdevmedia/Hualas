import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const types = [
  {
    name: 'Kayak',
    icon: '🛶',
    defaultDescription: 'Salida en kayak por el lago. Traer ropa de baño, protector solar, agua y calzado que pueda mojarse.',
    sortOrder: 1,
  },
  {
    name: 'Bici de montaña',
    icon: '🚵',
    defaultDescription: 'Salida en bicicleta de montaña. Traer casco obligatorio, guantes, agua y snacks para la ruta.',
    sortOrder: 2,
  },
  {
    name: 'Escalada',
    icon: '🧗',
    defaultDescription: 'Sesión de escalada. Traer ropa cómoda y calzado adecuado. El equipo de seguridad es provisto por el club.',
    sortOrder: 3,
  },
  {
    name: 'Deportes en conjunto',
    icon: '⚽',
    defaultDescription: 'Actividad grupal de deportes. Traer ropa deportiva y calzado adecuado para el terreno.',
    sortOrder: 4,
  },
  {
    name: 'Senderismo',
    icon: '🥾',
    defaultDescription: 'Caminata por senderos. Traer agua, snacks, protector solar y ropa cómoda para caminar. Se recomienda calzado de trekking.',
    sortOrder: 5,
  },
  {
    name: 'Día de Artes',
    icon: '🎨',
    defaultDescription: 'Actividad artística grupal. Traer ropa que pueda mancharse. Los materiales son provistos por el club.',
    sortOrder: 6,
  },
  {
    name: 'Campamento',
    icon: '⛺',
    defaultDescription: 'Campamento grupal. Traer carpa, bolsa de dormir, ropa abrigada y equipamiento personal. Consultar lista completa con el profesor.',
    sortOrder: 7,
  },
  {
    name: 'Día en la naturaleza',
    icon: '🌿',
    defaultDescription: 'Día al aire libre en la naturaleza. Traer protector solar, agua, snacks y ropa cómoda. Se recomienda repelente de insectos.',
    sortOrder: 8,
  },
  {
    name: 'Natación',
    icon: '🏊',
    defaultDescription: 'Sesión de natación. Traer traje de baño, toalla, antiparra y protector solar.',
    sortOrder: 9,
  },
];

async function main() {
  for (const type of types) {
    const existing = await prisma.activityDayType.findFirst({ where: { name: type.name } });
    if (existing) {
      await prisma.activityDayType.update({
        where: { id: existing.id },
        data: { icon: type.icon, defaultDescription: type.defaultDescription, sortOrder: type.sortOrder },
      });
    } else {
      await prisma.activityDayType.create({ data: type });
    }
  }
  console.log('ActivityDayType seed completado.');
}

main().finally(() => prisma.$disconnect());
