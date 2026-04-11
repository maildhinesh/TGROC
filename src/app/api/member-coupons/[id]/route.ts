import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/member-coupons/[id] — mark a member coupon as REDEEMED
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership before allowing redemption
  const mc = await prisma.memberCoupon.findUnique({ where: { id } });
  if (!mc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mc.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (mc.status !== "ACTIVE")
    return NextResponse.json({ error: "Coupon is not active" }, { status: 400 });

  const updated = await prisma.memberCoupon.update({
    where: { id },
    data: { status: "REDEEMED", redeemedAt: new Date() },
  });

  return NextResponse.json({ memberCoupon: updated });
}
