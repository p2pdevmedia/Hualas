import './import-libro-ventas-2026-manual-payments.mjs';

/*
Legacy importer retained below for reference only.

const WORKBOOK_PATH = 'libro_ventas_28_02_2026.xlsx';
const SHEET_NAME = 'Sheet1';

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
    [...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map(
      ([, id, target]) => [id, target]
    )
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
  const typeMatch = / t="([^"]+)"/.exec(cellXml);
  const type = typeMatch?.[1];

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
    const cells = [
      ...rowMatch[2].matchAll(/<c[^>]+r="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>/g),
    ];

    for (const cellMatch of cells) {
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

function normalize(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDigits(value) {
  return normalize(value).replace(/\D+/g, '');
}

function parseDate(value) {
  const text = normalize(value);
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return null;

  const month = Number(match[2]);
  const year = Number(match[3]);
  const day = Number(match[1]);

  if (!Number.isInteger(month) || !Number.isInteger(year) || !Number.isInteger(day)) {
    return null;
  }

  return { day, month, year };
}

function formatPeriod(period) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function buildSyntheticPaymentId(row) {
  if (row.auth) {
    return `LIBRO_VENTAS_28_02_2026:${row.auth}`;
  }

  return `LIBRO_VENTAS_28_02_2026:row-${row.rowNumber}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = parseRows(SHEET_NAME);

  const validRows = rows
    .map((row) => {
      const date = parseDate(row.values.A);
      const docType = normalize(row.values.E);
      const dni = cleanDigits(row.values.F);
      const name = normalize(row.values.G);
      const socialAmount = Math.round(Number(normalize(row.values.K)));

      if (
        !date ||
        docType !== 'DNI' ||
        !dni ||
        dni === '999999997' ||
        !name ||
        !Number.isFinite(socialAmount) ||
        socialAmount <= 0
      ) {
        return null;
      }

      return {
        rowNumber: row.rowNumber,
        date,
        dni,
        name,
        socialAmount,
        auth: normalize(row.values.D),
      };
    })
    .filter((row) => Boolean(row));

  const dnis = [...new Set(validRows.map((row) => row.dni))];
  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { dni: { in: dnis } },
      select: { id: true, dni: true, name: true, lastName: true },
    }),
    prisma.child.findMany({
      where: { documentNumber: { in: dnis } },
      select: { id: true, documentNumber: true, name: true, lastName: true, userId: true },
    }),
  ]);

  const userMap = new Map(users.map((user) => [user.dni, user.id]));
  const childMap = new Map(
    children.map((child) => [child.documentNumber, { id: child.id, userId: child.userId }])
  );

  const deduped = new Map();
  const skippedUnmatched = [];

  for (const row of validRows) {
    const periodKey = formatPeriod(row.date);
    const child = childMap.get(row.dni);
    const userId = child ? child.userId : userMap.get(row.dni);

    if (!userId) {
      if (skippedUnmatched.length < 10) {
        skippedUnmatched.push({
          rowNumber: row.rowNumber,
          date: row.date,
          dni: row.dni,
          name: row.name,
          amount: row.socialAmount,
        });
      }
      continue;
    }

    const personKey = `${userId}:${child?.id ?? ''}:${periodKey}`;
    const current = deduped.get(personKey);

    if (!current || row.rowNumber > current.rowNumber) {
      deduped.set(personKey, {
        rowNumber: row.rowNumber,
        periodMonth: row.date.month,
        periodYear: row.date.year,
        userId,
        childId: child?.id ?? null,
        amount: row.socialAmount,
          mercadoPagoPaymentId: buildSyntheticPaymentId(row),
        });
      }
  }

  const items = [...deduped.values()];

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          workbook: WORKBOOK_PATH,
          parsedRows: rows.length,
          validPaymentRows: validRows.length,
          dedupedPayments: items.length,
          skippedUnmatched: skippedUnmatched.length,
          sampleUnmatched: skippedUnmatched,
        },
        null,
        2
      )
    );
    return;
  }

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const existing = await prisma.socialFeePayment.findFirst({
      where: {
        userId: item.userId,
        childId: item.childId,
        periodMonth: item.periodMonth,
        periodYear: item.periodYear,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.socialFeePayment.update({
        where: { id: existing.id },
        data: {
          amount: item.amount,
          mercadoPagoPaymentId: item.mercadoPagoPaymentId,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.socialFeePayment.create({
      data: {
        userId: item.userId,
        childId: item.childId,
        periodMonth: item.periodMonth,
        periodYear: item.periodYear,
        amount: item.amount,
        mercadoPagoPaymentId: item.mercadoPagoPaymentId,
      },
    });
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        workbook: WORKBOOK_PATH,
        parsedRows: rows.length,
        validPaymentRows: validRows.length,
        dedupedPayments: items.length,
        created,
        updated,
        skippedUnmatched: skippedUnmatched.length,
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
*/
