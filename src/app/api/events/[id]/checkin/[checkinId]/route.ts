import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const updateSchema = z.object({
  adultCount: z.number().int().min(0).max(50).optional(),
  kidCount: z.number().int().min(0).max(50).optional(),
  amountPaid: z.number().min(0).nullable().optional(),
  paymentNote: z.string().optional(),
});

// PATCH /api/events/[id]/checkin/[checkinId] — update counts / payment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, checkinId } = await params;
  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { adultCount, kidCount, amountPaid, paymentNote } = result.data;

  const checkIn = await prisma.eventCheckIn.update({
    where: { id: checkinId, eventId: id },
    data: {
      ...(adultCount !== undefined && { adultCount }),
      ...(kidCount !== undefined && { kidCount }),
      ...(amountPaid !== undefined && { amountPaid: amountPaid != null ? amountPaid : null }),
      ...(paymentNote !== undefined && { paymentNote }),
    },
    include: {
      checkedInBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ checkIn });
}

// DELETE /api/events/[id]/checkin/[checkinId] — undo check-in
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, checkinId } = await params;
  await prisma.eventCheckIn.delete({ where: { id: checkinId, eventId: id } });
  return NextResponse.json({ ok: true });
}
