import { del } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: { invoiceId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const invoice = await prisma.professorInvoice.findUnique({
    where: { id: params.invoiceId },
    select: { id: true, professorId: true, blobUrl: true, status: true },
  });

  if (!invoice) return new NextResponse(null, { status: 404 });

  const isProfessorSelf =
    role === 'PROFESSOR' && userId === invoice.professorId;
  const isAccounting = isAccountingRole(role);
  if (!isProfessorSelf && !isAccounting) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  if (invoice.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'No se puede eliminar una factura aprobada o transferida' },
      { status: 409 }
    );
  }

  await prisma.professorInvoice.delete({ where: { id: invoice.id } });

  try {
    await del(invoice.blobUrl);
  } catch {
    // The database record is the source of truth; do not fail the user action
    // if Blob storage has already removed the file.
  }

  return new NextResponse(null, { status: 204 });
}
