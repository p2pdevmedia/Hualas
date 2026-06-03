import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { formatFullName } from '@/lib/mobile-format';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { createPickupNoticeBaseSchema } from '@/lib/validations/pickup-notice';
import { notifyPickupNoticeCreated } from '@/lib/notifications/notification-service';

const createMobilePickupNoticeSchema = createPickupNoticeBaseSchema
  .extend({
    activityDayId: z.string().min(1, 'Activity day is required'),
  })
  .refine((data) => data.alternatePersonUserId || data.alternatePersonName, {
    message: 'Either select a person or enter a name',
    path: ['alternatePersonUserId'],
  });

function formatActivityDayLabel(day: {
  date: Date;
  schedule: string;
  activity: { name: string };
}) {
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(day.date);

  return `${day.activity.name} · ${dateLabel} · ${day.schedule}`;
}

function mapNotice(notice: {
  id: string;
  activityDayId: string;
  childId: string;
  child: { name: string; lastName: string | null };
  activityDay: {
    date: Date;
    schedule: string;
    activity: { name: string };
  };
  alternatePersonUserId: string | null;
  alternatePersonName: string | null;
  alternatePersonUser: { name: string | null; lastName: string | null } | null;
  createdBy: { name: string | null; lastName: string | null };
  description: string;
  createdAt: Date;
}) {
  return {
    id: notice.id,
    activityDayId: notice.activityDayId,
    childId: notice.childId,
    childLabel: formatFullName(notice.child),
    activityDayLabel: formatActivityDayLabel(notice.activityDay),
    alternatePersonUserId: notice.alternatePersonUserId,
    alternatePersonName: notice.alternatePersonName,
    alternatePersonLabel: notice.alternatePersonUser
      ? formatFullName(notice.alternatePersonUser)
      : notice.alternatePersonName || 'Sin dato',
    description: notice.description,
    createdByLabel: formatFullName(notice.createdBy),
    createdAt: notice.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(
    session.userId
  );
  const notices = await prisma.pickupNotice.findMany({
    where: {
      deletedAt: null,
      OR: [
        { createdById: session.userId },
        { child: { userId: { in: accessibleChildOwnerIds } } },
      ],
    },
    include: {
      activityDay: {
        include: {
          activity: true,
        },
      },
      child: {
        select: {
          name: true,
          lastName: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          lastName: true,
        },
      },
      alternatePersonUser: {
        select: {
          name: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      activityDay: {
        date: 'asc',
      },
    },
  });

  return NextResponse.json({
    notices: notices.map(mapNotice),
  });
}

export async function POST(req: Request) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = createMobilePickupNoticeSchema.parse(await req.json());
    const now = new Date();
    const accessibleChildOwnerIds = await getAccessibleChildOwnerIds(
      session.userId
    );

    const activityDay = await prisma.activityDay.findUnique({
      where: { id: data.activityDayId },
      include: {
        activity: true,
      },
    });

    if (!activityDay) {
      return NextResponse.json(
        { error: 'No se encontró el día de actividad.' },
        { status: 404 }
      );
    }

    if (activityDay.date <= now) {
      return NextResponse.json(
        { error: 'No podés crear avisos para actividades pasadas.' },
        { status: 400 }
      );
    }

    const child = await prisma.child.findFirst({
      where: {
        id: data.childId,
        userId: { in: accessibleChildOwnerIds },
      },
      select: {
        id: true,
        name: true,
        lastName: true,
      },
    });

    if (!child) {
      return NextResponse.json(
        { error: 'No podés crear un aviso para ese hijo.' },
        { status: 403 }
      );
    }

    const childEnrolled = await prisma.activityParticipant.findFirst({
      where: {
        activityId: activityDay.activityId,
        childId: data.childId,
        status: 'ACTIVE',
        ...(activityDay.activityGroupId
          ? {
              groupMembership: {
                activityGroupId: activityDay.activityGroupId,
              },
            }
          : {}),
      },
    });

    if (!childEnrolled) {
      return NextResponse.json(
        { error: 'Ese hijo no está inscripto en ese grupo de actividad.' },
        { status: 400 }
      );
    }

    const existingNotice = await prisma.pickupNotice.findUnique({
      where: {
        activityDayId_childId: {
          activityDayId: data.activityDayId,
          childId: data.childId,
        },
      },
      include: {
        activityDay: {
          include: {
            activity: true,
          },
        },
        child: {
          select: {
            name: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            lastName: true,
          },
        },
        alternatePersonUser: {
          select: {
            name: true,
            lastName: true,
          },
        },
      },
    });

    if (existingNotice) {
      if (!existingNotice.deletedAt) {
        return NextResponse.json(
          { error: 'Ya existe un aviso para ese hijo en ese día.' },
          { status: 400 }
        );
      }

      const restoredNotice = await prisma.pickupNotice.update({
        where: { id: existingNotice.id },
        data: {
          alternatePersonUserId: data.alternatePersonUserId || null,
          alternatePersonName: data.alternatePersonName || null,
          description: data.description,
          deletedAt: null,
          updatedAt: new Date(),
        },
        include: {
          activityDay: {
            include: {
              activity: true,
            },
          },
          child: {
            select: {
              name: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              name: true,
              lastName: true,
            },
          },
          alternatePersonUser: {
            select: {
              name: true,
              lastName: true,
            },
          },
        },
      });

      notifyPickupNoticeCreated(restoredNotice.id).catch((error) => {
        console.error(
          '[mobile pickup notices] restore notification failed',
          error
        );
      });

      return NextResponse.json(mapNotice(restoredNotice), { status: 201 });
    }

    const notice = await prisma.pickupNotice.create({
      data: {
        activityDayId: data.activityDayId,
        childId: data.childId,
        createdById: session.userId,
        alternatePersonUserId: data.alternatePersonUserId || null,
        alternatePersonName: data.alternatePersonName || null,
        description: data.description,
      },
      include: {
        activityDay: {
          include: {
            activity: true,
          },
        },
        child: {
          select: {
            name: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            lastName: true,
          },
        },
        alternatePersonUser: {
          select: {
            name: true,
            lastName: true,
          },
        },
      },
    });

    notifyPickupNoticeCreated(notice.id).catch((error) => {
      console.error(
        '[mobile pickup notices] creation notification failed',
        error
      );
    });

    return NextResponse.json(mapNotice(notice), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos.', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[mobile pickup notices] create failed', error);
    return NextResponse.json(
      { error: 'No se pudo crear el aviso.' },
      { status: 500 }
    );
  }
}
