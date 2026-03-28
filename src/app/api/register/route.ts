import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validations";

// POST /api/register - Self-registration
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, phone, dateOfBirth, membershipType, password } =
    result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: `${firstName} ${lastName}`,
      password: hashedPassword,
      role: "MEMBER",
      status: "PENDING", // Requires admin activation
      membershipType: membershipType as any,
      profile: {
        create: {
          firstName,
          lastName,
          phone: phone || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
      },
      contactInfo: { create: {} },
      notificationSettings: { create: {} },
    },
    select: { id: true, email: true, name: true, status: true },
  });

  return NextResponse.json(
    {
      message:
        "Registration successful. Your account is pending approval by an administrator.",
      user,
    },
    { status: 201 }
  );
}
