import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const searchParams = new URL(req.url).searchParams;
  const childId = searchParams.get('childId');
  const issuerId = searchParams.get('issuer_id') || undefined;
  const deviceId = searchParams.get('device_id') || undefined;
  const activity: any = await prisma.activity.findUnique({
    where: { id: params.id },
  });
  if (!activity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  });
  const preference = new Preference(client);

  const [firstName = '', ...restName] = (session.user?.name || '').split(' ');
  const lastName = restName.join(' ');
  const externalReference = [
    params.id,
    (session.user as any).id,
    childId || undefined,
  ]
    .filter(Boolean)
    .join(':');

  const result = await preference.create({
    body: {
      payer: {
        first_name: firstName,
        last_name: lastName,
        email: session.user?.email,
      },
      items: [
        {
          id: activity.id,
          title: activity.name,
          description: activity.description || '',
          quantity: 1,
          unit_price: Number(activity.price),
          category_id: 'services',
        },
      ],
      back_urls: (() => {
        const base = `${process.env.NEXTAUTH_URL}/activities/${activity.id}`;
        const url = childId ? `${base}?childId=${childId}` : base;
        return { success: url, failure: url, pending: url };
      })(),
      auto_return: 'approved',
      notification_url: `${process.env.NEXTAUTH_URL}/api/mercadopago/notifications`,
      statement_descriptor:
        process.env.MP_STATEMENT_DESCRIPTOR || 'HUALAS',
      external_reference: externalReference,
      metadata: {
        issuer_id: issuerId,
        device_id: deviceId,
      },
    },
  });

  const url = result.init_point ?? result.sandbox_init_point;
  return NextResponse.redirect(url!);
}
