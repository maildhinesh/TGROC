import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCheckInCode } from "@/lib/checkin-code";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];
const FEE_PAID_MARKER = "[FEE_PAID]";

const payloadSchema = z.object({
  code: z.string().min(1, "Check-in code is required"),
});

// POST /api/events/[id]/checkin/scan — verify QR/check-in code and load attendee RSVP
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = payloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  let decoded;
  try {
    decoded = verifyCheckInCode(result.data.code.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to verify code";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!decoded) {
    return NextResponse.json({ error: "Invalid or corrupted check-in code." }, { status: 400 });
  }

  if (decoded.eventId !== id) {
    return NextResponse.json({ error: "This check-in code belongs to a different event." }, { status: 400 });
  }

  const [rsvp, existingCheckIn] = await Promise.all([
    prisma.eventRsvp.findUnique({
      where: { id: decoded.rsvpId },
      select: {
        id: true,
        eventId: true,
        email: true,
        name: true,
        phone: true,
        attending: true,
        adultCount: true,
        kidCount: true,
        notes: true,
      },
    }),
    prisma.eventCheckIn.findUnique({
      where: { eventId_email: { eventId: id, email: decoded.email } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        adultCount: true,
        kidCount: true,
        amountPaid: true,
        paymentNote: true,
        checkedInAt: true,
      },
    }),
  ]);

  if (!rsvp || rsvp.eventId !== id || rsvp.email.toLowerCase() !== decoded.email.toLowerCase()) {
    return NextResponse.json({ error: "RSVP not found for this check-in code." }, { status: 404 });
  }

  if (rsvp.attending !== "YES") {
    return NextResponse.json({ error: "This RSVP is not confirmed for attendance." }, { status: 400 });
  }

  return NextResponse.json({
    attendee: {
      rsvpId: rsvp.id,
      name: rsvp.name,
      email: rsvp.email,
      phone: rsvp.phone,
      adultCount: rsvp.adultCount,
      kidCount: rsvp.kidCount,
      feePaid: !!rsvp.notes?.includes(FEE_PAID_MARKER),
    },
    existingCheckIn: existingCheckIn
      ? {
          ...existingCheckIn,
          amountPaid: existingCheckIn.amountPaid?.toString() ?? null,
        }
      : null,
  });
}
