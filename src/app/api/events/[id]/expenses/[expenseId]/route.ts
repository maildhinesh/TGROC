import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const updateSchema = z.object({
  category: z.enum(["HALL_RENT", "FOOD", "SUPPLIES", "CLEANING", "MISCELLANEOUS"]).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0.01).optional(),
});

// PATCH /api/events/[id]/expenses/[expenseId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, expenseId } = await params;
  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const expense = await prisma.eventExpense.update({
    where: { id: expenseId, eventId: id },
    data: result.data,
    include: {
      createdBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ expense });
}

// DELETE /api/events/[id]/expenses/[expenseId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, expenseId } = await params;
  await prisma.eventExpense.delete({ where: { id: expenseId, eventId: id } });
  return NextResponse.json({ ok: true });
}
