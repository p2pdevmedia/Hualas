import { PrismaClient, ProfessorPaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const CREATED_BY_ID = 'cmom4i58m00003qf8z0jx15w1'; // Ivan Müller (SUPER_ADMIN)
const IMPORT_NOTES = 'Importado desde planilla enero-febrero 2026';

const paymentsData: {
  userId: string;
  name: string;
  month: number;
  year: number;
  amount: number;
}[] = [
  // ── ENERO 2026 ──────────────────────────────────────────────────────────────
  {
    userId: 'cmooktv6n000tdijrowm7gm21',
    name: 'Tatiana',
    month: 1,
    year: 2026,
    amount: 1030000,
  },
  {
    userId: 'cmooktviw000xdijr19wsfoai',
    name: 'Victoria Quintas',
    month: 1,
    year: 2026,
    amount: 1000000,
  },
  {
    userId: 'cmookturd000odijrjz6k56uv',
    name: 'Maia Heidel',
    month: 1,
    year: 2026,
    amount: 1050000,
  },
  {
    userId: 'cmoncqd6g008lu3gj7vv0re2j',
    name: 'Jesica Beninca',
    month: 1,
    year: 2026,
    amount: 1192800,
  },
  {
    userId: 'cmondfmph002pfhm3kfuaha94',
    name: 'Luna Gomez',
    month: 1,
    year: 2026,
    amount: 850000,
  },
  {
    userId: 'cmooktu5x000hdijrednb08b0',
    name: 'Delfina Ramos',
    month: 1,
    year: 2026,
    amount: 870000,
  },
  {
    userId: 'cmone0l6z00zh1291ggh13zfm',
    name: 'Carolina Souto',
    month: 1,
    year: 2026,
    amount: 1100000,
  },
  {
    userId: 'cmookttzu000fdijrali3wlew',
    name: 'Martin Velasquez',
    month: 1,
    year: 2026,
    amount: 1040000,
  },
  {
    userId: 'cmooktui7000ldijrgrayun87',
    name: 'Laura Barberis',
    month: 1,
    year: 2026,
    amount: 910000,
  },
  {
    userId: 'cmooktsmt0000dijrljbrenbu',
    name: 'Azul Barreyra',
    month: 1,
    year: 2026,
    amount: 920000,
  },
  {
    userId: 'cmondyoap00sz1291qkg67vex',
    name: 'Camila Peña',
    month: 1,
    year: 2026,
    amount: 1160000,
  },
  {
    userId: 'cmooktuf5000kdijrh22aae7i',
    name: 'Felipe Urretabizkaya',
    month: 1,
    year: 2026,
    amount: 906000,
  },
  {
    userId: 'cmooktttp000ddijrkh1xf35e',
    name: 'Lorenzo Tapia',
    month: 1,
    year: 2026,
    amount: 990000,
  },
  {
    userId: 'cmookttwq000edijrhr9359kk',
    name: 'Luisina Carro',
    month: 1,
    year: 2026,
    amount: 830000,
  },
  {
    userId: 'cmooktuuf000pdijrgd7qxahb',
    name: 'Ramiro Bognanni',
    month: 1,
    year: 2026,
    amount: 1170000,
  },
  {
    userId: 'cmooktuxh000qdijrtzn8kzyw',
    name: 'Carolina Garcia',
    month: 1,
    year: 2026,
    amount: 870000,
  },
  {
    userId: 'cmone0ruo00zz1291rrni6oye',
    name: 'Jeronimo Berdaguet',
    month: 1,
    year: 2026,
    amount: 1320000,
  },
  {
    userId: 'cmooktv9o000udijrmgc962bs',
    name: 'Nicolas Ahumada',
    month: 1,
    year: 2026,
    amount: 1100000,
  },
  {
    userId: 'cmooktv3l000sdijrf8xa68ns',
    name: 'Juana Navarro',
    month: 1,
    year: 2026,
    amount: 920000,
  },
  {
    userId: 'cmooktvcq000vdijrrnuwl9sp',
    name: 'Juan Jose Acuña',
    month: 1,
    year: 2026,
    amount: 1070000,
  },
  {
    userId: 'cmooktthc0009dijrdfzghwby',
    name: 'Florencia Mullenbruck',
    month: 1,
    year: 2026,
    amount: 1070000,
  },
  {
    userId: 'cmooktuc4000jdijrwxx9tcry',
    name: 'Julieta Castilla',
    month: 1,
    year: 2026,
    amount: 1660000,
  },
  {
    userId: 'cmooktt1g0004dijr2bb9ie31',
    name: 'Agustin Laborda',
    month: 1,
    year: 2026,
    amount: 1740000,
  },
  {
    userId: 'cmookttau0007dijrp7nhnxn5',
    name: 'Tomas Genova',
    month: 1,
    year: 2026,
    amount: 1630000,
  },
  {
    userId: 'cmooktvft000wdijrb55ss1t6',
    name: 'Nicolas Hudson',
    month: 1,
    year: 2026,
    amount: 1100000,
  },

  // ── FEBRERO 2026 ─────────────────────────────────────────────────────────────
  {
    userId: 'cmookturd000odijrjz6k56uv',
    name: 'Maia Heidel',
    month: 2,
    year: 2026,
    amount: 1200000,
  },
  {
    userId: 'cmoncqd6g008lu3gj7vv0re2j',
    name: 'Jesica Beninca',
    month: 2,
    year: 2026,
    amount: 1160000,
  },
  {
    userId: 'cmondfmph002pfhm3kfuaha94',
    name: 'Luna Gomez',
    month: 2,
    year: 2026,
    amount: 810000,
  },
  {
    userId: 'cmooktu5x000hdijrednb08b0',
    name: 'Delfina Ramos',
    month: 2,
    year: 2026,
    amount: 390000,
  },
  {
    userId: 'cmone0l6z00zh1291ggh13zfm',
    name: 'Carolina Souto',
    month: 2,
    year: 2026,
    amount: 1260000,
  },
  {
    userId: 'cmookttzu000fdijrali3wlew',
    name: 'Martin Velasquez',
    month: 2,
    year: 2026,
    amount: 1140000,
  },
  {
    userId: 'cmooktui7000ldijrgrayun87',
    name: 'Laura Barberis',
    month: 2,
    year: 2026,
    amount: 1160000,
  },
  {
    userId: 'cmooktsmt0000dijrljbrenbu',
    name: 'Azul Barreyra',
    month: 2,
    year: 2026,
    amount: 1170000,
  },
  {
    userId: 'cmondyoap00sz1291qkg67vex',
    name: 'Camila Peña',
    month: 2,
    year: 2026,
    amount: 1260000,
  },
  {
    userId: 'cmooktuf5000kdijrh22aae7i',
    name: 'Felipe Urretabizkaya',
    month: 2,
    year: 2026,
    amount: 1081000,
  },
  {
    userId: 'cmooktttp000ddijrkh1xf35e',
    name: 'Lorenzo Tapia',
    month: 2,
    year: 2026,
    amount: 1090000,
  },
  {
    userId: 'cmookttwq000edijrhr9359kk',
    name: 'Luisina Carro',
    month: 2,
    year: 2026,
    amount: 880000,
  },
  {
    userId: 'cmooktuuf000pdijrgd7qxahb',
    name: 'Ramiro Bognanni',
    month: 2,
    year: 2026,
    amount: 1270000,
  },
  {
    userId: 'cmooktuxh000qdijrtzn8kzyw',
    name: 'Carolina Garcia',
    month: 2,
    year: 2026,
    amount: 270000,
  },
  {
    userId: 'cmone0ruo00zz1291rrni6oye',
    name: 'Jeronimo Berdaguet',
    month: 2,
    year: 2026,
    amount: 1340000,
  },
  {
    userId: 'cmooktul9000mdijr45duden9',
    name: 'Matias Calabresi',
    month: 2,
    year: 2026,
    amount: 1070000,
  },
  {
    userId: 'cmooktthc0009dijrdfzghwby',
    name: 'Florencia Mullenbruck',
    month: 2,
    year: 2026,
    amount: 1280000,
  },
  {
    userId: 'cmooktuc4000jdijrwxx9tcry',
    name: 'Julieta Castilla',
    month: 2,
    year: 2026,
    amount: 1760000,
  },
  {
    userId: 'cmooktt1g0004dijr2bb9ie31',
    name: 'Agustin Laborda',
    month: 2,
    year: 2026,
    amount: 1840000,
  },
  {
    userId: 'cmookttau0007dijrp7nhnxn5',
    name: 'Tomas Genova',
    month: 2,
    year: 2026,
    amount: 1430000,
  },
  {
    userId: 'cmooktvft000wdijrb55ss1t6',
    name: 'Nicolas Hudson',
    month: 2,
    year: 2026,
    amount: 1080000,
  },
];

async function main() {
  console.log(`Cargando ${paymentsData.length} pagos...`);

  let created = 0;
  let skipped = 0;

  for (const p of paymentsData) {
    // Upsert ProfessorProfile
    const profile = await prisma.professorProfile.upsert({
      where: { userId: p.userId },
      update: {},
      create: {
        userId: p.userId,
        monthlySalary: 0,
      },
    });

    // Create payment (skip exact imported row if already exists)
    const existing = await prisma.professorPayment.findFirst({
      where: {
        professorProfileId: profile.id,
        periodMonth: p.month,
        periodYear: p.year,
        amount: p.amount,
        createdById: CREATED_BY_ID,
        notes: IMPORT_NOTES,
      },
    });

    if (existing) {
      console.log(`  SKIP: ${p.name} ${p.month}/${p.year} (ya existe)`);
      skipped++;
      continue;
    }

    await prisma.professorPayment.create({
      data: {
        professorProfileId: profile.id,
        periodMonth: p.month,
        periodYear: p.year,
        amount: p.amount,
        status: ProfessorPaymentStatus.PAID,
        paidAt: new Date(p.year, p.month - 1, 28),
        notes: IMPORT_NOTES,
        createdById: CREATED_BY_ID,
      },
    });

    console.log(
      `  OK: ${p.name} ${p.month}/${p.year} → $${p.amount.toLocaleString()}`
    );
    created++;
  }

  console.log(`\nListo: ${created} creados, ${skipped} ya existían.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
