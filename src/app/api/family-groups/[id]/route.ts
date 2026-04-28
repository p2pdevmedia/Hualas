import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await prisma.familyGroup.findUnique({ where: { id: params.id }, include: { members: { include: { member: true } } } });
  return NextResponse.json(data);
}
