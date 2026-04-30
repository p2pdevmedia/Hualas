import { get, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAccountingRole } from '@/lib/accounting';
import { buildAccountingMovementReceiptUrl } from '@/lib/blob-urls';

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

  const ext = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '.jpg';
  const pathname = `accounting/receipts/${params.id}/${crypto.randomUUID()}${ext}`;

  const blob = await put(pathname, file, {
    access: 'private',
    contentType: file.type,
  });

  await prisma.accountingMovement.update({
    where: { id: params.id },
    data: { receiptImage: blob.url },
  });

  return NextResponse.json({
    url: buildAccountingMovementReceiptUrl(params.id),
  });
}
