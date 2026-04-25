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
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'Configuración de pago incompleta. Contactá al administrador.' },
      { status: 500 }
    );
  }

  const searchParams = new URL(req.url).searchParams;
  const childId = searchParams.get('childId') || undefined;

  let activity: any = null;
  try {
    activity = await prisma.activity.findUnique({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  }

  if (!activity) {
    return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 });
  }

  const unitPrice = Number(activity.price);
  if (!unitPrice || unitPrice <= 0) {
    return NextResponse.json(
      { error: 'El precio de la actividad no es válido.' },
      { status: 400 }
    );
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const nameParts = (session.user?.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const externalReference = [params.id, (session.user as any).id, childId]
      .filter(Boolean)
      .join(':');

    const base = `${process.env.NEXTAUTH_URL}/activities/${activity.id}`;
    const successUrl = childId ? `${base}?childId=${childId}` : base;

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        payer: {
          first_name: firstName,
          last_name: lastName,
          email: session.user?.email || undefined,
        },
        items: [
          {
            id: activity.id,
            title: activity.name,
            description: activity.description || activity.name,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: 'ARS',
            category_id: 'services',
          },
        ],
        back_urls: {
          success: successUrl,
          failure: base,
          pending: base,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXTAUTH_URL}/api/mercadopago/notifications`,
        statement_descriptor: process.env.MP_STATEMENT_DESCRIPTOR || 'HUALAS',
        external_reference: externalReference,
      },
    });

    const redirectUrl = result.init_point ?? result.sandbox_init_point;
    if (!redirectUrl) {
      return NextResponse.json(
        { error: 'No se pudo generar el link de pago. Intentá de nuevo.' },
        { status: 500 }
      );
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[checkout] Mercado Pago error:', error?.message || error);
    return NextResponse.json(
      { error: 'Error al crear el pago en Mercado Pago.', detail: String(error?.cause ?? error?.message ?? error) },
      { status: 502 }
    );
  }
}
