import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
const PINATA_JWT = process.env.PINATA_JWT;

async function uploadToPinata(file: File) {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is not set');
  }
  const formData = new FormData();
  formData.append('file', file, file.name);
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });
  if (!res.ok) {
    throw new Error('Failed to upload file to Pinata');
  }
  const json = await res.json();
  return json.IpfsHash as string;
}

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

  let logoHash: string | undefined;
  let faviconHash: string | undefined;

  const logoFile = data.get('logo') as File | null;
  if (logoFile && logoFile.size > 0) {
    logoHash = await uploadToPinata(logoFile);
  }

  const faviconFile = data.get('favicon') as File | null;
  if (faviconFile && faviconFile.size > 0) {
    faviconHash = await uploadToPinata(faviconFile);
  }

  const settings = await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      navbarColor,
      footerColor,
      backgroundColor,
      ...(logoHash && { logo: logoHash }),
      ...(faviconHash && { favicon: faviconHash }),
    },
    create: {
      id: 1,
      navbarColor,
      footerColor,
      backgroundColor,
      logo: logoHash ?? null,
      favicon: faviconHash ?? null,
    },
  });

  return NextResponse.json(settings);
}
