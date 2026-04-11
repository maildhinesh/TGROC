import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

/** Generate a short, human-readable unique coupon code (e.g. "TGROC-A3BK9X2M") */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const suffix = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `TGROC-${suffix}`;
}

// POST /api/coupons/[id]/publish
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
  if (coupon.status === "PUBLISHED") {
    return NextResponse.json({ error: "Coupon is already published" }, { status: 400 });
  }
  if (coupon.status === "EXPIRED") {
    return NextResponse.json({ error: "Cannot publish an expired coupon" }, { status: 400 });
  }

  // Get all ACTIVE members
  const members = await prisma.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE" },
    select: { id: true },
  });

  if (members.length === 0) {
    return NextResponse.json({ error: "No active members to issue coupons to" }, { status: 400 });
  }

  // Generate a unique code for each member — retry on collision
  const records: { couponId: string; userId: string; code: string }[] = [];
  const usedCodes = new Set<string>();

  for (const member of members) {
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

  // Wrap in transaction: publish coupon + create MemberCoupon rows
  await prisma.$transaction([
    prisma.coupon.update({ where: { id }, data: { status: "PUBLISHED" } }),
    prisma.memberCoupon.createMany({ data: records, skipDuplicates: true }),
  ]);

  return NextResponse.json({ issued: records.length });
}
