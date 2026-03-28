import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ALLOWED_ROLES = ["ADMIN", "OFFICE_BEARER"];

// GET /api/membership-fees
// Returns current fees (one per type) + full history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await prisma.membershipFee.findMany({
    orderBy: [{ membershipType: "asc" }, { effectiveFrom: "desc" }],
    include: {
      createdBy: {
        select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  // Current fee = null effectiveTo (or effectiveTo in the future), latest effectiveFrom
  const current: Record<string, typeof all[number]> = {};
  const now = new Date();

  for (const fee of all) {
    const isCurrent = !fee.effectiveTo || fee.effectiveTo > now;
    if (isCurrent && !current[fee.membershipType]) {
      current[fee.membershipType] = fee;
    }
  }

  return NextResponse.json({ current: Object.values(current), history: all });
}

// POST /api/membership-fees
// Creates a new fee entry for a membership type; closes the previous current fee
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { membershipType, amount, effectiveFrom, notes } = body;

  if (!membershipType || amount === undefined || !effectiveFrom) {
    return NextResponse.json({ error: "membershipType, amount and effectiveFrom are required" }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: "Amount must be a non-negative number" }, { status: 400 });
  }

  const effectiveFromDate = new Date(effectiveFrom);
  if (isNaN(effectiveFromDate.getTime())) {
    return NextResponse.json({ error: "Invalid effectiveFrom date" }, { status: 400 });
  }

  // Close the existing open fee for this type (set effectiveTo to day before new effectiveFrom)
  const effectiveTo = new Date(effectiveFromDate);
  effectiveTo.setDate(effectiveTo.getDate() - 1);

  await prisma.membershipFee.updateMany({
    where: {
      membershipType,
      effectiveTo: null,
    },
    data: { effectiveTo },
  });

  const newFee = await prisma.membershipFee.create({
    data: {
      membershipType,
      amount: parsedAmount,
      effectiveFrom: effectiveFromDate,
      effectiveTo: null,
      notes: notes ?? null,
      createdById: session.user.id,
    },
    include: {
      createdBy: {
        select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ fee: newFee }, { status: 201 });
}
