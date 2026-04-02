import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/users/[id] - Get a specific user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Members can only view their own profile
  console.log("Session user ID:", session.user.id, "Requested ID:", id);
  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      familyMembers: true,
      contactInfo: true,
      notificationSettings: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { password: _, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

// PATCH /api/users/[id] - Update a user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Members can only update their own profile (not role/status)
  if (session.user.role === "MEMBER" && session.user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Members cannot change their own role or status
  if (session.user.role === "MEMBER") {
    delete body.role;
    delete body.status;
    delete body.membershipType;
  }

  const { profile, contactInfo, notificationSettings, password, currentPassword, ...userData } = body;

  // Self-service password change: verify current password before proceeding
  if (password && session.user.role !== "ADMIN") {
    if (session.user.id !== id || !currentPassword) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const dbUser = await prisma.user.findUnique({ where: { id }, select: { password: true } });
    if (!dbUser?.password) {
      return NextResponse.json(
        { error: "Password change is not available for social login accounts." },
        { status: 400 }
      );
    }
    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  const updates: any[] = [];

  // Update User record whenever there are user-level fields OR a name change from profile
  if (Object.keys(userData).length > 0 || profile) {
    updates.push(
      prisma.user.update({
        where: { id },
        data: {
          ...userData,
          ...(userData.membershipExpiry !== undefined && {
            membershipExpiry: userData.membershipExpiry
              ? new Date(userData.membershipExpiry)
              : null,
          }),
          ...(profile && {
            name: `${profile.firstName} ${profile.lastName}`,
          }),
        },
      })
    );
  }

  if (profile) {
    updates.push(
      prisma.profile.upsert({
        where: { userId: id },
        update: {
          ...profile,
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
        },
        create: {
          userId: id,
          ...profile,
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
        },
      })
    );
  }

  if (contactInfo) {
    updates.push(
      prisma.contactInfo.upsert({
        where: { userId: id },
        update: contactInfo,
        create: { userId: id, ...contactInfo },
      })
    );
  }

  if (notificationSettings) {
    updates.push(
      prisma.notificationSettings.upsert({
        where: { userId: id },
        update: notificationSettings,
        create: { userId: id, ...notificationSettings },
      })
    );
  }

  if (password && (session.user.role === "ADMIN" || (session.user.id === id && currentPassword))) {
    const hashed = await bcrypt.hash(password, 12);
    updates.push(prisma.user.update({ where: { id }, data: { password: hashed } }));
  }

  await prisma.$transaction(updates);

  const updated = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      familyMembers: true,
      contactInfo: true,
      notificationSettings: true,
    },
  });

  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { password: _, ...safeUser } = updated;
  return NextResponse.json({ user: safeUser });
}

// DELETE /api/users/[id] - Delete a user (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "User deleted successfully" });
}
