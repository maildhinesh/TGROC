import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100),
  description: z.string().max(200).optional(),
  quantityNeeded: z.number().int().min(1).max(9999).default(1),
  sortOrder: z.number().int().default(0),
});

// GET /api/events/[id]/items — public list of items for an event
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Non-managers can only see items for published events
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;
  if (!MGMT_ROLES.includes(role ?? "") && event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.eventItem.findMany({
    where: { eventId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { rsvpItems: true },
      },
    },
  });

  // Compute total quantity committed per item
  const itemsWithCommitted = await Promise.all(
    items.map(async (item: { id: string; name: string; description: string | null; quantityNeeded: number; quantityCommitted?: number; sortOrder: number; _count: { rsvpItems: number }; createdAt: Date }) => {
      const agg = await prisma.eventRsvpItem.aggregate({
        where: { itemId: item.id },
        _sum: { quantity: true },
      });
      return { ...item, quantityCommitted: agg._sum.quantity ?? 0 };
    })
  );

  return NextResponse.json({ items: itemsWithCommitted });
}

// POST /api/events/[id]/items — create a new item (Admin + Officer)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const body = await req.json();
  const result = itemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const item = await prisma.eventItem.create({
    data: {
      eventId: id,
      name: result.data.name.trim(),
      description: result.data.description?.trim() || null,
      quantityNeeded: result.data.quantityNeeded,
      sortOrder: result.data.sortOrder,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
