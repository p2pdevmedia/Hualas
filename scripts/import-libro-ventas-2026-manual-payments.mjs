import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { BillableConceptCode, PrismaClient } from '@prisma/client';

const WORKBOOK_PATH = 'libro_ventas_28_02_2026.xlsx';
const SHEET_NAME = 'Sheet1';
const IMPORT_KEY = 'LIBRO_VENTAS_28_02_2026';
const IMPORTED_BY = 'Importacion libro ventas';
const APPROVED_BY = 'Contaduria';
const APPROVAL_COMMENT = 'Importado y verificado desde libro de ventas';
const PROOF_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const prisma = new PrismaClient();

function readZipEntry(entryName) {
  return execFileSync('unzip', ['-p', WORKBOOK_PATH, entryName], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function stripTags(value) {
  return decodeXml(value.replace(/<[^>]+>/g, ''));
}

function normalize(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDigits(value) {
  return normalize(value).replace(/\D+/g, '');
}

function parseDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalize(value));
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (![day, month, year].every(Number.isInteger)) return null;

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function parseAmount(value) {
  const parsed = Number(normalize(value).replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function formatPeriodKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}`;
}

function stableId(prefix, value) {
  return `${prefix}_${createHash('sha1').update(value).digest('hex').slice(0, 24)}`;
}

function parseSharedStrings() {
  try {
    const sharedXml = readZipEntry('xl/sharedStrings.xml');
    return [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(
      ([, inner]) => stripTags(inner).replace(/\s+/g, ' ').trim()
    );
  } catch {
    return [];
  }
}

function getWorkbookSheetPath(sheetName) {
  const workbookXml = readZipEntry('xl/workbook.xml');
  const relsXml = readZipEntry('xl/_rels/workbook.xml.rels');

  const relTargets = new Map(
    [
      ...relsXml.matchAll(
        /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g
      ),
    ].map(([, id, target]) => [id, target])
  );

  const sheetMatch = new RegExp(
    `<sheet[^>]+name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]+r:id="([^"]+)"`
  ).exec(workbookXml);

  if (!sheetMatch) {
    throw new Error(`No se encontró la hoja "${sheetName}".`);
  }

  const target = relTargets.get(sheetMatch[1]);
  if (!target) {
    throw new Error(
      `No se pudo resolver la relación de la hoja "${sheetName}".`
    );
  }

  return `xl/${target}`;
}

function cellValue(cellXml, sharedStrings) {
  const type = / t="([^"]+)"/.exec(cellXml)?.[1];

  if (type === 'inlineStr') {
    const textMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cellXml);
    return textMatch ? stripTags(textMatch[1]).trim() : '';
  }

  const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(cellXml);
  if (!valueMatch) return '';

  if (type === 's') {
    return sharedStrings[Number(valueMatch[1])] ?? '';
  }

  return valueMatch[1].trim();
}

function parseRows(sheetName) {
  const sharedStrings = parseSharedStrings();
  const sheetPath = getWorkbookSheetPath(sheetName);
  const sheetXml = readZipEntry(sheetPath);
  const rows = [];

  for (const rowMatch of sheetXml.matchAll(
    /<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  )) {
    const rowNumber = Number(rowMatch[1]);
    if (rowNumber === 1) continue;

    const values = {};
    for (const cellMatch of rowMatch[2].matchAll(
      /<c[^>]+r="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>/g
    )) {
      const refMatch = /r="([A-Z]+)\d+"/.exec(cellMatch[0]);
      if (!refMatch) continue;
      values[refMatch[1]] = cellValue(cellMatch[0], sharedStrings);
    }

    if (Object.values(values).every((value) => !String(value).trim())) {
      continue;
    }

    rows.push({ rowNumber, values });
  }

  return rows;
}

function buildRawData({
  sourceDate,
  socialFeeAmount,
  socialFeeParticipants,
  validatedItems,
}) {
  const at = sourceDate.toISOString();
  return {
    uploadedBy: IMPORTED_BY,
    uploadedAt: at,
    proofFileName: WORKBOOK_PATH,
    proofContentType: PROOF_CONTENT_TYPE,
    accountantComments: APPROVAL_COMMENT,
    reviewedAt: at,
    reviewedBy: APPROVED_BY,
    previousRejections: 0,
    socialFeeAmount,
    familyDiscountAmount: 0,
    socialFeeParticipants,
    validatedItems,
    reviews: [
      {
        action: 'uploaded',
        by: IMPORTED_BY,
        at,
      },
      {
        action: 'approved',
        by: APPROVED_BY,
        at,
        result: 'approved',
        comment: APPROVAL_COMMENT,
      },
    ],
    sourceWorkbook: WORKBOOK_PATH,
  };
}

function formatPersonName(person) {
  return (
    `${person?.name ?? ''} ${person?.lastName ?? ''}`.trim() || 'Sin nombre'
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = parseRows(SHEET_NAME);

  const validRows = rows
    .map((row) => {
      const date = parseDate(row.values.A);
      const docType = normalize(row.values.E);
      const dni = cleanDigits(row.values.F);
      const workbookName = normalize(row.values.G);
      const activityLabel = normalize(row.values.J);
      const socialFeeAmount = parseAmount(row.values.K);
      const activityAmount = parseAmount(row.values.L) ?? 0;

      if (
        !date ||
        docType !== 'DNI' ||
        !dni ||
        dni === '999999997' ||
        !workbookName ||
        !activityLabel ||
        socialFeeAmount == null ||
        socialFeeAmount <= 0
      ) {
        return null;
      }

      return {
        rowNumber: row.rowNumber,
        date,
        dni,
        workbookName,
        auth: normalize(row.values.D),
        activityLabel,
        activityAmount,
        socialFeeAmount,
      };
    })
    .filter(Boolean);

  const dnis = [...new Set(validRows.map((row) => row.dni))];
  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { dni: { in: dnis } },
      select: { id: true, dni: true, name: true, lastName: true, email: true },
    }),
    prisma.child.findMany({
      where: { documentNumber: { in: dnis } },
      select: {
        id: true,
        documentNumber: true,
        name: true,
        lastName: true,
        userId: true,
      },
    }),
  ]);

  const parentUserIds = [...new Set(children.map((child) => child.userId))];
  const parentUsers =
    parentUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: parentUserIds } },
          select: {
            id: true,
            dni: true,
            name: true,
            lastName: true,
            email: true,
          },
        })
      : [];

  const userByDni = new Map([
    ...users.map((user) => [user.dni, user]),
    ...parentUsers.map((user) => [user.dni, user]),
  ]);
  const userById = new Map([
    ...users.map((user) => [user.id, user]),
    ...parentUsers.map((user) => [user.id, user]),
  ]);
  const childByDni = new Map(
    children.map((child) => [child.documentNumber, child])
  );

  const items = [];
  const skippedUnmatched = [];

  for (const row of validRows) {
    const child = childByDni.get(row.dni) ?? null;
    const responsibleUser = child
      ? (userById.get(child.userId) ?? null)
      : (userByDni.get(row.dni) ?? null);

    if (!responsibleUser) {
      if (skippedUnmatched.length < 10) {
        skippedUnmatched.push({
          rowNumber: row.rowNumber,
          date: row.date.toISOString().slice(0, 10),
          dni: row.dni,
          name: row.workbookName,
          amount: row.socialFeeAmount + row.activityAmount,
        });
      }
      continue;
    }

    items.push({
      rowNumber: row.rowNumber,
      date: row.date,
      periodMonth: row.date.getUTCMonth() + 1,
      periodYear: row.date.getUTCFullYear(),
      userId: responsibleUser.id,
      childId: child?.id ?? null,
      responsibleName: formatPersonName(responsibleUser),
      responsibleEmail: responsibleUser.email?.trim() || null,
      workbookName: row.workbookName,
      activityLabel: row.activityLabel,
      activityAmount: row.activityAmount,
      socialFeeAmount: row.socialFeeAmount,
      importKey: `${IMPORT_KEY}:${row.auth || `row-${row.rowNumber}`}`,
    });
  }

  const activityStats = new Map();
  for (const item of items) {
    if (item.activityLabel === 'CUOTA SOCIAL') {
      continue;
    }

    const stats = activityStats.get(item.activityLabel) ?? {
      firstDate: item.date,
      lastDate: item.date,
      amountCounts: new Map(),
      latestAmount: item.activityAmount,
      latestRowNumber: item.rowNumber,
    };

    if (item.date < stats.firstDate) stats.firstDate = item.date;
    if (item.date > stats.lastDate) stats.lastDate = item.date;
    stats.amountCounts.set(
      item.activityAmount,
      (stats.amountCounts.get(item.activityAmount) ?? 0) + 1
    );
    if (item.rowNumber > stats.latestRowNumber) {
      stats.latestRowNumber = item.rowNumber;
      stats.latestAmount = item.activityAmount;
    }

    activityStats.set(item.activityLabel, stats);
  }

  const activityLabels = [...activityStats.keys()];
  const existingActivities = await prisma.activity.findMany({
    where: { name: { in: activityLabels } },
    select: { id: true, name: true },
  });
  const activityMap = new Map(
    existingActivities.map((activity) => [activity.name, activity.id])
  );
  const plannedCreatedActivities = activityLabels.filter(
    (label) => label !== 'CUOTA SOCIAL' && !activityMap.has(label)
  ).length;

  let createdActivities = 0;
  if (!dryRun) {
    for (const [label, stats] of activityStats.entries()) {
      if (activityMap.has(label)) continue;

      const amounts = [...stats.amountCounts.entries()].sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        return right[0] - left[0];
      });
      const price = amounts[0]?.[0] ?? stats.latestAmount ?? 0;

      const created = await prisma.activity.create({
        data: {
          name: label,
          date: stats.firstDate,
          endDate: stats.lastDate,
          activityType: 'TEMPORARY',
          frequency: 'ONE_TIME',
          image: null,
          description: `Actividad histórica importada desde ${WORKBOOK_PATH}`,
          price,
          capacity: null,
        },
        select: { id: true },
      });

      activityMap.set(label, created.id);
      createdActivities += 1;
    }
  }

  const [activityFeeConcept, socialFeeConcept] = await prisma.$transaction([
    prisma.billableConcept.upsert({
      where: { code: BillableConceptCode.ACTIVITY_FEE },
      create: {
        code: BillableConceptCode.ACTIVITY_FEE,
        name: 'Cuota de actividad',
        active: true,
      },
      update: { active: true },
      select: { id: true },
    }),
    prisma.billableConcept.upsert({
      where: { code: BillableConceptCode.SOCIAL_FEE },
      create: {
        code: BillableConceptCode.SOCIAL_FEE,
        name: 'Cuota social',
        active: true,
      },
      update: { active: true },
      select: { id: true },
    }),
  ]);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          workbook: WORKBOOK_PATH,
          parsedRows: rows.length,
          validPaymentRows: validRows.length,
          dedupedPayments: items.length,
          skippedUnmatched: skippedUnmatched.length,
          plannedCreatedActivities,
          existingActivities: existingActivities.length,
          sampleUnmatched: skippedUnmatched,
        },
        null,
        2
      )
    );
    return;
  }

  let createdPayments = 0;
  let updatedPayments = 0;
  let createdSocialFeePayments = 0;
  let updatedSocialFeePayments = 0;
  let upsertedParticipants = 0;

  for (const item of items) {
    const isSocialOnly = item.activityLabel === 'CUOTA SOCIAL';
    const activityId = isSocialOnly
      ? null
      : activityMap.get(item.activityLabel);
    if (!isSocialOnly && !activityId) {
      throw new Error(
        `No se pudo resolver la actividad "${item.activityLabel}".`
      );
    }

    const paymentDate = item.date;
    const paymentId = stableId('manualpay', item.importKey);
    const orderId = stableId('manualorder', item.importKey);
    const orderTotal =
      item.socialFeeAmount + (isSocialOnly ? 0 : item.activityAmount);
    const rawData = buildRawData({
      sourceDate: paymentDate,
      socialFeeAmount: item.socialFeeAmount,
      socialFeeParticipants: [
        {
          userId: item.userId,
          childId: item.childId,
        },
      ],
      validatedItems: isSocialOnly
        ? []
        : [
            {
              activityId,
              target: item.childId ?? 'self',
              targetLabel: item.activityLabel,
            },
          ],
    });

    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true },
    });
    const existingSocialFee = await prisma.socialFeePayment.findFirst({
      where: {
        userId: item.userId,
        childId: item.childId,
        periodMonth: item.periodMonth,
        periodYear: item.periodYear,
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.upsert({
        where: { id: orderId },
        create: {
          id: orderId,
          responsibleUserId: item.userId,
          responsibleName: item.responsibleName,
          responsibleEmail: item.responsibleEmail ?? 'sin-email@hualas.local',
          periodMonth: item.periodMonth,
          periodYear: item.periodYear,
          status: 'PAID',
          subtotal: orderTotal,
          discountTotal: 0,
          surchargeTotal: 0,
          total: orderTotal,
          paidAt: paymentDate,
        },
        update: {
          responsibleUserId: item.userId,
          responsibleName: item.responsibleName,
          responsibleEmail: item.responsibleEmail ?? 'sin-email@hualas.local',
          periodMonth: item.periodMonth,
          periodYear: item.periodYear,
          status: 'PAID',
          subtotal: orderTotal,
          discountTotal: 0,
          surchargeTotal: 0,
          total: orderTotal,
          paidAt: paymentDate,
        },
      });

      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      const orderItemData = [
        ...(isSocialOnly
          ? []
          : [
              {
                orderId: order.id,
                memberId: item.childId ? null : item.userId,
                activityId,
                billableConceptId: activityFeeConcept.id,
                description: item.activityLabel,
                quantity: 1,
                unitPrice: item.activityAmount,
                total: item.activityAmount,
                periodMonth: item.periodMonth,
                periodYear: item.periodYear,
                status: 'PAID',
              },
            ]),
        {
          orderId: order.id,
          memberId: item.userId,
          billableConceptId: socialFeeConcept.id,
          description: `${item.workbookName} - cuota social ${String(item.periodMonth).padStart(2, '0')}/${item.periodYear}`,
          quantity: 1,
          unitPrice: item.socialFeeAmount,
          total: item.socialFeeAmount,
          periodMonth: item.periodMonth,
          periodYear: item.periodYear,
          status: 'PAID',
        },
      ];

      await tx.orderItem.createMany({
        data: orderItemData,
      });

      await tx.payment.upsert({
        where: { id: paymentId },
        create: {
          id: paymentId,
          orderId: order.id,
          provider: 'MANUAL_TRANSFER',
          providerPaymentId: item.importKey,
          amount: orderTotal * 100,
          currency: 'ARS',
          status: 'APPROVED',
          paidAt: paymentDate,
          payerName: item.responsibleName,
          payerEmail: item.responsibleEmail,
          receiptUrl: null,
          rawData,
        },
        update: {
          orderId: order.id,
          providerPaymentId: item.importKey,
          amount: orderTotal * 100,
          currency: 'ARS',
          status: 'APPROVED',
          paidAt: paymentDate,
          payerName: item.responsibleName,
          payerEmail: item.responsibleEmail,
          receiptUrl: null,
          rawData,
        },
      });

      if (!isSocialOnly) {
        await tx.activityParticipant.upsert({
          where: {
            participantKey: `${activityId}:${item.userId}:${item.childId ?? 'self'}`,
          },
          create: {
            activityId,
            userId: item.userId,
            childId: item.childId,
            participantKey: `${activityId}:${item.userId}:${item.childId ?? 'self'}`,
            receipt: paymentId,
            receiptDate: paymentDate,
          },
          update: {
            activityId,
            userId: item.userId,
            childId: item.childId,
            receipt: paymentId,
            receiptDate: paymentDate,
          },
        });
      }
    });

    if (existingPayment) {
      updatedPayments += 1;
    } else {
      createdPayments += 1;
    }

    if (existingSocialFee) {
      await prisma.socialFeePayment.update({
        where: { id: existingSocialFee.id },
        data: {
          amount: item.socialFeeAmount,
          mercadoPagoPaymentId: paymentId,
          createdAt: paymentDate,
        },
      });
      updatedSocialFeePayments += 1;
    } else {
      await prisma.socialFeePayment.create({
        data: {
          userId: item.userId,
          childId: item.childId,
          periodMonth: item.periodMonth,
          periodYear: item.periodYear,
          amount: item.socialFeeAmount,
          mercadoPagoPaymentId: paymentId,
          createdAt: paymentDate,
        },
      });
      createdSocialFeePayments += 1;
    }

    upsertedParticipants += 1;
  }

  console.log(
    JSON.stringify(
      {
        workbook: WORKBOOK_PATH,
        parsedRows: rows.length,
        validPaymentRows: validRows.length,
        dedupedPayments: items.length,
        createdActivities,
        existingActivities: existingActivities.length,
        createdPayments,
        updatedPayments,
        createdSocialFeePayments,
        updatedSocialFeePayments,
        upsertedParticipants,
        skippedUnmatched: skippedUnmatched.length,
        sampleUnmatched: skippedUnmatched,
      },
      null,
      2
    )
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
