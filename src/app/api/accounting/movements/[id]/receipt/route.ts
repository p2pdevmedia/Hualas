import { get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';
import {
  SAFE_IMAGE_SIGNATURE_KINDS,
  validateFileSignature,
} from '@/lib/security/file-signatures';
import { checkRateLimit } from '@/lib/security/rate-limit';

async function streamMovementReceipt(id: string) {
  const movement = await prisma.accountingMovement.findUnique({
    where: { id },
    select: { receiptImage: true },
  });

  if (!movement?.receiptImage) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const blob = await get(movement.receiptImage, { access: 'private' });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = Object.fromEntries(blob.headers.entries());
    headers['Cache-Control'] = 'private, no-store, max-age=0';

    return new NextResponse(blob.stream, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return streamMovementReceipt(params.id);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rate = checkRateLimit(
    `upload:accounting-receipt:${(session?.user as any)?.id ?? 'unknown'}`,
    {
      limit: 20,
      windowMs: 60_000,
    }
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Try again shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file received' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'File must be an image' },
      { status: 400 }
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File must be under 5 MB' },
      { status: 400 }
    );
  }

  const validation = await validateFileSignature(
    file,
    SAFE_IMAGE_SIGNATURE_KINDS,
    'File must be a valid JPG, PNG, GIF, or WebP image'
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ext = validation.file.extension;
  const pathname = `accounting/receipts/${params.id}/${crypto.randomUUID()}${ext}`;

  const blob = await put(pathname, file, {
    access: 'private',
    contentType: validation.file.contentType,
  });

  await prisma.accountingMovement.update({
    where: { id: params.id },
    data: { receiptImage: blob.url },
  });

  return NextResponse.json({
    url: buildAccountingMovementReceiptUrl(params.id),
  });
}
