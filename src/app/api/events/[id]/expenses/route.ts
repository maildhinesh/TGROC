import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const expenseSchema = z.object({
  category: z.enum(["HALL_RENT", "FOOD", "SUPPLIES", "CLEANING", "MISCELLANEOUS"]),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
});

// GET /api/events/[id]/expenses — list expenses
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const expenses = await prisma.eventExpense.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ expenses });
}

// POST /api/events/[id]/expenses — add an expense
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
  const result = expenseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const expense = await prisma.eventExpense.create({
    data: {
      eventId: id,
      category: result.data.category,
      description: result.data.description,
      amount: result.data.amount,
      createdById: session.user.id,
    },
    include: {
      createdBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
