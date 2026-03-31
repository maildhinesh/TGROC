import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

// GET /api/events — public list (published) or management list (?manage=1) or member view (?member=1)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const manage = searchParams.get("manage") === "1";
  const member = searchParams.get("member") === "1";

  if (manage) {
    const session = await getServerSession(authOptions);
    if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const events = await prisma.event.findMany({
      orderBy: { eventDate: "desc" },
      include: {
        createdBy: {
          select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { rsvps: true } },
      },
    });
    return NextResponse.json({ events });
  }

  if (member) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email as string;
    const rawEvents = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        eventDate: true,
        venue: true,
        posterUrl: true,
        rsvps: {
          where: { email: userEmail },
          select: { attending: true, guestCount: true },
          take: 1,
        },
      },
    });
    // Flatten rsvp to a single object per event
    const eventsWithRsvp = rawEvents.map((ev: {
      id: string;
      name: string;
      description: string | null;
      eventDate: Date;
      venue: string;
      posterUrl: string | null;
      rsvps: { attending: string; guestCount: number }[];
    }) => ({
      id: ev.id,
      name: ev.name,
      description: ev.description,
      eventDate: ev.eventDate,
      venue: ev.venue,
      posterUrl: ev.posterUrl,
      rsvp: ev.rsvps[0] ?? null,
    }));
    return NextResponse.json({ events: eventsWithRsvp });
  }

  // Public: only published events, upcoming first
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { eventDate: "asc" },
    select: { id: true, name: true, eventDate: true, venue: true },
  });
  return NextResponse.json({ events });
}

// POST /api/events — create event (Admin + Officer)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, eventDate, venue, status } = body;

  if (!name?.trim() || !eventDate || !venue?.trim()) {
    return NextResponse.json(
      { error: "Event name, date/time, and venue are required" },
      { status: 400 }
    );
  }

  const parsedDate = new Date(eventDate);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      eventDate: parsedDate,
      venue: venue.trim(),
      status: status ?? "DRAFT",
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
