import { execFileSync } from 'node:child_process';
import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const WORKBOOK_PATH = 'Copia de VERANO HUALAS 2026-2.xlsx';
const SHEET_NAME = 'VERANO 2026';
const DEFAULT_PASSWORD = 'Test1234!';
const MONTH_MS = 86400000;
const EXCEL_EPOCH = 25569;

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
    throw new Error(`No se pudo resolver la relación de la hoja "${sheetName}".`);
  }

  return `xl/${target}`;
}

function parseSharedStrings() {
  try {
    const sharedXml = readZipEntry('xl/sharedStrings.xml');
    return [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(([, inner]) =>
      stripTags(inner).replace(/\s+/g, ' ').trim()
    );
  } catch {
    return [];
  }
}

function parseSheetRows() {
  const sharedStrings = parseSharedStrings();
  const sheetPath = getWorkbookSheetPath(SHEET_NAME);
  const sheetXml = readZipEntry(sheetPath);
  const rows = [];

  for (const rowMatch of sheetXml.matchAll(/<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1]);
    if (rowNumber === 1) continue;

    const cells = {};
    for (const cellMatch of rowMatch[2].matchAll(
      /<c[^>]+r="([A-Z]+)\d+"(?:[^>]+t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g
    )) {
      const column = cellMatch[1];
      const type = cellMatch[2];
      const inner = cellMatch[3];
      let value = '';

      if (type === 's') {
        const sharedMatch = /<v>(\d+)<\/v>/.exec(inner);
        if (sharedMatch) value = sharedStrings[Number(sharedMatch[1])] ?? '';
      } else if (type === 'inlineStr') {
        const textMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        value = textMatch ? stripTags(textMatch[1]) : '';
      } else {
        const numericMatch = /<v>([\s\S]*?)<\/v>/.exec(inner);
        value = numericMatch ? numericMatch[1] : '';
      }

      cells[column] = value.trim();
    }

    if (cells.B) {
      rows.push(cells);
    }
  }

  return rows;
}

function cleanText(value) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function cleanDigits(value) {
  const text = cleanText(value);
  if (!text) return '';
  const digits = text.replace(/\D+/g, '');
  return digits;
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - EXCEL_EPOCH) * MONTH_MS);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeGender(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return null;
  if (text.startsWith('m')) return 'MALE';
  if (text.startsWith('f')) return 'FEMALE';
  return null;
}

function normalizeNationality(value) {
  const text = cleanText(value);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.startsWith('arg')) return 'Argentina';
  return text;
}

function splitResponsibleName(value) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return { name: '', lastName: null };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { name: cleaned, lastName: null };
  }

  return {
    name: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function pickPreferredName(current, candidate) {
  if (!current) return candidate;
  if (!candidate) return current;
  if (candidate.length > current.length) return candidate;
  return current;
}

function pickPreferredPhone(current, candidate) {
  if (!current) return candidate;
  if (!candidate) return current;
  if (candidate.length > current.length) return candidate;
  return current;
}

async function upsertChild(userId, row) {
  const name = cleanText(row.B);
  const lastName = cleanText(row.C) || null;
  const documentNumber = cleanDigits(row.D) || null;
  const birthDate = excelSerialToDate(row.E);
  const childData = {
    userId,
    name,
    lastName,
    documentType: documentNumber ? 'DNI' : null,
    documentNumber,
    birthDate,
    address: cleanText(row.G) || null,
    gender: normalizeGender(row.F),
    nationality: normalizeNationality(row.H),
    maritalStatus: cleanText(row.I) || null,
  };

  const existing = await prisma.child.findFirst({
    where: documentNumber
      ? { userId, documentNumber }
      : { userId, name, lastName, birthDate },
  });

  if (existing) {
    return prisma.child.update({
      where: { id: existing.id },
      data: childData,
    });
  }

  return prisma.child.create({
    data: childData,
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rows = parseSheetRows();
  const families = new Map();

  for (const row of rows) {
    const email = cleanText(row.J).toLowerCase();
    if (!email) {
      throw new Error(`Fila sin email de responsable: ${JSON.stringify(row)}`);
    }

    const responsibleName = splitResponsibleName(row.K);
    const phone = cleanDigits(row.L) || null;

    const current = families.get(email) ?? {
      email,
      name: responsibleName.name,
      lastName: responsibleName.lastName,
      phone,
      children: [],
    };

    current.name = pickPreferredName(current.name, responsibleName.name);
    current.lastName = pickPreferredName(current.lastName, responsibleName.lastName);
    current.phone = pickPreferredPhone(current.phone, phone);
    current.children.push(row);
    families.set(email, current);
  }

  const passwordHash = await hash(DEFAULT_PASSWORD, 12);
  let createdUsers = 0;
  let updatedUsers = 0;
  let createdChildren = 0;
  let updatedChildren = 0;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          sheet: SHEET_NAME,
          families: families.size,
          childRows: rows.length,
          defaultPassword: DEFAULT_PASSWORD,
        },
        null,
        2
      )
    );
    return;
  }

  for (const family of families.values()) {
    const existingUser = await prisma.user.findUnique({
      where: { email: family.email },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { email: family.email },
      update: {
        name: family.name || null,
        lastName: family.lastName || null,
        phone: family.phone || null,
        role: 'MEMBER',
        isActive: true,
      },
      create: {
        email: family.email,
        name: family.name || null,
        lastName: family.lastName || null,
        phone: family.phone || null,
        password: passwordHash,
        role: 'MEMBER',
        isActive: true,
      },
    });

    if (existingUser) updatedUsers += 1;
    else createdUsers += 1;

    for (const row of family.children) {
      const documentNumber = cleanDigits(row.D) || null;
      const birthDate = excelSerialToDate(row.E);
      const existingChild = await prisma.child.findFirst({
        where: documentNumber
          ? { userId: user.id, documentNumber }
          : { userId: user.id, name: cleanText(row.B), lastName: cleanText(row.C) || null, birthDate },
        select: { id: true },
      });

      if (existingChild) updatedChildren += 1;
      else createdChildren += 1;

      await upsertChild(user.id, row);
    }
  }

  console.log(
    JSON.stringify(
      {
        sheet: SHEET_NAME,
        families: families.size,
        createdUsers,
        updatedUsers,
        createdChildren,
        updatedChildren,
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
