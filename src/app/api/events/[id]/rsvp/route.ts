import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const itemSelectionSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(1).max(999),
});

const rsvpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  attending: z.enum(["YES", "NO", "MAYBE"]),
  adultCount: z.number().int().min(0).max(20).default(1),
  kidCount: z.number().int().min(0).max(20).default(0),
  vegetarianCount: z.number().int().min(0).max(40).default(0),
  nonVegetarianCount: z.number().int().min(0).max(40).default(0),
  notes: z.string().optional(),
  items: z.array(itemSelectionSchema).optional(),
});

// GET /api/events/[id]/rsvp — list RSVPs (Admin + Officer)
// ?full=1 returns all members merged with their RSVP status plus guest RSVPs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "OFFICE_BEARER"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const full = new URL(req.url).searchParams.get("full") === "1";

  if (full) {
    interface RsvpItem { item: { id: string; name: string }; quantity: number; }
    interface RsvpRow { id: string; email: string; name: string; phone: string | null; attending: string; adultCount: number; kidCount: number; vegetarianCount: number; nonVegetarianCount: number; notes: string | null; items: RsvpItem[]; }

    const members = await prisma.user.findMany({
      where: { role: "MEMBER" },
      select: {
        id: true,
        email: true,
        membershipType: true,
        profile: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ profile: { lastName: "asc" } }, { email: "asc" }],
    });

    const rsvps = (await prisma.eventRsvp.findMany({
      where: { eventId: id },
      include: {
        items: { include: { item: { select: { id: true, name: true } } } },
      },
    })) as unknown as RsvpRow[];

    const rsvpByEmail = new Map<string, RsvpRow>(rsvps.map((r) => [r.email, r]));
    const memberEmails = new Set(members.map((m: { email: string }) => m.email));

    const rows: {
      key: string; name: string; email: string; type: string;
      membershipType: string | null; status: string; adultCount: number; kidCount: number;
      vegetarianCount: number; nonVegetarianCount: number;
      notes: string | null; items: { name: string; quantity: number }[];
    }[] = [];

    for (const member of members) {
      const rsvp = rsvpByEmail.get(member.email);
      rows.push({
        key: `member-${member.id}`,
        name: member.profile
          ? `${member.profile.firstName} ${member.profile.lastName}`
          : member.email,
        email: member.email,
        type: "MEMBER",
        membershipType: member.membershipType ?? null,
        status: rsvp?.attending ?? "NO_ACTION",
        adultCount: rsvp?.adultCount ?? 0,
        kidCount: rsvp?.kidCount ?? 0,
        vegetarianCount: rsvp?.vegetarianCount ?? 0,
        nonVegetarianCount: rsvp?.nonVegetarianCount ?? 0,
        notes: rsvp?.notes ?? null,
        items: rsvp?.items.map((i: RsvpItem) => ({ name: i.item.name, quantity: i.quantity })) ?? [],
      });
    }

    // Guest RSVPs — not matched to any member
    for (const rsvp of rsvps) {
      if (!memberEmails.has(rsvp.email)) {
        rows.push({
          key: `guest-${rsvp.id}`,
          name: rsvp.name,
          email: rsvp.email,
          type: "GUEST",
          membershipType: null,
          status: rsvp.attending,
          adultCount: rsvp.adultCount,
          kidCount: rsvp.kidCount,
          vegetarianCount: rsvp.vegetarianCount,
          nonVegetarianCount: rsvp.nonVegetarianCount,
          notes: rsvp.notes,
          items: rsvp.items.map((i: RsvpItem) => ({ name: i.item.name, quantity: i.quantity })),
        });
      }
    }

    return NextResponse.json({ rows });
  }

  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: id },
    orderBy: [{ attending: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: { id: true, email: true, role: true } },
      items: {
        include: { item: { select: { id: true, name: true } } },
      },
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
  const { name, email, phone, attending, adultCount, kidCount, vegetarianCount, nonVegetarianCount, notes, items } = result.data;

  // Upsert so the same email can update their RSVP
  const rsvp = await prisma.eventRsvp.upsert({
    where: { eventId_email: { eventId: id, email } },
    update: {
      name,
      phone: phone || null,
      attending,
      adultCount: attending === "YES" ? (adultCount ?? 1) : 0,
      kidCount: attending === "YES" ? (kidCount ?? 0) : 0,
      vegetarianCount: attending === "YES" ? (vegetarianCount ?? 0) : 0,
      nonVegetarianCount: attending === "YES" ? (nonVegetarianCount ?? 0) : 0,
      notes: notes || null,
    },
    create: {
      eventId: id,
      userId: session?.user?.id ?? null,
      name,
      email,
      phone: phone || null,
      attending,
      adultCount: attending === "YES" ? (adultCount ?? 1) : 0,
      kidCount: attending === "YES" ? (kidCount ?? 0) : 0,
      vegetarianCount: attending === "YES" ? (vegetarianCount ?? 0) : 0,
      nonVegetarianCount: attending === "YES" ? (nonVegetarianCount ?? 0) : 0,
      notes: notes || null,
    },
  });

  // Replace item selections
  await prisma.eventRsvpItem.deleteMany({ where: { rsvpId: rsvp.id } });
  if (items && items.length > 0) {
    // Validate that all itemIds belong to this event
    const validItems = await prisma.eventItem.findMany({
      where: { eventId: id, id: { in: items.map((i) => i.itemId) } },
      select: { id: true },
    });
    const validIds = new Set(validItems.map((i: { id: string }) => i.id));
    const toCreate = items
      .filter((i) => validIds.has(i.itemId))
      .map((i) => ({ rsvpId: rsvp.id, itemId: i.itemId, quantity: i.quantity }));
    if (toCreate.length > 0) {
      await prisma.eventRsvpItem.createMany({ data: toCreate });
    }
  }

  return NextResponse.json({ rsvp }, { status: 201 });
}
