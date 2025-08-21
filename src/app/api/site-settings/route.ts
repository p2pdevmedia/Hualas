import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.formData();

  const navbarColor = data.get('navbarColor') as string;
  const footerColor = data.get('footerColor') as string;
  const backgroundColor = data.get('backgroundColor') as string;

  let logoPath: string | undefined;
  let faviconPath: string | undefined;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });

  const logoFile = data.get('logo') as File | null;
  if (logoFile && logoFile.size > 0) {
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const filename = `logo-${Date.now()}${path.extname(logoFile.name)}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    logoPath = `/uploads/${filename}`;
  }

  const faviconFile = data.get('favicon') as File | null;
  if (faviconFile && faviconFile.size > 0) {
    const buffer = Buffer.from(await faviconFile.arrayBuffer());
    const filename = `favicon-${Date.now()}${path.extname(faviconFile.name)}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    faviconPath = `/uploads/${filename}`;
  }

  const settings = await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      navbarColor,
      footerColor,
      backgroundColor,
      ...(logoPath && { logo: logoPath }),
      ...(faviconPath && { favicon: faviconPath }),
    },
    create: {
      id: 1,
      navbarColor,
      footerColor,
      backgroundColor,
      logo: logoPath ?? null,
      favicon: faviconPath ?? null,
    },
  });

  return NextResponse.json(settings);
}
