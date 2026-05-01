import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acknowledgePickupNoticeSchema } from "@/lib/validations/pickup-notice";
import { notifyPickupNoticeAcknowledged } from "@/lib/notifications/notification-service";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ noticeId: string }> }
) {
  const params = await context.params;
  const { noticeId } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Get the notice with its activity day
    const notice = await prisma.pickupNotice.findUnique({
      where: { id: noticeId },
      include: { activityDay: true },
    });

    if (!notice) {
      return NextResponse.json(
        { error: "Notice not found" },
        { status: 404 }
      );
    }

    // Verify the professor is assigned to this activity day
    const isAssigned = await prisma.activityDayProfessor.findFirst({
      where: {
        activityDayId: notice.activityDayId,
        userId: session.user.id,
      },
    });

    if (!isAssigned) {
      return NextResponse.json(
        { error: "You do not have access to this notice" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = acknowledgePickupNoticeSchema.parse(body);

    // Create or update acknowledgment (upsert on unique constraint)
    const ack = await prisma.pickupNoticeAcknowledgment.upsert({
      where: {
        pickupNoticeId_acknowledgedById: {
          pickupNoticeId: noticeId,
          acknowledgedById: session.user.id,
        },
      },
      create: {
        pickupNoticeId: noticeId,
        acknowledgedById: session.user.id,
        notes: data.notes,
      },
      update: {
        notes: data.notes,
        confirmedAt: new Date(),
      },
      include: {
        acknowledgedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    notifyPickupNoticeAcknowledged(ack.id).catch((err) =>
      console.error('[notifications] notifyPickupNoticeAcknowledged failed', err),
    );

    return NextResponse.json(ack, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error acknowledging notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
