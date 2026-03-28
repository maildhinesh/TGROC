import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const rsvpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  attending: z.enum(["YES", "NO", "MAYBE"]),
  guestCount: z.number().min(0).max(20).default(1),
  notes: z.string().optional(),
});

// GET /api/events/[id]/rsvp — list RSVPs (Admin + Officer)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "OFFICE_BEARER"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: id },
    orderBy: [{ attending: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ rsvps });
}

// POST /api/events/[id]/rsvp — submit RSVP (public, no auth required)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const result = rsvpSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Event must exist and be published
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Event not found or not currently accepting RSVPs" },
      { status: 404 }
    );
  }

  const session = await getServerSession(authOptions);
  const { name, email, phone, attending, guestCount, notes } = result.data;

  // Upsert so the same email can update their RSVP
  const rsvp = await prisma.eventRsvp.upsert({
    where: { eventId_email: { eventId: id, email } },
    update: {
      name,
      phone: phone || null,
      attending,
      guestCount: attending === "YES" ? (guestCount ?? 1) : 0,
      notes: notes || null,
    },
    create: {
      eventId: id,
      userId: session?.user?.id ?? null,
      name,
      email,
      phone: phone || null,
      attending,
      guestCount: attending === "YES" ? (guestCount ?? 1) : 0,
      notes: notes || null,
    },
  });

  return NextResponse.json({ rsvp }, { status: 201 });
}
