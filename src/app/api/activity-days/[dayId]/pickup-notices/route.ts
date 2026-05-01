import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPickupNoticeSchema } from "@/lib/validations/pickup-notice";
import { notifyPickupNoticeCreated } from "@/lib/notifications/notification-service";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dayId: string }> }
) {
  const params = await context.params;
  const { dayId } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const data = createPickupNoticeSchema.parse(body);

    // Verify the activity day exists and is in the future
    const activityDay = await prisma.activityDay.findUnique({
      where: { id: dayId },
      include: { activity: true },
    });

    if (!activityDay) {
      return NextResponse.json(
        { error: "Activity day not found" },
        { status: 404 }
      );
    }

    if (new Date(activityDay.date) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot create notice for past activity day" },
        { status: 400 }
      );
    }

    // Verify the child belongs to the current user
    const child = await prisma.child.findUnique({
      where: { id: data.childId },
    });

    if (!child || child.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Cannot create notice for this child" },
        { status: 403 }
      );
    }

    // Verify the child is enrolled in this activity
    const childEnrolled = await prisma.activityParticipant.findFirst({
      where: {
        activityId: activityDay.activityId,
        childId: data.childId,
      },
    });

    if (!childEnrolled) {
      return NextResponse.json(
        { error: "Child is not enrolled in this activity" },
        { status: 400 }
      );
    }

    // Check for duplicate notice (including soft-deleted)
    const existingNotice = await prisma.pickupNotice.findUnique({
      where: {
        activityDayId_childId: {
          activityDayId: dayId,
          childId: data.childId,
        },
      },
    });

    if (existingNotice) {
      if (!existingNotice.deletedAt) {
        // Active notice already exists
        return NextResponse.json(
          { error: "A notice already exists for this child on this day" },
          { status: 400 }
        );
      } else {
        // Restore the soft-deleted notice instead of creating new
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
            acknowledgments: true,
          },
        });
        notifyPickupNoticeCreated(restoredNotice.id).catch((err) =>
          console.error('[notifications] notifyPickupNoticeCreated failed', err),
        );
        return NextResponse.json(restoredNotice, { status: 201 });
      }
    }

    // Create the notice
    const notice = await prisma.pickupNotice.create({
      data: {
        activityDayId: dayId,
        childId: data.childId,
        createdById: session.user.id,
        alternatePersonUserId: data.alternatePersonUserId || null,
        alternatePersonName: data.alternatePersonName || null,
        description: data.description,
      },
      include: {
        acknowledgments: true,
      },
    });

    notifyPickupNoticeCreated(notice.id).catch((err) =>
      console.error('[notifications] notifyPickupNoticeCreated failed', err),
    );

    return NextResponse.json(notice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating pickup notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ dayId: string }> }
) {
  const params = await context.params;
  const { dayId } = params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Verify the activity day exists
    const activityDay = await prisma.activityDay.findUnique({
      where: { id: dayId },
    });

    if (!activityDay) {
      return NextResponse.json(
        { error: "Activity day not found" },
        { status: 404 }
      );
    }

    // Check if user is a professor assigned to this day
    const isAssignedProfessor = await prisma.activityDayProfessor.findFirst({
      where: {
        activityDayId: dayId,
        userId: session.user.id,
      },
    });

    if (!isAssignedProfessor) {
      return NextResponse.json(
        { error: "You do not have access to this activity day" },
        { status: 403 }
      );
    }

    // Get all non-deleted notices for this day with acknowledgments
    const notices = await prisma.pickupNotice.findMany({
      where: {
        activityDayId: dayId,
        deletedAt: null,
      },
      include: {
        child: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        alternatePersonUser: {
          select: {
            id: true,
            name: true,
          },
        },
        acknowledgments: {
          include: {
            acknowledgedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(notices, { status: 200 });
  } catch (error) {
    console.error("Error fetching pickup notices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
