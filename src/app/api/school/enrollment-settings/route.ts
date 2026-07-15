import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SCHOOL_ADMIN_ROLE, getSchoolAccessState, hasSchoolRole } from "@/lib/school-auth";

const updateSettingsSchema = z.object({
  isEnrollmentEnabled: z.boolean(),
});

// GET /api/school/enrollment-settings — fetch enrollment settings
export async function GET() {
  const settings = await prisma.schoolEnrollmentSettings.findFirst({
    select: { isEnrollmentEnabled: true, updatedAt: true },
  });

  return NextResponse.json({
    isEnrollmentEnabled: settings?.isEnrollmentEnabled ?? false,
    updatedAt: settings?.updatedAt ?? null,
  });
}

// PUT /api/school/enrollment-settings — update enrollment settings (admin only)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessState = await getSchoolAccessState(session.user.id);
  const isGlobalAdmin = session.user.role === "ADMIN";
  const isSchoolAdmin = accessState ? hasSchoolRole(accessState, SCHOOL_ADMIN_ROLE) : false;

  if (!isGlobalAdmin && !isSchoolAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { isEnrollmentEnabled } = parsed.data;

  // Upsert: if no settings exist, create; if exists, update
  const settings = await prisma.schoolEnrollmentSettings.upsert({
    where: { id: "singleton" }, // Use a fixed ID to ensure only one record
    create: {
      id: "singleton",
      isEnrollmentEnabled,
      updatedById: session.user.id,
    },
    update: {
      isEnrollmentEnabled,
      updatedById: session.user.id,
      updatedAt: new Date(),
    },
    select: { isEnrollmentEnabled: true, updatedAt: true },
  });

  return NextResponse.json(settings);
}
