import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const checkInSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  adultCount: z.number().int().min(0).max(50).default(1),
  kidCount: z.number().int().min(0).max(50).default(0),
  amountPaid: z.number().min(0).nullable().optional(),
  paymentNote: z.string().optional(),
});

// GET /api/events/[id]/checkin — list all check-ins
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const checkIns = await prisma.eventCheckIn.findMany({
    where: { eventId: id },
    orderBy: { checkedInAt: "desc" },
    include: {
      checkedInBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ checkIns });
}

// POST /api/events/[id]/checkin — check in a guest (RSVP or walk-in)
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
  const result = checkInSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, adultCount, kidCount, amountPaid, paymentNote } = result.data;

  const existing = await prisma.eventCheckIn.findUnique({
    where: { eventId_email: { eventId: id, email } },
  });
  if (existing) {
    return NextResponse.json({ error: "This person has already been checked in." }, { status: 409 });
  }

  const checkIn = await prisma.eventCheckIn.create({
    data: {
      eventId: id,
      name,
      email,
      phone: phone ?? null,
      adultCount,
      kidCount,
      amountPaid: amountPaid != null ? amountPaid : null,
      paymentNote: paymentNote ?? null,
      checkedInById: session.user.id,
    },
    include: {
      checkedInBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ checkIn }, { status: 201 });
}
