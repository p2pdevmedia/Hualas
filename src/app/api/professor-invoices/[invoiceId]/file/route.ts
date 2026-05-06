import { get } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { prisma } from '@/lib/prisma';

function encodeFileName(fileName: string) {
  return encodeURIComponent(fileName)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

export async function GET(
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
    select: {
      professorId: true,
      originalName: true,
      contentType: true,
      blobUrl: true,
    },
  });

  if (!invoice) return new NextResponse(null, { status: 404 });

  const isProfessorSelf =
    role === 'PROFESSOR' && userId === invoice.professorId;
  const isAccounting = isAccountingRole(role);
  if (!isProfessorSelf && !isAccounting) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  try {
    const blob = await get(invoice.blobUrl, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Cache-Control'] = 'private, no-store, max-age=0';
    headers['Content-Type'] = invoice.contentType;
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeFileName(
      invoice.originalName
    )}`;

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
