import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const pricingSchema = z.object({
  isFree: z.boolean(),
  feeType: z.enum(["FAMILY", "INDIVIDUAL"]).nullable().optional(),
  memberFamilyFee: z.number().nonnegative().nullable().optional(),
  nonMemberFamilyFee: z.number().nonnegative().nullable().optional(),
  memberAdultFee: z.number().nonnegative().nullable().optional(),
  nonMemberAdultFee: z.number().nonnegative().nullable().optional(),
  memberKidFee: z.number().nonnegative().nullable().optional(),
  nonMemberKidFee: z.number().nonnegative().nullable().optional(),
  studentMemberFee: z.number().nonnegative().nullable().optional(),
  studentNonMemberFee: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional().nullable(),
});

// GET /api/events/[id]/pricing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as string | undefined;

  // Confirm event exists and is visible to caller
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!MGMT_ROLES.includes(role ?? "") && event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pricing = await prisma.eventPricing.findUnique({ where: { eventId: id } });
  return NextResponse.json({ pricing });
}

// PUT /api/events/[id]/pricing — create or overwrite pricing (Admin + Officer)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = pricingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const {
    isFree, feeType, memberFamilyFee, nonMemberFamilyFee,
    memberAdultFee, nonMemberAdultFee, memberKidFee, nonMemberKidFee,
    studentMemberFee, studentNonMemberFee, notes,
  } = result.data;

  const pricing = await prisma.eventPricing.upsert({
    where: { eventId: id },
    update: {
      isFree,
      feeType: isFree ? null : (feeType ?? null),
      memberFamilyFee: isFree || feeType !== "FAMILY" ? null : (memberFamilyFee ?? null),
      nonMemberFamilyFee: isFree || feeType !== "FAMILY" ? null : (nonMemberFamilyFee ?? null),
      memberAdultFee: isFree ? null : (memberAdultFee ?? null),
      nonMemberAdultFee: isFree ? null : (nonMemberAdultFee ?? null),
      memberKidFee: isFree || feeType === "FAMILY" ? null : (memberKidFee ?? null),
      nonMemberKidFee: isFree || feeType === "FAMILY" ? null : (nonMemberKidFee ?? null),
      studentMemberFee: isFree ? null : (studentMemberFee ?? null),
      studentNonMemberFee: isFree ? null : (studentNonMemberFee ?? null),
      notes: notes?.trim() || null,
      updatedById: session.user.id,
    },
    create: {
      eventId: id,
      isFree,
      feeType: isFree ? null : (feeType ?? null),
      memberFamilyFee: isFree || feeType !== "FAMILY" ? null : (memberFamilyFee ?? null),
      nonMemberFamilyFee: isFree || feeType !== "FAMILY" ? null : (nonMemberFamilyFee ?? null),
      memberAdultFee: isFree ? null : (memberAdultFee ?? null),
      nonMemberAdultFee: isFree ? null : (nonMemberAdultFee ?? null),
      memberKidFee: isFree || feeType === "FAMILY" ? null : (memberKidFee ?? null),
      nonMemberKidFee: isFree || feeType === "FAMILY" ? null : (nonMemberKidFee ?? null),
      studentMemberFee: isFree ? null : (studentMemberFee ?? null),
      studentNonMemberFee: isFree ? null : (studentNonMemberFee ?? null),
      notes: notes?.trim() || null,
      updatedById: session.user.id,
    },
  });

  return NextResponse.json({ pricing });
}
