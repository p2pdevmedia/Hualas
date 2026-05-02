import { execFileSync } from 'node:child_process';
import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const WORKBOOK_PATH = 'USUARIOS HUALAS.xlsx';
const DEFAULT_PASSWORD = 'Test1234!';
const EXCEL_EPOCH = 25569;
const DAY_MS = 86400000;

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

    rows.push(values);
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

function splitName(value) {
  const text = normalize(value);
  if (!text) return { name: '', lastName: null };

  const parts = text.split(' ');
  if (parts.length === 1) {
    return { name: text, lastName: null };
  }

  return {
    name: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1) ?? null,
  };
}

function placeholderEmailForDni(dni) {
  return `dni-${dni}@hualas.local`;
}

function excelSerialToDate(value) {
  const serial = Number(normalize(value));
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - EXCEL_EPOCH) * DAY_MS);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = parseRows('Hoja 1');
  const passwordHash = await hash(DEFAULT_PASSWORD, 12);

  const dnis = [
    ...new Set(rows.map((row) => cleanDigits(row.A)).filter(Boolean)),
  ];
  const [users, children] = await Promise.all([
    prisma.user.findMany({
      where: { dni: { in: dnis } },
      select: { id: true, dni: true },
    }),
    prisma.child.findMany({
      where: { documentNumber: { in: dnis } },
      select: { id: true, documentNumber: true },
    }),
  ]);

  const userMap = new Map(users.map((user) => [user.dni, user]));
  const childMap = new Map(
    children.map((child) => [child.documentNumber, child])
  );

  const stats = {
    sheet: 'Hoja 1',
    rows: rows.length,
    matchedUsers: 0,
    matchedChildren: 0,
    createdUsers: 0,
    skippedRows: 0,
  };

  const dryRunSamples = [];

  if (dryRun) {
    for (const row of rows) {
      const dni = cleanDigits(row.A);
      const fullName = normalize(row.B);
      if (!dni || !fullName) {
        stats.skippedRows += 1;
        continue;
      }

      if (userMap.has(dni)) {
        stats.matchedUsers += 1;
        continue;
      }

      if (childMap.has(dni)) {
        stats.matchedChildren += 1;
        continue;
      }

      stats.createdUsers += 1;
      if (dryRunSamples.length < 10) {
        dryRunSamples.push({
          dni,
          email: placeholderEmailForDni(dni),
          name: fullName,
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          ...stats,
          defaultPassword: DEFAULT_PASSWORD,
          samples: dryRunSamples,
        },
        null,
        2
      )
    );
    return;
  }

  let updatedUsers = 0;
  let updatedChildren = 0;
  let createdUsers = 0;

  for (const row of rows) {
    const dni = cleanDigits(row.A);
    const fullName = normalize(row.B);

    if (!dni || !fullName) {
      stats.skippedRows += 1;
      continue;
    }

    const split = splitName(fullName);
    const childBirthDate = excelSerialToDate(row.C);

    const existingUser = userMap.get(dni);
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          dni,
          name: split.name || fullName,
          lastName: split.lastName,
        },
      });
      updatedUsers += 1;
      stats.matchedUsers += 1;
      continue;
    }

    const existingChild = childMap.get(dni);
    if (existingChild) {
      await prisma.child.update({
        where: { id: existingChild.id },
        data: {
          documentNumber: dni,
          documentType: 'DNI',
          name: split.name || fullName,
          lastName: split.lastName,
          ...(childBirthDate ? { birthDate: childBirthDate } : {}),
        },
      });
      updatedChildren += 1;
      stats.matchedChildren += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        email: placeholderEmailForDni(dni),
        password: passwordHash,
        dni,
        name: split.name || fullName,
        lastName: split.lastName,
        role: 'MEMBER',
        isActive: true,
      },
    });
    createdUsers += 1;
  }

  console.log(
    JSON.stringify(
      {
        ...stats,
        updatedUsers,
        updatedChildren,
        createdUsers,
        defaultPassword: DEFAULT_PASSWORD,
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
