import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEventAnnouncementEmails } from "@/lib/email";

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
      _count: {
        select: {
          rsvps: { where: { attending: "YES" } },
          performances: true,
        },
      },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, description: true, quantityNeeded: true, sortOrder: true },
      },
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
  const { name, description, eventDate, venue, status, performanceRegOpen, performanceRegDeadline } = body;

  // Detect publish transition before updating
  const existing = await prisma.event.findUnique({ where: { id }, select: { status: true } });
  const isBeingPublished = status === "PUBLISHED" && existing?.status !== "PUBLISHED";

  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
      ...(venue && { venue: venue.trim() }),
      ...(status && { status }),
      ...(performanceRegOpen !== undefined && { performanceRegOpen }),
      ...(performanceRegDeadline !== undefined && {
        performanceRegDeadline: performanceRegDeadline ? new Date(performanceRegDeadline) : null,
      }),
    },
  });

  // Send announcement emails to all active members when first published
  if (isBeingPublished) {
    try {
      const members = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: {
          email: true,
          notificationSettings: { select: { emailNotifications: true, eventReminders: true } },
        },
      });
      const recipients = members
        .filter((m) => {
          const prefs = m.notificationSettings;
          return !prefs || (prefs.emailNotifications && prefs.eventReminders);
        })
        .map((m) => m.email as string);

      await sendEventAnnouncementEmails({
        eventId: id,
        eventName: event.name,
        eventDate: event.eventDate,
        venue: event.venue,
        posterUrl: event.posterUrl,
        recipients,
      });
    } catch (err) {
      console.error("[event publish] Failed to send announcement emails:", err);
    }
  }

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
