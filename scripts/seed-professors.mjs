import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Test1234!';

const PROFESSORS = [
  {
    fullName: 'Azul Barreyra',
    email: 'azu.equilibrios@gmail.com',
    activities: ['CIRCO', 'ESC. DE MONTAÑA', 'JORNADA'],
  },
  {
    fullName: 'Cecilia Guadalupe Balestrini',
    email: 'cedalupe218@gmail.com',
    activities: ['CIRCO', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Jeronimo Berdaguet',
    email: 'j.berdaguet@gmail.com',
    activities: ['HOCKEY', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Carolina Souto',
    email: 'carolina.souto.3@gmail.com',
    activities: ['HOCKEY', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Agustin Laborda',
    email: 'labordaagustin@gmail.com',
    activities: ['VOLEY PLAYA', 'ESC. DE MONTAÑA', 'JORNADA'],
  },
  {
    fullName: 'Milena Nadina Villa',
    email: 'villamilena96@gmail.com',
    activities: ['PALESTRA', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Valentina Bermejo',
    email: 'valenbermejo18@gmail.com',
    activities: ['PALESTRA', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Tomas Genova',
    email: 'tomascanotaje@gmail.com',
    activities: ['PALESTRA', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Juan Francisco Ramos',
    email: 'ramos.juanfr@gmail.com',
    activities: ['ESC. DE MONTAÑA', 'PALESTRA', 'JORNADA'],
  },
  {
    fullName: 'Florencia Mullenbruck',
    email: 'flor.mullen@gmail.com',
    activities: ['MONTAÑISMO', 'ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Mariano Frete',
    email: 'marianofrete@gmail.com',
    activities: ['MONTAÑISMO'],
  },
  {
    fullName: 'Andrea Calderon',
    email: 'andreacalderon411@gmail.com',
    activities: ['MONTAÑISMO'],
  },
  {
    fullName: 'Nicolas Nicolini',
    email: 'nicolasrodrigueznicolini@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Emanuel Lorenzo Tapia',
    email: 'lorenzotapia500@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Luisina Carro',
    email: 'lucarrosandoval@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Martin Velasquez',
    email: 'martinvelasquez095@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Camila Peña',
    email: 'camilitapena91@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Delfina Ramos',
    email: 'ramosdelfina248@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Jesica Beninca',
    email: 'benincajesicadaiana@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Julieta Castilla',
    email: 'castillajuli@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Felipe Urretabizkaya',
    email: 'urretafelipegbhn@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Laura Barberis',
    email: 'barberislali@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Matias Calabresi',
    email: 'mcalabresi6@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Luna Gomez',
    email: 'lunagomez596911@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Maia Heidel',
    email: 'maiaheidel@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Ramiro Bognanni',
    email: 'ramibognanni@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Carolina Garcia Tardieu',
    email: 'cgarciatard@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Lucas Casal',
    email: 'luquicasal@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Juana Navarro',
    email: 'juananavarro010@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Tatiana Barril',
    email: 'tatibarril.01@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Nicolas Ahumada',
    email: 'nicoahumada9@hotmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Juan Jose Acuña',
    email: 'jjacu25@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Nicolas Hudson',
    email: 'nico_hudson@hotmail.com.ar',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Victoria Quintas',
    email: 'vickyq14@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
  {
    fullName: 'Belén Delle Piane',
    email: 'beludellepiane@gmail.com',
    activities: ['ESC. DE MONTAÑA'],
  },
];

const ACTIVITY_ALIASES = new Map([
  ['circo', ['circo']],
  ['esc de montana', ['edm', 'escuela de montana']],
  ['jornada', ['jornada', 'jornadas']],
  ['voley playa', ['voley']],
  ['palestra', ['palestra']],
  ['montanismo', ['montanismo']],
  ['hockey', ['hockey']],
]);

function normalizeKey(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanName(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function resolveActivityIds(activityLabel, activityIndex) {
  const normalizedLabel = normalizeKey(activityLabel);
  const aliases = ACTIVITY_ALIASES.get(normalizedLabel) ?? [normalizedLabel];
  const ids = new Set();

  for (const [activityName, activityIds] of activityIndex.entries()) {
    if (
      activityName === normalizedLabel ||
      aliases.some((alias) => activityName.includes(alias))
    ) {
      for (const activityId of activityIds) {
        ids.add(activityId);
      }
    }
  }

  return [...ids];
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const existingActivities = await prisma.activity.findMany({
    select: { id: true, name: true },
  });

  const activityIndex = new Map();
  for (const activity of existingActivities) {
    const key = normalizeKey(activity.name);
    const current = activityIndex.get(key) ?? [];
    current.push(activity.id);
    activityIndex.set(key, current);
  }

  let createdUsers = 0;
  let updatedUsers = 0;
  const assignmentRows = [];
  const assignmentKeys = new Set();
  const missingActivities = new Set();

  for (const professor of PROFESSORS) {
    const existingUser = await prisma.user.findUnique({
      where: { email: professor.email },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { email: professor.email },
      update: {
        name: cleanName(professor.fullName),
        lastName: null,
        role: 'PROFESSOR',
        isActive: true,
      },
      create: {
        email: professor.email,
        name: cleanName(professor.fullName),
        lastName: null,
        password: passwordHash,
        role: 'PROFESSOR',
        isActive: true,
      },
    });

    if (existingUser) updatedUsers += 1;
    else createdUsers += 1;

    for (const activityName of new Set(professor.activities)) {
      const activityIds = resolveActivityIds(activityName, activityIndex);
      if (activityIds.length === 0) {
        missingActivities.add(activityName);
        continue;
      }

      for (const activityId of activityIds) {
        const key = `${user.id}:${activityId}`;
        if (assignmentKeys.has(key)) continue;
        assignmentKeys.add(key);
        assignmentRows.push({ activityId, userId: user.id });
      }
    }
  }

  if (assignmentRows.length > 0) {
    await prisma.activityProfessor.createMany({
      data: assignmentRows,
      skipDuplicates: true,
    });
  }

  console.log('✅ Profesores creados/actualizados:');
  console.log(`  Creados:  ${createdUsers}`);
  console.log(`  Actualizados: ${updatedUsers}`);
  console.log(`  Asignaciones de actividad: ${assignmentRows.length}`);
  console.log(`  Contraseña temporal: ${DEFAULT_PASSWORD}`);

  if (missingActivities.size > 0) {
    console.log('⚠️  Actividades no encontradas en la base:');
    for (const activityName of missingActivities) {
      console.log(`  - ${activityName}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
