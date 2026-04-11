import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/member-coupons — returns coupons issued to the current member
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberCoupons = await prisma.memberCoupon.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      coupon: {
        select: {
          id: true,
          title: true,
          businessName: true,
          businessAddress: true,
          businessHours: true,
          contactNumbers: true,
          logoUrl: true,
          discountType: true,
          discountValue: true,
          expiryDate: true,
          description: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ memberCoupons });
}
