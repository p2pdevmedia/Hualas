import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import mercadopago from 'mercadopago';

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
  });

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  const preference = {
    items: [
      {
        title: activity.name,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: Number(activity.price),
      },
    ],
    back_urls: {
      success: `${process.env.NEXTAUTH_URL}/activities/${activity.id}`,
      failure: `${process.env.NEXTAUTH_URL}/activities/${activity.id}`,
    },
    auto_return: 'approved' as const,
  };

  const response = await mercadopago.preferences.create(preference as any);

  return NextResponse.json({ init_point: response.body.init_point });
}
