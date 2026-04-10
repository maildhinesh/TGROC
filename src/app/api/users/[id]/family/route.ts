import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { familyMemberSchema } from "@/lib/validations";

// GET /api/users/[id]/family - Get family members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.familyMember.findMany({
    where: { userId: id },
    orderBy: [{ relationship: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({ members });
}

// POST /api/users/[id]/family - Add a family member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify user has a family membership
  const user = await prisma.user.findUnique({ where: { id }, select: { membershipType: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.membershipType?.includes("FAMILY")) {
    return NextResponse.json(
      { error: "Family members can only be added to Family or Student-Family memberships" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const result = familyMemberSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { relationship, firstName, lastName, dateOfBirth, email, phone } = result.data;

  // Enforce only one spouse
  if (relationship === "SPOUSE") {
    const existingSpouse = await prisma.familyMember.findFirst({
      where: { userId: id, relationship: "SPOUSE" },
    });
    if (existingSpouse) {
      return NextResponse.json({ error: "A spouse is already registered" }, { status: 400 });
    }
  }

  const member = await prisma.familyMember.create({
    data: {
      userId: id,
      relationship: relationship as any,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}-01-01`) : null,
      email: email || null,
      phone: phone || null,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
