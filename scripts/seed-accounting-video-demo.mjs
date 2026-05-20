import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const databaseUrl = process.env.DATABASE_URL ?? '';
const allowedLocalTargets = [
  '127.0.0.1:55432/hualas_video',
  'localhost:55432/hualas_video',
];

if (!allowedLocalTargets.some((target) => databaseUrl.includes(target))) {
  throw new Error(
    'seed-accounting-video-demo only runs against the local hualas_video database on port 55432.'
  );
}

const prisma = new PrismaClient();
const password = await hash('Demo1234!', 12);

function pesos(value) {
  return Math.round(value * 100);
}

function atDay(day, hour = 12) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour));
}

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
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
      socialFeeActive: true,
      roleAssignments: {
        create: (input.roles ?? []).map((role) => ({
          role,
          notes: 'Demo para video de contaduria web',
        })),
      },
    },
  });
}

async function main() {
  await resetDatabase();

  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  const previousMonthDate = addMonths(
    new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
    -1
  );
  const previousMonth = previousMonthDate.getUTCMonth() + 1;
  const previousYear = previousMonthDate.getUTCFullYear();

  const [activityConcept, socialFeeConcept, registrationConcept] =
    await Promise.all([
      prisma.billableConcept.create({
        data: {
          code: 'ACTIVITY_FEE',
          name: 'Cuota de actividad',
          description: 'Inscripciones y cuotas de actividades',
          defaultAmount: pesos(42000),
        },
      }),
      prisma.billableConcept.create({
        data: {
          code: 'SOCIAL_FEE',
          name: 'Cuota social',
          description: 'Cuota social mensual del club',
          defaultAmount: pesos(18000),
        },
      }),
      prisma.billableConcept.create({
        data: {
          code: 'REGISTRATION_FEE',
          name: 'Matricula',
          description: 'Alta administrativa de nuevos socios',
          defaultAmount: pesos(12000),
        },
      }),
    ]);

  const counter = await createUser({
    email: 'contaduria@hualas.demo',
    name: 'Florencia',
    lastName: 'Cuentas',
    dni: '99000001',
    phone: '+54 9 2972 555001',
    address: 'Villegas 640, San Martin de los Andes',
    role: 'COUNTER',
    activeRole: 'COUNTER',
    roles: ['COUNTER'],
  });

  const professorA = await createUser({
    email: 'laura.prof@hualas.demo',
    name: 'Laura',
    lastName: 'Benitez',
    dni: '99000002',
    phone: '+54 9 2972 555002',
    role: 'PROFESSOR',
    activeRole: 'PROFESSOR',
    roles: ['PROFESSOR'],
  });

  const professorB = await createUser({
    email: 'martin.prof@hualas.demo',
    name: 'Martin',
    lastName: 'Rojas',
    dni: '99000003',
    phone: '+54 9 2972 555003',
    role: 'PROFESSOR',
    activeRole: 'PROFESSOR',
    roles: ['PROFESSOR'],
  });

  const families = await Promise.all([
    createUser({
      email: 'ana.vidal@demo.hualas',
      name: 'Ana',
      lastName: 'Vidal',
      dni: '99000101',
      phone: '+54 9 2972 551001',
      address: 'Los Notros 124',
    }),
    createUser({
      email: 'diego.soto@demo.hualas',
      name: 'Diego',
      lastName: 'Soto',
      dni: '99000102',
      phone: '+54 9 2972 551002',
      address: 'Rudecindo Roca 832',
    }),
    createUser({
      email: 'valeria.moyano@demo.hualas',
      name: 'Valeria',
      lastName: 'Moyano',
      dni: '99000103',
      phone: '+54 9 2972 551003',
      address: 'Perito Moreno 415',
    }),
    createUser({
      email: 'nicolas.arce@demo.hualas',
      name: 'Nicolas',
      lastName: 'Arce',
      dni: '99000104',
      phone: '+54 9 2972 551004',
      address: 'Elordi 1020',
    }),
  ]);

  const [ana, diego, valeria, nicolas] = families;

  const children = await Promise.all([
    prisma.child.create({
      data: {
        userId: ana.id,
        name: 'Mora',
        lastName: 'Vidal',
        documentNumber: '99010101',
        birthDate: new Date(Date.UTC(2015, 4, 14)),
      },
    }),
    prisma.child.create({
      data: {
        userId: ana.id,
        name: 'Tomas',
        lastName: 'Vidal',
        documentNumber: '99010102',
        birthDate: new Date(Date.UTC(2017, 9, 3)),
      },
    }),
    prisma.child.create({
      data: {
        userId: diego.id,
        name: 'Luna',
        lastName: 'Soto',
        documentNumber: '99010103',
        birthDate: new Date(Date.UTC(2014, 1, 21)),
      },
    }),
    prisma.child.create({
      data: {
        userId: valeria.id,
        name: 'Bruno',
        lastName: 'Moyano',
        documentNumber: '99010104',
        birthDate: new Date(Date.UTC(2016, 6, 9)),
      },
    }),
  ]);

  const [mora, tomas, luna, bruno] = children;

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

  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        name: 'Escuela de Montana Infantil',
        description: 'Salidas formativas de trekking, orientacion y seguridad.',
        date: atDay(3),
        endDate: addMonths(atDay(3), 3),
        activityType: 'ANNUAL',
        frequency: 'WEEKLY',
        price: pesos(46000),
      },
    }),
    prisma.activity.create({
      data: {
        name: 'Escalada Urbana',
        description: 'Tecnica, fuerza y seguridad en muro.',
        date: atDay(7),
        endDate: addMonths(atDay(7), 2),
        activityType: 'TEMPORARY',
        frequency: 'WEEKLY',
        price: pesos(38000),
      },
    }),
    prisma.activity.create({
      data: {
        name: 'Travesia Chapelco',
        description: 'Salida de fin de semana para jovenes y familias.',
        date: atDay(20),
        endDate: atDay(22),
        activityType: 'TEMPORARY',
        frequency: 'ONE_TIME',
        price: pesos(72000),
      },
    }),
  ]);

  const [escuela, escalada, travesia] = activities;

  await Promise.all([
    prisma.activityProfessor.create({
      data: { activityId: escuela.id, userId: professorA.id },
    }),
    prisma.activityProfessor.create({
      data: { activityId: escalada.id, userId: professorB.id },
    }),
    prisma.activityProfessor.create({
      data: { activityId: travesia.id, userId: professorA.id },
    }),
  ]);

  const escaladaDay = await prisma.activityDay.create({
    data: {
      activityId: escalada.id,
      createdById: professorB.id,
      date: atDay(16, 15),
      schedule: '15:00 a 18:00',
      description: 'Practica de tecnica y aseguramiento.',
      geoLocation: 'Muro Hualas',
      sportIcon: 'climbing',
    },
  });

  const participants = await Promise.all([
    prisma.activityParticipant.create({
      data: {
        activityId: escuela.id,
        userId: ana.id,
        childId: mora.id,
        participantKey: participantKey(escuela.id, ana.id, mora.id),
        receipt: 'MP-2605-001',
        receiptDate: atDay(5, 14),
      },
    }),
    prisma.activityParticipant.create({
      data: {
        activityId: escuela.id,
        userId: ana.id,
        childId: tomas.id,
        participantKey: participantKey(escuela.id, ana.id, tomas.id),
        receipt: 'MP-2605-002',
        receiptDate: atDay(6, 11),
      },
    }),
    prisma.activityParticipant.create({
      data: {
        activityId: escalada.id,
        userId: diego.id,
        childId: luna.id,
        participantKey: participantKey(escalada.id, diego.id, luna.id),
        receipt: 'MP-2605-003',
        receiptDate: atDay(9, 15),
      },
    }),
    prisma.activityParticipant.create({
      data: {
        activityId: travesia.id,
        userId: nicolas.id,
        participantKey: participantKey(travesia.id, nicolas.id),
        receipt: 'MP-2605-004',
        receiptDate: atDay(11, 13),
      },
    }),
    prisma.activityParticipant.create({
      data: {
        activityId: escalada.id,
        userId: valeria.id,
        childId: bruno.id,
        participantKey: participantKey(escalada.id, valeria.id, bruno.id),
      },
    }),
  ]);

  await Promise.all([
    prisma.activityParticipantPayment.create({
      data: {
        activityParticipantId: participants[0].id,
        activityId: escuela.id,
        userId: ana.id,
        childId: mora.id,
        paymentType: 'MONTHLY',
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(46000),
        paymentReference: 'MP-2605-001',
        paidAt: atDay(5, 14),
      },
    }),
    prisma.activityParticipantPayment.create({
      data: {
        activityParticipantId: participants[1].id,
        activityId: escuela.id,
        userId: ana.id,
        childId: tomas.id,
        paymentType: 'MONTHLY',
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(46000),
        paymentReference: 'MP-2605-002',
        paidAt: atDay(6, 11),
      },
    }),
    prisma.activityParticipantPayment.create({
      data: {
        activityParticipantId: participants[2].id,
        activityId: escalada.id,
        userId: diego.id,
        childId: luna.id,
        activityDayId: escaladaDay.id,
        paymentType: 'SESSION',
        amount: pesos(38000),
        paymentReference: 'MP-2605-003',
        paidAt: atDay(9, 15),
      },
    }),
    prisma.activityParticipantPayment.create({
      data: {
        activityParticipantId: participants[3].id,
        activityId: travesia.id,
        userId: nicolas.id,
        paymentType: 'SESSION',
        amount: pesos(72000),
        paymentReference: 'MP-2605-004',
        paidAt: atDay(11, 13),
      },
    }),
  ]);

  async function createOrderWithPayment({
    responsible,
    activity,
    status,
    amount,
    createdAt,
    paidAt = null,
    receiptUrl = null,
    payerName,
    payerEmail,
  }) {
    const order = await prisma.order.create({
      data: {
        responsibleUserId: responsible.id,
        responsibleName: `${responsible.name} ${responsible.lastName}`,
        responsibleEmail: responsible.email,
        responsiblePhone: responsible.phone,
        periodMonth: currentMonth,
        periodYear: currentYear,
        status: status === 'APPROVED' ? 'PAID' : 'PENDING_PAYMENT',
        subtotal: amount,
        total: amount,
        paidAt,
        createdAt,
        items: {
          create: [
            {
              memberId: responsible.id,
              activityId: activity.id,
              billableConceptId: activityConcept.id,
              description: activity.name,
              quantity: 1,
              unitPrice: amount,
              total: amount,
              periodMonth: currentMonth,
              periodYear: currentYear,
            },
          ],
        },
      },
    });

    return prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MANUAL_TRANSFER',
        providerPaymentId: `TRF-${order.id.slice(-6).toUpperCase()}`,
        amount,
        status,
        paidAt,
        payerName,
        payerEmail,
        receiptUrl,
        createdAt,
        rawData: {
          uploadedBy: payerName,
          uploadedAt: createdAt.toISOString(),
          proofFileName: `comprobante-${payerName.toLowerCase().replaceAll(' ', '-')}.pdf`,
          proofContentType: 'application/pdf',
          previousRejections: status === 'REJECTED' ? 1 : 0,
          socialFeeAmount: 0,
          familyDiscountAmount: 0,
          validatedItems: [
            {
              activityId: activity.id,
              target: 'self',
              targetLabel: 'Titular',
            },
          ],
          reviews: [
            {
              action: 'uploaded',
              by: payerName,
              at: createdAt.toISOString(),
            },
          ],
          ...(status === 'REJECTED'
            ? {
                accountantComments: 'El comprobante no permite verificar el monto.',
                reviewedAt: atDay(13, 16).toISOString(),
                reviewedBy: 'Florencia Cuentas',
              }
            : {}),
        },
      },
    });
  }

  await Promise.all([
    createOrderWithPayment({
      responsible: valeria,
      activity: escalada,
      status: 'PENDING',
      amount: pesos(38000),
      createdAt: atDay(13, 10),
      receiptUrl: 'manual-payments/demo/valeria-moyano.pdf',
      payerName: 'Valeria Moyano',
      payerEmail: valeria.email,
    }),
    createOrderWithPayment({
      responsible: diego,
      activity: travesia,
      status: 'APPROVED',
      amount: pesos(72000),
      createdAt: atDay(10, 10),
      paidAt: atDay(10, 17),
      receiptUrl: 'manual-payments/demo/diego-soto.pdf',
      payerName: 'Diego Soto',
      payerEmail: diego.email,
    }),
    createOrderWithPayment({
      responsible: nicolas,
      activity: escuela,
      status: 'REJECTED',
      amount: pesos(46000),
      createdAt: atDay(12, 9),
      receiptUrl: 'manual-payments/demo/nicolas-arce.pdf',
      payerName: 'Nicolas Arce',
      payerEmail: nicolas.email,
    }),
  ]);

  await Promise.all([
    prisma.socialFeePayment.create({
      data: {
        userId: ana.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(18000),
        mercadoPagoPaymentId: 'SOC-2605-001',
        createdAt: atDay(3, 9),
      },
    }),
    prisma.socialFeePayment.create({
      data: {
        userId: ana.id,
        childId: mora.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(18000),
        mercadoPagoPaymentId: 'SOC-2605-002',
        createdAt: atDay(3, 9),
      },
    }),
    prisma.socialFeePayment.create({
      data: {
        userId: diego.id,
        childId: luna.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(18000),
        mercadoPagoPaymentId: 'SOC-2605-003',
        createdAt: atDay(7, 12),
      },
    }),
    prisma.socialFeePayment.create({
      data: {
        userId: counter.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(18000),
        mercadoPagoPaymentId: 'SOC-2605-004',
        createdAt: atDay(8, 10),
      },
    }),
  ]);

  async function createSocialFeeOrder({ responsible, status, month, year, paidAt }) {
    const total = pesos(18000);
    const order = await prisma.order.create({
      data: {
        responsibleUserId: responsible.id,
        responsibleName: `${responsible.name} ${responsible.lastName}`,
        responsibleEmail: responsible.email,
        responsiblePhone: responsible.phone,
        periodMonth: month,
        periodYear: year,
        status,
        subtotal: total,
        total,
        paidAt,
        items: {
          create: {
            memberId: responsible.id,
            billableConceptId: socialFeeConcept.id,
            description: `Cuota social ${String(month).padStart(2, '0')}/${year}`,
            quantity: 1,
            unitPrice: total,
            total,
            periodMonth: month,
            periodYear: year,
          },
        },
      },
    });

    if (paidAt) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'MERCADO_PAGO',
          providerPaymentId: `SOC-${order.id.slice(-6).toUpperCase()}`,
          amount: total,
          status: 'APPROVED',
          paidAt,
          payerName: `${responsible.name} ${responsible.lastName}`,
          payerEmail: responsible.email,
        },
      });
    }

    return order;
  }

  await Promise.all([
    createSocialFeeOrder({
      responsible: ana,
      status: 'PAID',
      month: currentMonth,
      year: currentYear,
      paidAt: atDay(3, 9),
    }),
    createSocialFeeOrder({
      responsible: diego,
      status: 'PARTIALLY_PAID',
      month: currentMonth,
      year: currentYear,
      paidAt: atDay(7, 12),
    }),
    createSocialFeeOrder({
      responsible: valeria,
      status: 'PENDING_PAYMENT',
      month: currentMonth,
      year: currentYear,
      paidAt: null,
    }),
    createSocialFeeOrder({
      responsible: nicolas,
      status: 'PENDING_PAYMENT',
      month: previousMonth,
      year: previousYear,
      paidAt: null,
    }),
  ]);

  await Promise.all([
    prisma.accountingMovement.create({
      data: {
        date: atDay(2, 11),
        amount: pesos(120000),
        type: 'INCOME',
        category: 'Subsidios',
        description: 'Aporte municipal para salidas educativas',
        receiptNumber: 'REC-00124',
        createdById: counter.id,
      },
    }),
    prisma.accountingMovement.create({
      data: {
        date: atDay(4, 16),
        amount: pesos(43500),
        type: 'EXPENSE',
        category: 'Equipamiento',
        description: 'Reposicion de cascos y mosquetones',
        receiptNumber: 'FAC-A-0008',
        createdById: counter.id,
      },
    }),
    prisma.accountingMovement.create({
      data: {
        date: atDay(8, 10),
        amount: pesos(29500),
        type: 'EXPENSE',
        category: 'Servicios',
        description: 'Seguro mensual de actividades',
        receiptNumber: 'SEG-0526',
        createdById: counter.id,
      },
    }),
    prisma.accountingMovement.create({
      data: {
        date: atDay(14, 13),
        amount: pesos(68000),
        type: 'INCOME',
        category: 'Eventos',
        description: 'Feria comunitaria Hualas',
        receiptNumber: 'REC-00131',
        createdById: counter.id,
      },
    }),
  ]);

  const profileA = await prisma.professorProfile.create({
    data: {
      userId: professorA.id,
      monthlySalary: pesos(320000),
      bankName: 'Banco Patagonia',
      cbu: '0270000000000000000001',
      alias: 'laura.hualas',
      cuit: '27-99000002-1',
      notes: 'Coordina escuela infantil y travesias.',
    },
  });

  const profileB = await prisma.professorProfile.create({
    data: {
      userId: professorB.id,
      monthlySalary: pesos(285000),
      bankName: 'Banco Provincia del Neuquen',
      cbu: '0970000000000000000002',
      alias: 'martin.hualas',
      cuit: '20-99000003-5',
      notes: 'Responsable de escalada.',
    },
  });

  await Promise.all([
    prisma.professorPayment.create({
      data: {
        professorProfileId: profileA.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(320000),
        status: 'PAID',
        paidAt: atDay(15, 12),
        createdById: counter.id,
      },
    }),
    prisma.professorPayment.create({
      data: {
        professorProfileId: profileA.id,
        periodMonth: previousMonth,
        periodYear: previousYear,
        amount: pesos(320000),
        status: 'PAID',
        paidAt: addMonths(atDay(15, 12), -1),
        createdById: counter.id,
      },
    }),
    prisma.professorPayment.create({
      data: {
        professorProfileId: profileB.id,
        periodMonth: currentMonth,
        periodYear: currentYear,
        amount: pesos(285000),
        status: 'PENDING',
        createdById: counter.id,
      },
    }),
  ]);

  await prisma.professorInvoice.create({
    data: {
      professorId: professorA.id,
      originalName: 'factura-laura-benitez-mayo.pdf',
      contentType: 'application/pdf',
      size: 184320,
      blobUrl: 'professor-invoices/demo/factura-laura-benitez-mayo.pdf',
    },
  });

  console.log(
    JSON.stringify(
      {
        login: 'contaduria@hualas.demo',
        password: 'Demo1234!',
        users: await prisma.user.count(),
        activities: await prisma.activity.count(),
        accountingMovements: await prisma.accountingMovement.count(),
        payments: await prisma.payment.count(),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
