import { execFileSync } from 'node:child_process';
import { hash } from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const WORKBOOK_PATH = 'Inscripciones para pagina web.xlsx';
const DEFAULT_PASSWORD = 'Test1234!';
const EXCEL_EPOCH = 25569;
const DAY_MS = 86400000;

const SHEET_TO_ACTIVITY = new Map([
  ['Circo', 'Circo'],
  ['Voley Playa', 'Vóley Verano 2026'],
  ['EDM Verano 25-26', 'Escuela de Montaña Verano Día'],
  ['EDM Primavera 2025', 'EDM Primavera 2025'],
  ['EDM Invierno 2025', 'EDM Invierno 2025'],
  ['Gimnasio', 'Gym Hualas'],
  ['Montañismo', 'Montañismo'],
  ['Palestra y Escalada Infantil', 'Palestra'],
  ['Hockey', 'Hockey'],
  ['Jornadas', 'Jornadas Hualas'],
]);

const prisma = new PrismaClient();

function getActivityParticipantKey(activityId, userId, childId) {
  return [activityId, userId, childId ?? 'self'].join(':');
}

function readZipEntry(entryName) {
  return execFileSync('unzip', ['-p', WORKBOOK_PATH, entryName], {
    encoding: 'utf8',
    maxBuffer: 60 * 1024 * 1024,
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
    return [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(([, inner]) =>
      stripTags(inner).replace(/\s+/g, ' ').trim()
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
    throw new Error(`No se pudo resolver la relación de la hoja "${sheetName}".`);
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
  let headerRowNumber = null;
  let headers = null;

  for (const rowMatch of sheetXml.matchAll(/<row[^>]+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1]);
    const values = {};
    const cells = [...rowMatch[2].matchAll(/<c[^>]+r="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>/g)];

    for (const cellMatch of cells) {
      const refMatch = /r="([A-Z]+)\d+"/.exec(cellMatch[0]);
      if (!refMatch) continue;
      values[refMatch[1]] = cellValue(cellMatch[0], sharedStrings);
    }

    if (headerRowNumber == null) {
      const lowerValues = Object.values(values).map((value) =>
        value.toLowerCase().trim()
      );
      const hasName = lowerValues.includes('nombre');
      const hasLastName = lowerValues.includes('apellido');
      const hasMail = lowerValues.some((value) => value === 'mail' || value === 'mail 2');

      if (hasName && hasLastName && hasMail) {
        headerRowNumber = rowNumber;
        headers = values;
      }

      continue;
    }

    if (rowNumber <= headerRowNumber) {
      continue;
    }

    if (Object.values(values).every((value) => !String(value).trim())) {
      continue;
    }

    rows.push(values);
  }

  if (!headers) {
    throw new Error(`No se pudo detectar el encabezado de la hoja "${sheetName}".`);
  }

  return { headers, rows };
}

function normalize(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalize(value).toLowerCase();
}

function cleanDigits(value) {
  return normalize(value).replace(/\D+/g, '');
}

function excelSerialToDate(value) {
  const serial = Number(normalize(value));
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - EXCEL_EPOCH) * DAY_MS);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toGender(value) {
  const text = normalizeKey(value);
  if (!text) return null;
  if (text.startsWith('m')) return 'MALE';
  if (text.startsWith('f')) return 'FEMALE';
  return null;
}

function toNationality(value) {
  const text = normalize(value);
  if (!text) return null;
  if (text.toLowerCase().startsWith('arg')) return 'Argentina';
  return text;
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

function headerColumn(headers, matcher) {
  return Object.entries(headers).find(([, value]) => matcher(normalizeKey(value)))?.[0] ?? null;
}

function columnIndex(column) {
  let index = 0;
  for (const char of column) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index;
}

function emailColumns(row, headers) {
  const cols = Object.keys(headers).sort((a, b) => columnIndex(a) - columnIndex(b));
  return cols
    .map((col) => normalize(row[col]))
    .filter((value) => value.includes('@'));
}

function isChildRow(row, headers) {
  const roleCol = headerColumn(headers, (value) => value.includes('carácter de socio'));
  const ageCol = headerColumn(headers, (value) => value === 'edad');
  const role = roleCol ? normalizeKey(row[roleCol]) : '';
  if (/cadete|menor/.test(role)) return true;
  if (/activo/.test(role)) return false;

  const age = ageCol ? Number(normalize(row[ageCol])) : NaN;
  if (Number.isFinite(age)) {
    return age < 18;
  }

  return false;
}

function getParticipantFields(row, headers) {
  const nameCol = headerColumn(headers, (value) => value === 'nombre');
  const lastNameCol = headerColumn(headers, (value) => value === 'apellido');
  const dniCol = headerColumn(headers, (value) => value === 'dni');
  const birthCol = headerColumn(headers, (value) => value.includes('fecha de nacimiento') || value === 'fecha');
  const genderCol = headerColumn(headers, (value) => value === 'género' || value === 'genero');
  const addressCol = headerColumn(headers, (value) => value === 'domicilio');
  const nationalityCol = headerColumn(headers, (value) => value === 'nacionalidad');
  const maritalCol = headerColumn(headers, (value) => value === 'estado civil');
  const observationsCol = headerColumn(headers, (value) => value === 'observaciones');
  const emailCol = headerColumn(headers, (value) => value === 'mail');

  return {
    name: nameCol ? normalize(row[nameCol]) : '',
    lastName: lastNameCol ? normalize(row[lastNameCol]) : '',
    dni: dniCol ? cleanDigits(row[dniCol]) : '',
    birthDate: birthCol ? excelSerialToDate(row[birthCol]) : null,
    gender: genderCol ? toGender(row[genderCol]) : null,
    address: addressCol ? normalize(row[addressCol]) : '',
    nationality: nationalityCol ? toNationality(row[nationalityCol]) : null,
    maritalStatus: maritalCol ? normalize(row[maritalCol]) : '',
    email: emailCol ? normalize(row[emailCol]).toLowerCase() : '',
    observations: observationsCol ? normalize(row[observationsCol]) : '',
  };
}

function getResponsibleFields(row, headers) {
  const nameCol = headerColumn(headers, (value) => value.includes('nombre y apellido'));
  const phoneCol = headerColumn(headers, (value) => value === 'teléfono' || value === 'telefono');
  const mail2Col = headerColumn(headers, (value) => value === 'mail 2');
  const emails = emailColumns(row, headers);

  const candidateEmail = mail2Col ? normalize(row[mail2Col]).toLowerCase() : emails.at(-1) ?? '';
  return {
    name: nameCol ? normalize(row[nameCol]) : '',
    phone: phoneCol ? cleanDigits(row[phoneCol]) : '',
    email: candidateEmail,
  };
}

function toUserPayload(row, headers, { parent = false } = {}) {
  const participant = getParticipantFields(row, headers);
  const responsible = getResponsibleFields(row, headers);
  const emails = emailColumns(row, headers);

  if (parent) {
    const nameSource = responsible.name || participant.name;
    const split = splitName(nameSource);
    return {
      email: responsible.email || participant.email || emails.at(-1) || '',
      name: split.name || nameSource || null,
      lastName: split.lastName || null,
      phone: responsible.phone || '',
      birthDate: null,
      gender: null,
      address: '',
      nationality: null,
      maritalStatus: '',
    };
  }

  const split = splitName(`${participant.name} ${participant.lastName}`.trim());
  return {
    email: participant.email || emails[0] || '',
    name: split.name || participant.name || null,
    lastName: split.lastName || participant.lastName || null,
    phone: '',
    birthDate: participant.birthDate,
    gender: participant.gender,
    address: participant.address,
    nationality: participant.nationality,
    maritalStatus: participant.maritalStatus,
  };
}

function toChildPayload(row, headers, userId) {
  const participant = getParticipantFields(row, headers);
  return {
    userId,
    name: participant.name,
    lastName: participant.lastName || null,
    documentType: participant.dni ? 'DNI' : null,
    documentNumber: participant.dni || null,
    birthDate: participant.birthDate,
    address: participant.address || null,
    gender: participant.gender,
    nationality: participant.nationality,
    maritalStatus: participant.maritalStatus || null,
    observations: participant.observations || null,
  };
}

function activityBlueprint(sheetName, rows) {
  const firstTimestamp = rows
    .map((row) => excelSerialToDate(row.A))
    .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const isEdm = sheetName.startsWith('EDM ');
  return {
    name: SHEET_TO_ACTIVITY.get(sheetName),
    date: firstTimestamp ?? new Date(),
    frequency: isEdm ? 'DAILY' : sheetName === 'Jornadas' ? 'ONE_TIME' : 'WEEKLY',
    price: 1,
    capacity: null,
    description: `Importado desde ${WORKBOOK_PATH} (${sheetName}).`,
  };
}

async function ensureActivity(sheetName, rows, cache) {
  const activityName = SHEET_TO_ACTIVITY.get(sheetName);
  if (!activityName) return null;

  if (cache.has(activityName)) return cache.get(activityName);

  const existing = await prisma.activity.findFirst({
    where: { name: activityName },
  });
  if (existing) {
    cache.set(activityName, existing);
    return existing;
  }

  const created = await prisma.activity.create({
    data: activityBlueprint(sheetName, rows),
  });
  cache.set(activityName, created);
  return created;
}

async function upsertUserFromPayload(payload) {
  const email = normalize(payload.email).toLowerCase();
  if (!email) {
    throw new Error('Falta email para un usuario importado.');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return prisma.user.update({
      where: { email },
      data: {
        name: payload.name || existing.name,
        lastName: payload.lastName || existing.lastName,
        phone: payload.phone || existing.phone,
        birthDate: payload.birthDate ?? existing.birthDate,
        gender: payload.gender ?? existing.gender,
        address: payload.address || existing.address,
        nationality: payload.nationality || existing.nationality,
        maritalStatus: payload.maritalStatus || existing.maritalStatus,
        isActive: true,
      },
    });
  }

  const password = await hash(DEFAULT_PASSWORD, 12);
  return prisma.user.create({
    data: {
      email,
      name: payload.name || null,
      lastName: payload.lastName || null,
      phone: payload.phone || null,
      birthDate: payload.birthDate,
      gender: payload.gender,
      address: payload.address || null,
      nationality: payload.nationality || null,
      maritalStatus: payload.maritalStatus || null,
      password,
      role: 'MEMBER',
      isActive: true,
    },
  });
}

async function upsertChildFromPayload(payload) {
  const existing = payload.documentNumber
    ? await prisma.child.findFirst({
        where: { userId: payload.userId, documentNumber: payload.documentNumber },
      })
    : await prisma.child.findFirst({
        where: {
          userId: payload.userId,
          name: payload.name,
          lastName: payload.lastName,
          birthDate: payload.birthDate,
        },
      });

  if (existing) {
    return prisma.child.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.child.create({
    data: payload,
  });
}

async function upsertParticipant(activityId, userId, childId) {
  const participantKey = getActivityParticipantKey(activityId, userId, childId);
  const existing = await prisma.activityParticipant.findUnique({
    where: { participantKey },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.activityParticipant.create({
    data: {
      activityId,
      userId,
      childId,
      participantKey,
    },
  });
}

async function cleanupImportedParticipants(activityIds) {
  await prisma.activityParticipant.deleteMany({
    where: {
      activityId: { in: activityIds },
    },
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const sheets = [...SHEET_TO_ACTIVITY.keys()].map((sheetName) => {
    const sheet = parseRows(sheetName);
    return { sheetName, ...sheet };
  });

  if (dryRun) {
    console.log(
      JSON.stringify(
        sheets.map(({ sheetName, headers, rows }) => {
          const participantRoleCol = headerColumn(headers, (value) =>
            value.includes('carácter de socio')
          );
          const ageCol = headerColumn(headers, (value) => value === 'edad');
          return {
            sheetName,
            activityName: SHEET_TO_ACTIVITY.get(sheetName),
            rows: rows.length,
            headerColumns: headers,
            childRows: rows.filter((row) => isChildRow(row, headers)).length,
            adultRows: rows.filter((row) => !isChildRow(row, headers)).length,
            participantRoleCol,
            ageCol,
          };
        }),
        null,
        2
      )
    );
    return;
  }

  const activityCache = new Map();
  const activityIds = [];
  for (const { sheetName, rows } of sheets) {
    const activity = await ensureActivity(sheetName, rows, activityCache);
    if (activity) {
      activityIds.push(activity.id);
    }
  }

  await cleanupImportedParticipants(activityIds);

  let createdActivities = 0;
  let createdUsers = 0;
  let updatedUsers = 0;
  let createdChildren = 0;
  let updatedChildren = 0;
  let createdParticipants = 0;
  let reusedParticipants = 0;

  for (const { sheetName, headers, rows } of sheets) {
    const activity = await ensureActivity(sheetName, rows, activityCache);
    if (!activity) continue;
    if (!activityIds.includes(activity.id)) {
      createdActivities += 1;
      activityIds.push(activity.id);
    }

    for (const row of rows) {
      const participant = getParticipantFields(row, headers);
      const responsible = getResponsibleFields(row, headers);
      if (!participant.name && !participant.lastName) {
        continue;
      }

      const childRow = isChildRow(row, headers);
      if (childRow) {
        const parentPayload = toUserPayload(row, headers, { parent: true });
        if (!parentPayload.email) {
          continue;
        }
        const parentUserBefore = await prisma.user.findUnique({
          where: { email: normalize(parentPayload.email).toLowerCase() },
          select: { id: true },
        });
        const parentUser = await upsertUserFromPayload(parentPayload);
        if (parentUserBefore) updatedUsers += 1;
        else createdUsers += 1;

        const childPayload = toChildPayload(row, headers, parentUser.id);
        const childBefore = childPayload.documentNumber
          ? await prisma.child.findFirst({
              where: {
                userId: parentUser.id,
                documentNumber: childPayload.documentNumber,
              },
              select: { id: true },
            })
          : await prisma.child.findFirst({
              where: {
                userId: parentUser.id,
                name: childPayload.name,
                lastName: childPayload.lastName,
                birthDate: childPayload.birthDate,
              },
              select: { id: true },
            });
        const child = await upsertChildFromPayload(childPayload);
        if (childBefore) updatedChildren += 1;
        else createdChildren += 1;

        const participantBefore = await prisma.activityParticipant.findUnique({
          where: {
            participantKey: getActivityParticipantKey(activity.id, parentUser.id, child.id),
          },
          select: { id: true },
        });
        await upsertParticipant(activity.id, parentUser.id, child.id);
        if (participantBefore) reusedParticipants += 1;
        else createdParticipants += 1;
      } else {
        const userPayload = toUserPayload(row, headers, { parent: false });
        if (!userPayload.email) {
          continue;
        }
        const userBefore = await prisma.user.findUnique({
          where: { email: normalize(userPayload.email).toLowerCase() },
          select: { id: true },
        });
        const user = await upsertUserFromPayload(userPayload);
        if (userBefore) updatedUsers += 1;
        else createdUsers += 1;

        const participantBefore = await prisma.activityParticipant.findUnique({
          where: {
            participantKey: getActivityParticipantKey(activity.id, user.id, null),
          },
          select: { id: true },
        });
        await upsertParticipant(activity.id, user.id, null);
        if (participantBefore) reusedParticipants += 1;
        else createdParticipants += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        createdActivities,
        createdUsers,
        updatedUsers,
        createdChildren,
        updatedChildren,
        createdParticipants,
        reusedParticipants,
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
