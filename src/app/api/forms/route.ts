import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formCreateSchema } from '@/lib/validations/form';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const forms = await prisma.form.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(forms);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = formCreateSchema.parse(await req.json());
  const form = await prisma.form.create({
    data: {
      title: data.title,
      fields: {
        create: data.fields.map((f, index) => ({
          label: f.label,
          type: f.type,
          options: f.options ? f.options : undefined,
          required: f.required,
          order: index,
        })),
      },
    },
    include: { fields: true },
  });
  return NextResponse.json(form);
}
