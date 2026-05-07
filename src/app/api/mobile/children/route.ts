import { NextResponse } from 'next/server';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { formatMobileDateOnly } from '@/lib/mobile-format';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(session.userId);
  const children = await prisma.child.findMany({
    where: { userId: { in: accessibleChildOwnerIds } },
    select: {
      id: true,
      name: true,
      lastName: true,
      birthDate: true,
      address: true,
      profilePhoto: true,
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      observations: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    children: children.map((child) => ({
      id: child.id,
      name: child.name,
      lastName: child.lastName,
      birthDate: formatMobileDateOnly(child.birthDate),
      address: child.address,
      profilePhoto: child.profilePhoto,
      allergies: child.allergies,
      regularMedication: child.regularMedication,
      relevantDiseases: child.relevantDiseases,
      previousInjuries: child.previousInjuries,
      physicalRestrictions: child.physicalRestrictions,
      observations: child.observations,
    })),
  });
}
