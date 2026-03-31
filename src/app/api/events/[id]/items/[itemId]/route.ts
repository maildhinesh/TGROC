import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(200).nullable().optional(),
  quantityNeeded: z.number().int().min(1).max(9999).optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH /api/events/[id]/items/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;

  const existing = await prisma.eventItem.findFirst({ where: { id: itemId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { name, description, quantityNeeded, sortOrder } = result.data;

  const item = await prisma.eventItem.update({
    where: { id: itemId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(quantityNeeded !== undefined && { quantityNeeded }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json({ item });
}

// DELETE /api/events/[id]/items/[itemId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;

  const existing = await prisma.eventItem.findFirst({ where: { id: itemId, eventId: id } });
  if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await prisma.eventItem.delete({ where: { id: itemId } });
  return NextResponse.json({ message: "Item deleted" });
}
