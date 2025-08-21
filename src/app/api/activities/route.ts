import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activityCreateSchema } from '@/lib/validations/activity';

export async function POST(req: Request) {
  const data = activityCreateSchema.parse(await req.json());
  const activity = await prisma.activity.create({ data });
  return NextResponse.json(activity);
}
