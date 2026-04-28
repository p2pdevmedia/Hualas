import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { getMercadoPagoCheckoutSettings, getMercadoPagoCredentials } from '@/lib/mercadopago';

function getAppUrl(req: Request) { const host=req.headers.get('x-forwarded-host')||req.headers.get('host'); const proto=req.headers.get('x-forwarded-proto')||'https'; if(host) return `${proto}://${host}`; return new URL(req.url).origin; }

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await req.json().catch(() => null);
  const items = (payload?.items ?? []) as Array<{ activityId: string; target?: string }>;
  if (!items.length) return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });

  const uniqueIds = [...new Set(items.map((i) => i.activityId))];
  const activities = await prisma.activity.findMany({ where: { id: { in: uniqueIds } }, include: { participants: { select: { id: true } } } });
  const activityById = new Map(activities.map((a) => [a.id, a]));
  for (const item of items) {
    const activity = activityById.get(item.activityId);
    if (!activity) return NextResponse.json({ error: 'Una actividad no existe.' }, { status: 404 });
    if (activity.capacity != null && activity.participants.length >= activity.capacity) return NextResponse.json({ error: `La actividad ${activity.name} no tiene cupo.` }, { status: 409 });
  }

  const { accessToken, environment } = getMercadoPagoCredentials();
  if (!accessToken) return NextResponse.json({ error: 'Configuración de pago incompleta.' }, { status: 500 });

  const mpItems = items.map((item) => {
    const activity = activityById.get(item.activityId)!;
    return { id: activity.id, title: `${activity.name}${item.target && item.target !== 'self' ? ' (menor)' : ''}`, quantity: 1, unit_price: Number(activity.price), currency_id: 'ARS', category_id: 'services' };
  });
  const refs = items.map((item) => `${item.activityId}:${(session.user as any).id}:${item.target && item.target !== 'self' ? item.target : ''}`);

  const client = new MercadoPagoConfig({ accessToken });
  const checkoutSettings = getMercadoPagoCheckoutSettings();
  const appUrl = getAppUrl(req);
  const base = `${appUrl}/activities/cart`;
  const result = await new Preference(client).create({ body: {
    items: mpItems,
    external_reference: `cart|${refs.join(',')}`,
    back_urls: { success: base, failure: base, pending: base },
    auto_return: checkoutSettings.autoReturn,
    binary_mode: checkoutSettings.binaryMode,
    notification_url: process.env.MP_NOTIFICATION_URL?.trim() || `${appUrl}/api/mercadopago/notifications`,
    metadata: { mode: 'cart', refs, userId: (session.user as any).id, environment },
  }});

  return NextResponse.json({ redirectUrl: result.init_point ?? result.sandbox_init_point });
}
