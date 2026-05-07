import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { formatFullName } from '@/lib/mobile-format';
import { getMobileSessionFromRequest } from '@/lib/mobile-auth';
import { prisma } from '@/lib/prisma';
import { updatePickupNoticeSchema } from '@/lib/validations/pickup-notice';

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

async function checkNoticeOwnershipAndFuture(noticeId: string, userId: string) {
  const notice = await prisma.pickupNotice.findUnique({
    where: { id: noticeId },
    include: {
      activityDay: true,
      child: { select: { userId: true, name: true, lastName: true } },
      createdBy: { select: { id: true } },
      alternatePersonUser: { select: { name: true, lastName: true } },
    },
  });

  if (!notice) {
    return { valid: false, status: 404, message: 'Notice not found' };
  }

  let canManageNotice = notice.createdById === userId;
  if (!canManageNotice) {
    const accessibleOwnerIds = await getAccessibleChildOwnerIds(userId);
    canManageNotice = accessibleOwnerIds.includes(notice.child?.userId ?? '');
  }

  if (!canManageNotice) {
    return { valid: false, status: 403, message: 'Cannot modify this notice' };
  }

  if (new Date(notice.activityDay.date) <= new Date()) {
    return {
      valid: false,
      status: 400,
      message: 'Cannot modify notices after activity day',
    };
  }

  return { valid: true, notice };
}

export async function PUT(
  req: Request,
  { params }: { params: { noticeId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const check = await checkNoticeOwnershipAndFuture(
      params.noticeId,
      session.userId
    );
    if (!check.valid) {
      return NextResponse.json(
        { error: check.message },
        { status: check.status }
      );
    }

    const data = updatePickupNoticeSchema.parse(await req.json());

    const updated = await prisma.pickupNotice.update({
      where: { id: params.noticeId },
      data: {
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

    return NextResponse.json(mapNotice(updated), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[mobile pickup notices] update failed', error);
    return NextResponse.json(
      { error: 'No se pudo actualizar el aviso.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { noticeId: string } }
) {
  const session = await getMobileSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.appRole !== 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const check = await checkNoticeOwnershipAndFuture(
      params.noticeId,
      session.userId
    );
    if (!check.valid) {
      return NextResponse.json(
        { error: check.message },
        { status: check.status }
      );
    }

    await prisma.pickupNotice.update({
      where: { id: params.noticeId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mobile pickup notices] delete failed', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar el aviso.' },
      { status: 500 }
    );
  }
}
