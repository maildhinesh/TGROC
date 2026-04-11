import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const couponSchema = z.object({
  title: z.string().min(2),
  businessName: z.string().min(2),
  businessAddress: z.string().optional(),
  businessHours: z.string().optional(),
  contactNumbers: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  description: z.string().optional(),
});

// GET /api/coupons — list all coupons (Admin/Officer)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberCoupons: true } },
      createdBy: {
        select: { id: true, profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ coupons });
}

// POST /api/coupons — create coupon (Admin/Officer)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = couponSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { title, businessName, businessAddress, businessHours, contactNumbers, discountType, discountValue, expiryDate, description } = result.data;

  try {
    const coupon = await prisma.coupon.create({
      data: {
        title,
        businessName,
        businessAddress: businessAddress || null,
        businessHours: businessHours || null,
        contactNumbers: contactNumbers || null,
        discountType,
        discountValue,
        expiryDate: new Date(expiryDate),
        description: description || null,
        status: "DRAFT",
        createdById: session.user.id,
      },
    });
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    console.error("POST /api/coupons error:", err);
    return NextResponse.json({ error: "Failed to create coupon. The database may need migrations to be applied." }, { status: 500 });
  }
}
