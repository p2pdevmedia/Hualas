import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const databaseUrl = process.env.DATABASE_URL ?? '';
const allowedLocalTargets = [
  '127.0.0.1:55432/hualas_video',
  'localhost:55432/hualas_video',
];

if (!allowedLocalTargets.some((target) => databaseUrl.includes(target))) {
  throw new Error(
    'seed-professor-web-video-demo only runs against the local hualas_video database on port 55432.'
  );
}

const prisma = new PrismaClient();
const password = await hash('Demo1234!', 12);

function pesos(value) {
  return Math.round(value * 100);
}

function atOffset(days, hour = 12, minute = 0) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return new Date(
    Date.UTC(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      hour,
      minute,
      0
    )
  );
}

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function monthOffset(offset) {
  const base = new Date();
  base.setUTCDate(1);
  base.setUTCHours(12, 0, 0, 0);
  base.setUTCMonth(base.getUTCMonth() + offset);
  return {
    month: base.getUTCMonth() + 1,
    year: base.getUTCFullYear(),
    date: base,
  };
}

function participantKey(activityId, userId, childId = null) {
  return [activityId, userId, childId ?? 'self'].join(':');
}

async function resetDatabase() {
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const quotedTables = tables
    .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`
  );
}

async function createUser(input) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      lastName: input.lastName,
      dni: input.dni,
      phone: input.phone,
      address: input.address,
      password,
      role: input.role ?? 'MEMBER',
      activeRole: input.activeRole ?? input.role ?? 'MEMBER',
      socialFeeActive: input.socialFeeActive ?? true,
      observations: input.observations,
      allergies: input.allergies,
      regularMedication: input.regularMedication,
      relevantDiseases: input.relevantDiseases,
      physicalRestrictions: input.physicalRestrictions,
      bloodGroup: input.bloodGroup,
      primaryDoctor: input.primaryDoctor,
      doctorPhone: input.doctorPhone,
      roleAssignments: {
        create: (input.roles ?? []).map((role) => ({
          role,
          notes: 'Demo para video web de profesores',
        })),
      },
    },
  });
}

async function createChild(input) {
  return prisma.child.create({
    data: {
      userId: input.userId,
      name: input.name,
      lastName: input.lastName,
      documentNumber: input.documentNumber,
      birthDate: input.birthDate,
      allergies: input.allergies,
      regularMedication: input.regularMedication,
      relevantDiseases: input.relevantDiseases,
      physicalRestrictions: input.physicalRestrictions,
      bloodGroup: input.bloodGroup,
      primaryDoctor: input.primaryDoctor,
      doctorPhone: input.doctorPhone,
    },
  });
}

async function addAttendance(activityDayId, participant, status) {
  return prisma.activityDayAttendance.create({
    data: {
      activityDayId,
      activityParticipantId: participant.id,
      status,
      confirmedAt: status === 'PENDING' ? null : new Date(),
    },
  });
}

async function main() {
  await resetDatabase();

  const admin = await createUser({
    email: 'admin@hualas.demo',
    name: 'Clara',
    lastName: 'Admin',
    dni: '99100001',
    phone: '+54 9 2972 555100',
    address: 'Villegas 640, San Martin de los Andes',
    role: 'ADMIN',
    activeRole: 'ADMIN',
    roles: ['ADMIN'],
  });

  const counter = await createUser({
    email: 'contaduria@hualas.demo',
    name: 'Florencia',
    lastName: 'Cuentas',
    dni: '99100002',
    phone: '+54 9 2972 555101',
    address: 'Villegas 640, San Martin de los Andes',
    role: 'COUNTER',
    activeRole: 'COUNTER',
    roles: ['COUNTER'],
  });

  const professor = await createUser({
    email: 'laura.prof@hualas.demo',
    name: 'Laura',
    lastName: 'Benitez',
    dni: '99100003',
    phone: '+54 9 2972 555102',
    address: 'Los Radales 77',
    role: 'PROFESSOR',
    activeRole: 'PROFESSOR',
    roles: ['PROFESSOR'],
    bloodGroup: '0+',
    primaryDoctor: 'Dra. Paula Salas',
    doctorPhone: '+54 9 2972 500100',
  });

  const assistantProfessor = await createUser({
    email: 'martin.prof@hualas.demo',
    name: 'Martin',
    lastName: 'Rojas',
    dni: '99100004',
    phone: '+54 9 2972 555103',
    address: 'Curruhuinca 315',
    role: 'PROFESSOR',
    activeRole: 'PROFESSOR',
    roles: ['PROFESSOR'],
  });

  const families = await Promise.all([
    createUser({
      email: 'ana.vidal@demo.hualas',
      name: 'Ana',
      lastName: 'Vidal',
      dni: '99100101',
      phone: '+54 9 2972 551001',
      address: 'Los Notros 124',
      observations: 'Prefiere recibir novedades por WhatsApp.',
    }),
    createUser({
      email: 'diego.soto@demo.hualas',
      name: 'Diego',
      lastName: 'Soto',
      dni: '99100102',
      phone: '+54 9 2972 551002',
      address: 'Rudecindo Roca 832',
    }),
    createUser({
      email: 'valeria.moyano@demo.hualas',
      name: 'Valeria',
      lastName: 'Moyano',
      dni: '99100103',
      phone: '+54 9 2972 551003',
      address: 'Perito Moreno 415',
    }),
    createUser({
      email: 'nicolas.arce@demo.hualas',
      name: 'Nicolas',
      lastName: 'Arce',
      dni: '99100104',
      phone: '+54 9 2972 551004',
      address: 'Elordi 1020',
      allergies: 'Sin alergias declaradas.',
      bloodGroup: 'A+',
    }),
  ]);

  const [ana, diego, valeria, nicolas] = families;

  const [mora, tomas, luna, bruno] = await Promise.all([
    createChild({
      userId: ana.id,
      name: 'Mora',
      lastName: 'Vidal',
      documentNumber: '99110101',
      birthDate: new Date(Date.UTC(2015, 4, 14)),
      allergies: 'Alergia leve al mani.',
      regularMedication: 'Antihistaminico si hay reaccion.',
      bloodGroup: 'A+',
      primaryDoctor: 'Dra. Mariana Lago',
      doctorPhone: '+54 9 2972 500111',
    }),
    createChild({
      userId: ana.id,
      name: 'Tomas',
      lastName: 'Vidal',
      documentNumber: '99110102',
      birthDate: new Date(Date.UTC(2017, 9, 3)),
      physicalRestrictions: 'Evitar cargas pesadas por molestia lumbar previa.',
      bloodGroup: '0+',
      primaryDoctor: 'Dr. Pablo Costa',
      doctorPhone: '+54 9 2972 500112',
    }),
    createChild({
      userId: diego.id,
      name: 'Luna',
      lastName: 'Soto',
      documentNumber: '99110103',
      birthDate: new Date(Date.UTC(2014, 1, 21)),
      regularMedication: 'Inhalador preventivo, lo lleva en mochila.',
      relevantDiseases: 'Broncoespasmo estacional.',
      bloodGroup: 'B+',
      primaryDoctor: 'Dra. Carolina Ruiz',
      doctorPhone: '+54 9 2972 500113',
    }),
    createChild({
      userId: valeria.id,
      name: 'Bruno',
      lastName: 'Moyano',
      documentNumber: '99110104',
      birthDate: new Date(Date.UTC(2016, 6, 9)),
      allergies: 'Sin alergias conocidas.',
      bloodGroup: 'AB+',
      primaryDoctor: 'Dr. Esteban Marin',
      doctorPhone: '+54 9 2972 500114',
    }),
  ]);

  for (const responsible of families) {
    await prisma.familyGroup.create({
      data: {
        name: `Familia ${responsible.lastName}`,
        responsibleUserId: responsible.id,
        responsibleName: `${responsible.name} ${responsible.lastName}`,
        responsibleEmail: responsible.email,
        responsiblePhone: responsible.phone,
        members: {
          create: {
            memberId: responsible.id,
            relationship: 'RESPONSIBLE',
            isPaymentResponsible: true,
          },
        },
      },
    });
  }

  const mountainSchool = await prisma.activity.create({
    data: {
      name: 'Escuela de Montana Infantil',
      description:
        'Salidas formativas para chicos y chicas: trekking, orientacion, seguridad y vida en la naturaleza.',
      date: atOffset(-28),
      endDate: addMonths(atOffset(0), 4),
      activityType: 'ANNUAL',
      frequency: 'WEEKLY',
      price: pesos(42000),
      image:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      professors: {
        create: [
          { userId: professor.id },
          { userId: assistantProfessor.id },
        ],
      },
    },
  });

  const climbingLab = await prisma.activity.create({
    data: {
      name: 'Escalada Urbana Juvenil',
      description:
        'Entrenamientos tecnicos de escalada en palestra y salidas progresivas al aire libre.',
      date: atOffset(-18),
      endDate: addMonths(atOffset(0), 3),
      activityType: 'ANNUAL',
      frequency: 'WEEKLY',
      price: pesos(46000),
      image:
        'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80',
      professors: {
        create: [{ userId: professor.id }],
      },
    },
  });

  const [condores, huemules, escaladores] = await Promise.all([
    prisma.activityGroup.create({
      data: {
        activityId: mountainSchool.id,
        name: 'Grupo Condores',
        description: 'Nenas y nenes de 9 a 11 anos con foco en orientacion.',
        capacity: 16,
        minAge: 9,
        maxAge: 11,
      },
    }),
    prisma.activityGroup.create({
      data: {
        activityId: mountainSchool.id,
        name: 'Grupo Huemules',
        description: 'Grupo inicial para salidas cortas y juegos de monte.',
        capacity: 14,
        minAge: 7,
        maxAge: 9,
      },
    }),
    prisma.activityGroup.create({
      data: {
        activityId: climbingLab.id,
        name: 'Grupo Boulder',
        description: 'Entrenamiento tecnico para adolescentes.',
        capacity: 12,
        minAge: 12,
        maxAge: 16,
      },
    }),
  ]);

  const participants = {
    mora: await prisma.activityParticipant.create({
      data: {
        activityId: mountainSchool.id,
        userId: ana.id,
        childId: mora.id,
        participantKey: participantKey(mountainSchool.id, ana.id, mora.id),
      },
    }),
    tomas: await prisma.activityParticipant.create({
      data: {
        activityId: mountainSchool.id,
        userId: ana.id,
        childId: tomas.id,
        participantKey: participantKey(mountainSchool.id, ana.id, tomas.id),
      },
    }),
    luna: await prisma.activityParticipant.create({
      data: {
        activityId: mountainSchool.id,
        userId: diego.id,
        childId: luna.id,
        participantKey: participantKey(mountainSchool.id, diego.id, luna.id),
      },
    }),
    bruno: await prisma.activityParticipant.create({
      data: {
        activityId: mountainSchool.id,
        userId: valeria.id,
        childId: bruno.id,
        participantKey: participantKey(
          mountainSchool.id,
          valeria.id,
          bruno.id
        ),
      },
    }),
    nicolas: await prisma.activityParticipant.create({
      data: {
        activityId: climbingLab.id,
        userId: nicolas.id,
        participantKey: participantKey(climbingLab.id, nicolas.id),
      },
    }),
  };

  await Promise.all([
    prisma.activityGroupMember.create({
      data: {
        activityGroupId: condores.id,
        activityParticipantId: participants.mora.id,
      },
    }),
    prisma.activityGroupMember.create({
      data: {
        activityGroupId: huemules.id,
        activityParticipantId: participants.tomas.id,
      },
    }),
    prisma.activityGroupMember.create({
      data: {
        activityGroupId: condores.id,
        activityParticipantId: participants.luna.id,
      },
    }),
    prisma.activityGroupMember.create({
      data: {
        activityGroupId: condores.id,
        activityParticipantId: participants.bruno.id,
      },
    }),
    prisma.activityGroupMember.create({
      data: {
        activityGroupId: escaladores.id,
        activityParticipantId: participants.nicolas.id,
      },
    }),
  ]);

  const days = {
    previous: await prisma.activityDay.create({
      data: {
        activityId: mountainSchool.id,
        activityGroupId: condores.id,
        createdById: admin.id,
        date: atOffset(-3, 13),
        schedule: '13:00 a 16:00',
        description:
          'Salida corta al bosque del Club Lacar para practicar orientacion con brujula.',
        planificacion:
          'Calentamiento, division en parejas, busqueda de puntos y cierre con hidratacion.',
        devolucion:
          'El grupo trabajo con buena autonomia. Reforzar lectura de referencias naturales.',
        geoLocation: 'Club Lacar - sector bosque escuela',
        latitude: -40.1576,
        longitude: -71.3528,
        sportIcon: 'Senderismo_v.png',
      },
    }),
    today: await prisma.activityDay.create({
      data: {
        activityId: mountainSchool.id,
        activityGroupId: condores.id,
        createdById: admin.id,
        date: atOffset(0, 14),
        schedule: '14:00 a 17:00',
        description:
          'Encuentro de orientacion y seguridad basica antes de la salida al Mirador Bandurrias.',
        planificacion:
          'Chequeo de abrigo y agua, repaso de senales, actividad por postas y devolucion grupal.',
        devolucion:
          'Completar despues de la actividad con observaciones por participante.',
        geoLocation: 'Sede Hualas - patio y sendero corto',
        latitude: -40.1566,
        longitude: -71.3522,
        sportIcon: 'Montanismo.png',
      },
    }),
    next: await prisma.activityDay.create({
      data: {
        activityId: mountainSchool.id,
        activityGroupId: huemules.id,
        createdById: admin.id,
        date: atOffset(2, 15),
        schedule: '15:00 a 17:00',
        description:
          'Juegos de reconocimiento de flora nativa y practicas de caminata segura.',
        planificacion:
          'Ronda inicial, recorrido corto, merienda y cierre con dibujo del sendero.',
        devolucion: 'Pendiente.',
        geoLocation: 'Plaza Centenario - punto de encuentro',
        latitude: -40.1592,
        longitude: -71.3504,
        sportIcon: 'Vidaenlanat_v.png',
      },
    }),
    climbing: await prisma.activityDay.create({
      data: {
        activityId: climbingLab.id,
        activityGroupId: escaladores.id,
        createdById: admin.id,
        date: atOffset(5, 18),
        schedule: '18:00 a 20:00',
        description:
          'Tecnica de pies, bloqueos cortos y preparacion para salida de roca.',
        planificacion:
          'Entrada en calor, circuito de tecnica, boulder guiado y elongacion.',
        devolucion: 'Pendiente.',
        geoLocation: 'Muro Hualas',
        latitude: -40.1559,
        longitude: -71.3516,
        sportIcon: 'Escalada_v.png',
      },
    }),
  };

  await Promise.all([
    prisma.activityDayProfessor.create({
      data: { activityDayId: days.previous.id, userId: professor.id },
    }),
    prisma.activityDayProfessor.create({
      data: { activityDayId: days.today.id, userId: professor.id },
    }),
    prisma.activityDayProfessor.create({
      data: { activityDayId: days.today.id, userId: assistantProfessor.id },
    }),
    prisma.activityDayProfessor.create({
      data: { activityDayId: days.next.id, userId: professor.id },
    }),
    prisma.activityDayProfessor.create({
      data: { activityDayId: days.climbing.id, userId: professor.id },
    }),
  ]);

  await Promise.all([
    addAttendance(days.today.id, participants.mora, 'GOING'),
    addAttendance(days.today.id, participants.luna, 'GOING'),
    addAttendance(days.today.id, participants.bruno, 'PENDING'),
    addAttendance(days.previous.id, participants.mora, 'GOING'),
    addAttendance(days.previous.id, participants.luna, 'NOT_GOING'),
    addAttendance(days.previous.id, participants.bruno, 'GOING'),
    addAttendance(days.next.id, participants.tomas, 'PENDING'),
    addAttendance(days.climbing.id, participants.nicolas, 'GOING'),
  ]);

  await prisma.activityParticipantReport.create({
    data: {
      activityDayId: days.today.id,
      activityParticipantId: participants.mora.id,
      createdById: professor.id,
      body:
        'Mora participo muy concentrada en la posta de orientacion. Avisar a la familia que traiga botella extra para la proxima salida.',
    },
  });

  await prisma.professorProfile.create({
    data: {
      userId: professor.id,
      monthlySalary: pesos(780000),
      bankName: 'Banco Patagonia',
      cbu: '0170099220000001234567',
      alias: 'LAURA.HUALAS.MONTE',
      cuit: '27-99100003-4',
      notes: 'Demo: datos bancarios visibles para el video web.',
      payments: {
        create: [
          {
            periodMonth: monthOffset(-2).month,
            periodYear: monthOffset(-2).year,
            amount: pesos(720000),
            status: 'PAID',
            paidAt: monthOffset(-1).date,
            notes: 'Pago completo por transferencia.',
            createdById: counter.id,
          },
          {
            periodMonth: monthOffset(-1).month,
            periodYear: monthOffset(-1).year,
            amount: pesos(760000),
            status: 'PAID',
            paidAt: new Date(),
            notes: 'Incluye reemplazo de dos jornadas.',
            createdById: counter.id,
          },
          {
            periodMonth: monthOffset(0).month,
            periodYear: monthOffset(0).year,
            amount: pesos(780000),
            status: 'PENDING',
            notes: 'Pendiente de cierre mensual.',
            createdById: counter.id,
          },
        ],
      },
    },
  });

  await prisma.professorInvoice.create({
    data: {
      professorId: professor.id,
      originalName: 'factura-laura-benitez-mayo.pdf',
      contentType: 'application/pdf',
      size: 186420,
      blobUrl: 'https://example.com/demo/factura-laura-benitez-mayo.pdf',
    },
  });

  await Promise.all([
    prisma.news.create({
      data: {
        title: 'Recordatorio para profes: checklist de salida',
        body:
          'Antes de cada encuentro revisar asistencia, agua, abrigo, botiquin y mensajes familiares pendientes.',
        scope: 'CLUB',
        createdById: admin.id,
        createdAt: atOffset(-1, 10),
      },
    }),
    prisma.news.create({
      data: {
        title: 'Escuela de Montana: salida al Mirador Bandurrias',
        body:
          'El grupo Condores trabaja orientacion, cuidado del entorno y registro de observaciones por participante.',
        scope: 'ACTIVITY',
        activityId: mountainSchool.id,
        createdById: admin.id,
        createdAt: atOffset(0, 9),
      },
    }),
  ]);

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: professor.id }, { userId: ana.id }],
      },
      messages: {
        create: [
          {
            senderId: ana.id,
            body:
              'Hola Laura, Mora va con abrigo extra y la autorizacion en la mochila.',
            createdAt: atOffset(0, 9, 10),
          },
          {
            senderId: professor.id,
            body:
              'Perfecto Ana, gracias. Despues de la actividad te dejo una devolucion desde la ficha.',
            createdAt: atOffset(0, 9, 18),
          },
          {
            senderId: ana.id,
            body: 'Genial, quedo atenta. Nos vemos a la salida.',
            createdAt: atOffset(0, 9, 21),
          },
        ],
      },
    },
  });

  const demoData = {
    login: {
      email: professor.email,
      password: 'Demo1234!',
    },
    professorId: professor.id,
    familyContactId: ana.id,
    conversationId: conversation.id,
    activityId: mountainSchool.id,
    activityDayId: days.today.id,
    nextActivityDayId: days.next.id,
    paymentRoute: '/my-payments',
    routes: {
      agenda: '/my-activities',
      session: `/activities/${mountainSchool.id}/days/${days.today.id}`,
      attendance: `/activities/${mountainSchool.id}/days/${days.today.id}/attendance`,
      observations: `/activities/${mountainSchool.id}/days/${days.today.id}/observaciones`,
      description: `/activities/${mountainSchool.id}/days/${days.today.id}/descripcion`,
      information: `/activities/${mountainSchool.id}/days/${days.today.id}/informacion`,
      chat: `/chat?with=${ana.id}`,
      news: '/news',
      payments: '/my-payments',
    },
  };

  await writeFile(
    join(process.cwd(), 'docs/video-profesores-web-demo.json'),
    `${JSON.stringify(demoData, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        message: 'Professor web video demo data ready',
        login: demoData.login,
        routes: demoData.routes,
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
