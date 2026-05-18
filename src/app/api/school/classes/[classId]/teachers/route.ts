import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isSchoolAdmin, unauthorized } from "@/lib/school-auth";
import { classTeacherAssignmentSchema } from "@/lib/validations";

export async function PUT(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!isSchoolAdmin(accessState)) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = classTeacherAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { classId } = await params;
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true },
  });

  if (!schoolClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const teachers = await prisma.user.findMany({
    where: {
      id: { in: parsed.data.teacherUserIds },
      schoolRoleAssignments: {
        some: {
          role: "SCHOOL_TEACHER",
          isActive: true,
        },
      },
    },
    select: { id: true },
  });

  if (teachers.length !== new Set(parsed.data.teacherUserIds).size) {
    return NextResponse.json({ error: "One or more teachers are invalid or inactive" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.classTeacherAssignment.updateMany({
      where: {
        schoolClassId: classId,
        assignedTo: null,
      },
      data: { assignedTo: new Date() },
    }),
    prisma.classTeacherAssignment.createMany({
      data: [...new Set(parsed.data.teacherUserIds)].map((teacherUserId) => ({
        schoolClassId: classId,
        teacherUserId,
      })),
    }),
  ]);

  const assignments = await prisma.classTeacherAssignment.findMany({
    where: {
      schoolClassId: classId,
      assignedTo: null,
    },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ assignments });
}
