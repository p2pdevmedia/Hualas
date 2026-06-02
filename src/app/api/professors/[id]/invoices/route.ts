import { del, put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';
import { buildProfessorInvoiceFileUrl } from '@/lib/blob-urls';
import { prisma } from '@/lib/prisma';
import { notifyProfessorInvoiceCreated } from '@/lib/notifications/notification-service';
import { findProfessorAssignedActivity } from '@/lib/professor-activities';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);
const BLOB_CONFIGURATION_ERROR =
  'El almacenamiento de facturas no está configurado. Falta configurar BLOB_READ_WRITE_TOKEN.';
const BLOB_UPLOAD_ERROR =
  'No se pudo guardar la factura en el almacenamiento. Revisá la configuración de Vercel Blob.';

function getSafeExtension(fileName: string, contentType: string) {
  const ext = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    : '';
  if (
    ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext)
  ) {
    return ext;
  }
  if (contentType === 'application/pdf') return '.pdf';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  if (contentType === 'image/heic' || contentType === 'image/heic-sequence') {
    return '.heic';
  }
  if (contentType === 'image/heif' || contentType === 'image/heif-sequence') {
    return '.heif';
  }
  return '.jpg';
}

function serializeInvoice(invoice: {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  status: string;
  approvedAt: Date | null;
  transferredAt: Date | null;
  createdAt: Date;
  activityId?: string | null;
  activity?: { id: string; name: string } | null;
}) {
  return {
    id: invoice.id,
    activityId: invoice.activityId ?? null,
    activityName: invoice.activity?.name ?? null,
    originalName: invoice.originalName,
    contentType: invoice.contentType,
    size: invoice.size,
    status: invoice.status,
    approvedAt: invoice.approvedAt?.toISOString() ?? null,
    transferredAt: invoice.transferredAt?.toISOString() ?? null,
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
  const role =
    (session?.user as any)?.activeRole ?? (session?.user as any)?.role;

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
    include: { activity: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ invoices: invoices.map(serializeInvoice) });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const role =
    (session?.user as any)?.activeRole ?? (session?.user as any)?.role;

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
  const activityId = formData.get('activityId');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se recibió ningún archivo' },
      { status: 400 }
    );
  }

  if (typeof activityId !== 'string' || activityId.trim().length === 0) {
    return NextResponse.json(
      { error: 'Seleccioná la actividad de la factura' },
      { status: 400 }
    );
  }

  const activity = await findProfessorAssignedActivity(
    params.id,
    activityId.trim()
  );
  if (!activity) {
    return NextResponse.json(
      { error: 'No podés subir facturas para esa actividad' },
      { status: 403 }
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'La factura debe ser PDF, JPG, PNG, WebP, HEIC o HEIF' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'La factura debe pesar menos de 10 MB' },
      { status: 400 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      '[professor-invoices] BLOB_READ_WRITE_TOKEN is not configured'
    );
    return NextResponse.json(
      { error: BLOB_CONFIGURATION_ERROR },
      { status: 503 }
    );
  }

  const ext = getSafeExtension(file.name, file.type);
  const pathname = `professor-invoices/${params.id}/${crypto.randomUUID()}${ext}`;
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(pathname, file, {
      access: 'private',
      contentType: file.type,
    });
  } catch (err) {
    console.error('[professor-invoices] failed to upload invoice blob', err);
    return NextResponse.json({ error: BLOB_UPLOAD_ERROR }, { status: 502 });
  }

  let invoice;
  try {
    invoice = await prisma.professorInvoice.create({
      data: {
        professorId: params.id,
        activityId: activity.id,
        originalName: file.name || `factura${ext}`,
        contentType: file.type,
        size: file.size,
        blobUrl: blob.url,
      },
      include: { activity: { select: { id: true, name: true } } },
    });
  } catch (err) {
    await del(blob.url).catch(() => undefined);
    throw err;
  }

  await notifyProfessorInvoiceCreated(invoice.id);

  return NextResponse.json(
    { invoice: serializeInvoice(invoice) },
    { status: 201 }
  );
}
