import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

// GET /api/events/[id] — public for published, all for admins/officers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { rsvps: { where: { attending: "YES" } } } },
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Non-managers can only see published events
  if (!MGMT_ROLES.includes(role ?? "") && event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

// PATCH /api/events/[id] — update event (Admin + Officer)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, description, eventDate, venue, status } = body;

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
      ...(venue && { venue: venue.trim() }),
      ...(status && { status }),
    },
  });

  return NextResponse.json({ event });
}

// DELETE /api/events/[id] — delete event (Admin + Officer)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ message: "Event deleted" });
}
