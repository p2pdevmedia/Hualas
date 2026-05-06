import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { buildProfessorInvoiceFileUrl } from '@/lib/blob-urls';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getSafeExtension(fileName: string, contentType: string) {
  const ext = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    : '';
  if (['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  if (contentType === 'application/pdf') return '.pdf';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  return '.jpg';
}

function serializeInvoice(invoice: {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: Date;
}) {
  return {
    id: invoice.id,
    originalName: invoice.originalName,
    contentType: invoice.contentType,
    size: invoice.size,
    createdAt: invoice.createdAt.toISOString(),
    fileUrl: buildProfessorInvoiceFileUrl(invoice.id),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const isProfessorSelf = role === 'PROFESSOR' && userId === params.id;
  const isAccounting = isAccountingRole(role);
  if (!isProfessorSelf && !isAccounting) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const professor = await prisma.user.findFirst({
    where: {
      id: params.id,
      roleAssignments: { some: { role: 'PROFESSOR' } },
    },
    select: { id: true },
  });

  if (!professor) {
    return NextResponse.json(
      { error: 'Profesor no encontrado' },
      { status: 404 }
    );
  }

  const invoices = await prisma.professorInvoice.findMany({
    where: { professorId: params.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invoices: invoices.map(serializeInvoice) });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId || role !== 'PROFESSOR' || userId !== params.id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const professor = await prisma.user.findFirst({
    where: {
      id: params.id,
      roleAssignments: { some: { role: 'PROFESSOR' } },
    },
    select: { id: true },
  });

  if (!professor) {
    return NextResponse.json(
      { error: 'Profesor no encontrado' },
      { status: 404 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se recibió ningún archivo' },
      { status: 400 }
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'La factura debe ser PDF, JPG, PNG o WebP' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'La factura debe pesar menos de 10 MB' },
      { status: 400 }
    );
  }

  const ext = getSafeExtension(file.name, file.type);
  const pathname = `professor-invoices/${params.id}/${crypto.randomUUID()}${ext}`;
  const blob = await put(pathname, file, {
    access: 'private',
    contentType: file.type,
  });

  const invoice = await prisma.professorInvoice.create({
    data: {
      professorId: params.id,
      originalName: file.name || `factura${ext}`,
      contentType: file.type,
      size: file.size,
      blobUrl: blob.url,
    },
  });

  return NextResponse.json(
    { invoice: serializeInvoice(invoice) },
    { status: 201 }
  );
}
