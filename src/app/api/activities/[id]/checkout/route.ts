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

  const result = await preference.create({
    body: {
      items: [
        {
          title: activity.name,
          quantity: 1,
          unit_price: Number(activity.price),
        },
      ],
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/activities/${activity.id}`,
        failure: `${process.env.NEXTAUTH_URL}/activities/${activity.id}`,
        pending: `${process.env.NEXTAUTH_URL}/activities/${activity.id}`,
      },
      auto_return: 'approved',
    },
  });

  const url = result.init_point ?? result.sandbox_init_point;
  return NextResponse.redirect(url!);
}
