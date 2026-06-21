import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formCreateSchema } from '@/lib/validations/form';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const form = await prisma.form.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: 'asc' } } },
  });
  if (!form) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(form);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = formCreateSchema.parse(await req.json());
  await prisma.formField.deleteMany({ where: { formId: params.id } });
  const form = await prisma.form.update({
    where: { id: params.id },
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
  revalidatePath('/admin/forms');
  revalidatePath(`/admin/forms/${params.id}`);
  return NextResponse.json(form);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.formResponse.deleteMany({ where: { formId: params.id } });
      await tx.formField.deleteMany({ where: { formId: params.id } });
      await tx.form.delete({ where: { id: params.id } });
    });

    revalidatePath('/admin/forms');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'No se pudo eliminar el formulario' },
      { status: 500 }
    );
  }
}
