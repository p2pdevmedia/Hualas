import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityCreateSchema } from '@/lib/validations/activity';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = activityCreateSchema.parse(await req.json());
  const activity = await prisma.activity.create({ data });
  return NextResponse.json(activity);
}
