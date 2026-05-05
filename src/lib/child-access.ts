import { Prisma } from '@prisma/client';

export function childAccessWhere(userId: string): Prisma.ChildWhereInput {
  return {
    OR: [{ userId }, { guardians: { some: { userId } } }],
  };
}

export function childIdAccessWhere(
  userId: string,
  childId: string
): Prisma.ChildWhereInput {
  return {
    id: childId,
    ...childAccessWhere(userId),
  };
}
