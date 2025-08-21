import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await req.json();
  const settings = await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      logo: data.logo,
      favicon: data.favicon,
      navbarColor: data.navbarColor,
      footerColor: data.footerColor,
      backgroundColor: data.backgroundColor,
    },
    create: {
      id: 1,
      logo: data.logo,
      favicon: data.favicon,
      navbarColor: data.navbarColor,
      footerColor: data.footerColor,
      backgroundColor: data.backgroundColor,
    },
  });
  return NextResponse.json(settings);
}
