import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activityCreateSchema } from '@/lib/validations/activity';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;

  let imageUrl: string | undefined;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);
    imageUrl = `/uploads/${file.name}`;
  }

  const rawData = {
    name: formData.get('name') as string,
    date: formData.get('date') as string,
    frequency: formData.get('frequency') as string,
    description: (formData.get('description') as string) || undefined,
    price: Number(formData.get('price')),
    image: imageUrl,
  };

  const data = activityCreateSchema.parse(rawData);
  const activity = await prisma.activity.create({ data });
  return NextResponse.json(activity);
}
