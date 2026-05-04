import { Prisma } from '@prisma/client';

function readSimilarityThreshold(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }

  return parsed;
}

export const ACCOUNTING_SIMILARITY_THRESHOLD = readSimilarityThreshold(
  'ACCOUNTING_SIMILARITY_THRESHOLD',
  0.24
);

export const ACCOUNTING_WORD_SIMILARITY_THRESHOLD = readSimilarityThreshold(
  'ACCOUNTING_WORD_SIMILARITY_THRESHOLD',
  0.45
);

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@._ -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(value: string) {
  if (value.length < 2) return [value];

  const grams: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    grams.push(value.slice(index, index + 2));
  }

  return grams;
}

function diceSimilarity(left: string, right: string) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const rightGrams = bigrams(right);
  const used = new Array(rightGrams.length).fill(false);
  let matches = 0;

  for (const gram of bigrams(left)) {
    const matchIndex = rightGrams.findIndex(
      (candidate, index) => !used[index] && candidate === gram
    );

    if (matchIndex >= 0) {
      used[matchIndex] = true;
      matches += 1;
    }
  }

  return (2 * matches) / (left.length + right.length - 2);
}

function editDistanceWithin(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return false;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMin = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const next = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );

      current[rightIndex] = next;
      rowMin = Math.min(rowMin, next);
    }

    if (rowMin > maxDistance) return false;
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] <= maxDistance;
}

function tokenMatches(queryToken: string, targetToken: string) {
  if (!queryToken || !targetToken) return false;
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }

  const maxDistance = queryToken.length >= 8 ? 2 : 1;
  if (
    queryToken.length >= 4 &&
    editDistanceWithin(queryToken, targetToken, maxDistance)
  ) {
    return true;
  }

  return (
    queryToken.length >= 4 && diceSimilarity(queryToken, targetToken) >= 0.58
  );
}

export function matchesAccountingSearch(
  query: string,
  values: Array<string | null | undefined>
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedValues = values
    .map((value) => normalizeSearchText(value ?? ''))
    .filter(Boolean);
  const haystack = normalizedValues.join(' ');
  if (haystack.includes(normalizedQuery)) return true;

  const targetTokens = haystack.split(' ').filter(Boolean);
  return normalizedQuery
    .split(' ')
    .filter(Boolean)
    .every((queryToken) =>
      targetTokens.some((targetToken) => tokenMatches(queryToken, targetToken))
    );
}

export function buildAccountingSimilarityCondition(
  query: string,
  expressions: Prisma.Sql[]
) {
  const normalizedQuery = normalizeSearchText(query);

  return Prisma.sql`(
    ${Prisma.join(
      expressions.map(
        (expression) => Prisma.sql`
          unaccent(lower(coalesce(${expression}, ''))) LIKE '%' || unaccent(lower(${normalizedQuery})) || '%'
          OR similarity(unaccent(lower(coalesce(${expression}, ''))), unaccent(lower(${normalizedQuery}))) >= ${ACCOUNTING_SIMILARITY_THRESHOLD}
          OR word_similarity(unaccent(lower(${normalizedQuery})), unaccent(lower(coalesce(${expression}, '')))) >= ${ACCOUNTING_WORD_SIMILARITY_THRESHOLD}
        `
      ),
      ' OR '
    )}
  )`;
}
