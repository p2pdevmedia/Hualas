import { PrismaClient, PaymentProvider } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_PAYMENT_PROVIDERS = [
  PaymentProvider.MANUAL_TRANSFER,
  PaymentProvider.MERCADO_PAGO,
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    confirm: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--confirm') options.confirm = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }
  }

  return options;
}

function printUsage() {
  console.log(`Uso:
  node scripts/cleanup-activity-data.mjs --dry-run
  node scripts/cleanup-activity-data.mjs --confirm

Opciones:
  --dry-run   Muestra cuantas filas se borrarian sin tocar la base.
  --confirm   Ejecuta el borrado.
  --help      Muestra esta ayuda.

Requiere DATABASE_URL cargada en el entorno.
`);
}

async function collectSummary(db) {
  const [
    activityParticipants,
    activityParticipantPayments,
    activityDayAttendances,
    activityGroupMembers,
    socialFeePayments,
    targetPayments,
    safeOrders,
    mercadopagoNotifications,
  ] = await Promise.all([
    db.activityParticipant.findMany({
      select: { id: true, userId: true, childId: true },
    }),
    db.activityParticipantPayment.count(),
    db.activityDayAttendance.count(),
    db.activityGroupMember.count(),
    db.socialFeePayment.count(),
    db.payment.findMany({
      where: { provider: { in: TARGET_PAYMENT_PROVIDERS } },
      select: { id: true, orderId: true, provider: true },
    }),
    db.order.findMany({
      where: {
        payments: { some: { provider: { in: TARGET_PAYMENT_PROVIDERS } } },
        NOT: {
          payments: { some: { provider: { notIn: TARGET_PAYMENT_PROVIDERS } } },
        },
      },
      select: { id: true },
    }),
    db.mercadoPagoNotification.count(),
  ]);

  const activityParticipantReportsResult = await db.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "ActivityParticipantReport"
  `;
  const activityParticipantReports =
    activityParticipantReportsResult[0]?.count ?? 0;

  return {
    activityParticipants: activityParticipants.length,
    activityParticipantPayments,
    activityDayAttendances,
    activityParticipantReports,
    activityGroupMembers,
    socialFeePayments,
    targetPayments,
    safeOrders,
    mercadopagoNotifications,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  if (!options.dryRun && !options.confirm) {
    printUsage();
    throw new Error(
      'Falta --confirm. Usa --dry-run para previsualizar el borrado.'
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Falta DATABASE_URL en el entorno. Carga las variables de entorno antes de ejecutar este script.'
    );
  }

  const summary = await collectSummary(prisma);
  const mixedOrderIds = new Set(
    summary.targetPayments.map((payment) => payment.orderId)
  );
  for (const order of summary.safeOrders) {
    mixedOrderIds.delete(order.id);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'execute',
        activityParticipants: summary.activityParticipants,
        activityParticipantPayments: summary.activityParticipantPayments,
        activityDayAttendances: summary.activityDayAttendances,
        activityParticipantReports: summary.activityParticipantReports,
        activityGroupMembers: summary.activityGroupMembers,
        socialFeePayments: summary.socialFeePayments,
        targetPayments: summary.targetPayments.length,
        safeOrders: summary.safeOrders.length,
        mixedOrdersWithTargetPayments: mixedOrderIds.size,
        mercadopagoNotifications: summary.mercadopagoNotifications,
      },
      null,
      2
    )
  );

  if (options.dryRun) {
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const deletedActivityDayAttendances = await tx.activityDayAttendance.deleteMany(
      {}
    );

    const deletedActivityGroupMembers = await tx.activityGroupMember.deleteMany(
      {}
    );

    const deletedActivityParticipantReports = await tx.$executeRaw`
      DELETE FROM "ActivityParticipantReport"
    `;

    const deletedActivityParticipantPayments =
      await tx.activityParticipantPayment.deleteMany({});

    const deletedActivityParticipants = await tx.activityParticipant.deleteMany(
      {}
    );

    const deletedSocialFeePayments = await tx.socialFeePayment.deleteMany({});

    const updatedUsers = await tx.user.updateMany({
      data: {
        socialFeeActive: false,
      },
    });

    const deletedTargetPayments = await tx.payment.deleteMany({
      where: {
        id: {
          in: summary.targetPayments.map((payment) => payment.id),
        },
      },
    });

    const deletedSafeOrders = await tx.order.deleteMany({
      where: {
        id: {
          in: summary.safeOrders.map((order) => order.id),
        },
      },
    });

    const deletedMercadoPagoNotifications =
      await tx.mercadoPagoNotification.deleteMany({});

    return {
      deletedActivityDayAttendances,
      deletedActivityParticipantReports,
      deletedActivityGroupMembers,
      deletedActivityParticipantPayments,
      deletedActivityParticipants,
      deletedSocialFeePayments,
      updatedUsers,
      deletedTargetPayments,
      deletedSafeOrders,
      deletedMercadoPagoNotifications,
    };
  });

  console.log(
    JSON.stringify(
      {
        deleted: {
          activityDayAttendances:
            deleted.deletedActivityDayAttendances.count,
          activityParticipantReports:
            deleted.deletedActivityParticipantReports,
          activityGroupMembers: deleted.deletedActivityGroupMembers.count,
          activityParticipantPayments:
            deleted.deletedActivityParticipantPayments.count,
          activityParticipants: deleted.deletedActivityParticipants.count,
          socialFeePayments: deleted.deletedSocialFeePayments.count,
          updatedUsers: deleted.updatedUsers.count,
          targetPayments: deleted.deletedTargetPayments.count,
          safeOrders: deleted.deletedSafeOrders.count,
          mercadopagoNotifications:
            deleted.deletedMercadoPagoNotifications.count,
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('[cleanup-activity-data] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
