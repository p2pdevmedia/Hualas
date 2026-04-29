import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePickupNoticeSchema } from "@/lib/validations/pickup-notice";
import { z } from "zod";

async function checkNoticeOwnershipAndFuture(
  noticeId: string,
  userId: string
) {
  const notice = await prisma.pickupNotice.findUnique({
    where: { id: noticeId },
    include: { activityDay: true },
  });

  if (!notice) {
    return { valid: false, status: 404, message: "Notice not found" };
  }

  if (notice.createdById !== userId) {
    return { valid: false, status: 403, message: "Cannot modify this notice" };
  }

  if (new Date(notice.activityDay.date) <= new Date()) {
    return {
      valid: false,
      status: 400,
      message: "Cannot modify notices after activity day",
    };
  }

  return { valid: true, notice };
}

export async function PUT(
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
    // Check ownership and future date
    const check = await checkNoticeOwnershipAndFuture(noticeId, session.user.id);
    if (!check.valid) {
      return NextResponse.json(
        { error: check.message },
        { status: check.status }
      );
    }

    const body = await req.json();
    const data = updatePickupNoticeSchema.parse(body);

    const updated = await prisma.pickupNotice.update({
      where: { id: noticeId },
      data: {
        alternatePersonUserId: data.alternatePersonUserId || null,
        alternatePersonName: data.alternatePersonName || null,
        description: data.description,
      },
      include: {
        acknowledgments: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating pickup notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    // Check ownership and future date
    const check = await checkNoticeOwnershipAndFuture(noticeId, session.user.id);
    if (!check.valid) {
      return NextResponse.json(
        { error: check.message },
        { status: check.status }
      );
    }

    // Soft delete
    await prisma.pickupNotice.update({
      where: { id: noticeId },
      data: {
        deletedAt: new Date(),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting pickup notice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
