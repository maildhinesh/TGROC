import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schoolRoles = ["SCHOOL_PARENT", "SCHOOL_TEACHER", "SCHOOL_ADMIN"] as const;

const updateSchoolRolesSchema = z.object({
  roles: z.array(z.enum(schoolRoles)),
});

// GET /api/users/[id]/school-roles — fetch current school roles for a user
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const assignments = await prisma.schoolUserRole.findMany({
    where: { userId: id },
    select: { role: true, isActive: true },
  });

  return NextResponse.json({ assignments });
}

// PUT /api/users/[id]/school-roles — replace school roles for a user
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchoolRolesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { roles } = parsed.data;

  // Upsert each possible role: activate if in the list, deactivate if not
  await prisma.$transaction(
    schoolRoles.map((role) =>
      prisma.schoolUserRole.upsert({
        where: { userId_role: { userId: id, role } },
        create: { userId: id, role, isActive: roles.includes(role) },
        update: { isActive: roles.includes(role) },
      })
    )
  );

  const updated = await prisma.schoolUserRole.findMany({
    where: { userId: id },
    select: { role: true, isActive: true },
  });

  return NextResponse.json({ assignments: updated });
}
