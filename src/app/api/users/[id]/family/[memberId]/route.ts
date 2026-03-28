import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { familyMemberSchema } from "@/lib/validations";

// PATCH /api/users/[id]/family/[memberId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = familyMemberSchema.partial().safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { dateOfBirth, email, ...rest } = result.data;

  const member = await prisma.familyMember.update({
    where: { id: memberId, userId: id },
    data: {
      ...rest,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      email: email || null,
    },
  });

  return NextResponse.json({ member });
}

// DELETE /api/users/[id]/family/[memberId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, memberId } = await params;

  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.familyMember.delete({
    where: { id: memberId, userId: id },
  });

  return NextResponse.json({ message: "Family member removed" });
}
