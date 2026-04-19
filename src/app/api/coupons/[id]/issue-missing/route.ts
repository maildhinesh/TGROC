import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const suffix = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `TGROC-${suffix}`;
}

// POST /api/coupons/[id]/issue-missing
// Issues this PUBLISHED coupon to any ACTIVE members who don't have it yet.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  if (coupon.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Coupon must be published first" }, { status: 400 });
  }

  // Find ACTIVE members who do not yet have a MemberCoupon for this coupon
  const alreadyIssuedUserIds = await prisma.memberCoupon
    .findMany({ where: { couponId: id }, select: { userId: true } })
    .then((rows) => rows.map((r) => r.userId));

  const newMembers = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      status: "ACTIVE",
      id: { notIn: alreadyIssuedUserIds },
    },
    select: { id: true },
  });

  if (newMembers.length === 0) {
    return NextResponse.json({ issued: 0, message: "All active members already have this coupon." });
  }

  // Generate unique codes for each new member
  const existingCodes = await prisma.memberCoupon
    .findMany({ select: { code: true } })
    .then((rows) => new Set(rows.map((r) => r.code)));

  const records: { couponId: string; userId: string; code: string }[] = [];
  const usedCodes = new Set<string>(existingCodes);

  for (const member of newMembers) {
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      if (attempts > 20) throw new Error("Failed to generate unique coupon codes");
    } while (usedCodes.has(code));
    usedCodes.add(code);
    records.push({ couponId: id, userId: member.id, code });
  }

  await prisma.memberCoupon.createMany({ data: records, skipDuplicates: true });

  return NextResponse.json({ issued: records.length });
}
