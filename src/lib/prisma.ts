import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

const WRITE_ACTIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const AUDITED_ACTIONS = new Set(['update', 'delete', 'upsert', 'updateMany', 'deleteMany']);
const AUDIT_EXCLUDED_OPERATIONS = new Set(['Message:updateMany']);

function shouldSkipAudit(model: string, operation: string) {
  return AUDIT_EXCLUDED_OPERATIONS.has(`${model}:${operation}`);
}

function toJsonString<T>(value: T): string | null {
  if (value === undefined) {
    return null;
  }

  return JSON.stringify(value, (_key, currentValue) =>
    typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
  );
}

function toRecordId(result: unknown, args: unknown) {
  const resultId = (result as { id?: unknown } | null)?.id;
  if (resultId !== undefined && resultId !== null) {
    return String(resultId);
  }

  const whereId = (args as { where?: { id?: unknown } } | null)?.where?.id;
  if (whereId !== undefined && whereId !== null) {
    return String(whereId);
  }

  return null;
}

export const prisma = basePrisma.$extends({
  name: 'audit-log',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || String(model) === 'DbAuditLog' || !WRITE_ACTIONS.has(operation)) {
          return query(args);
        }

        if (shouldSkipAudit(model, operation)) {
          return query(args);
        }

        let before: unknown = null;

        try {
          if (AUDITED_ACTIONS.has(operation)) {
            const where = (args as { where?: Record<string, any> } | null)?.where;

            if (operation === 'updateMany' || operation === 'deleteMany') {
              const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
              before = await (basePrisma as Record<string, any>)[delegateName].findMany({
                where,
                take: 100,
              });
            } else if (where) {
              const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
              before = await (basePrisma as Record<string, any>)[delegateName].findUnique({
                where,
              });
            }
          }
        } catch {
          before = null;
        }

        const result = await query(args);

        try {
          const beforeJson = toJsonString(before);
          const afterJson = toJsonString(result);
          const argsJson = toJsonString(args);
          const recordId = toRecordId(result, args);

          await basePrisma.$executeRaw`
            INSERT INTO "DbAuditLog" (
              "id",
              "model",
              "action",
              "recordId",
              "before",
              "after",
              "args",
              "userId",
              "requestId",
              "createdAt"
            ) VALUES (
              ${randomUUID()},
              ${model},
              ${operation},
              ${recordId},
              ${beforeJson}::jsonb,
              ${afterJson}::jsonb,
              ${argsJson}::jsonb,
              ${null},
              ${null},
              NOW()
            )
          `;
        } catch (error) {
          console.error('[DbAuditLog] failed', error);
        }

        return result;
      },
    },
  },
});
