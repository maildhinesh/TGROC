import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

// GET /api/coupons/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      _count: { select: { memberCoupons: true } },
      memberCoupons: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  return NextResponse.json({ coupon });
}

// PATCH /api/coupons/[id]
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

  const schema = z.object({
    title: z.string().min(2).optional(),
    businessName: z.string().min(2).optional(),
    businessAddress: z.string().optional(),
    businessHours: z.string().optional(),
    contactNumbers: z.string().optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
    discountValue: z.number().positive().optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    description: z.string().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "EXPIRED"]).optional(),
  });

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { expiryDate, ...rest } = result.data;
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...rest,
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
    },
  });

  return NextResponse.json({ coupon });
}

// DELETE /api/coupons/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
