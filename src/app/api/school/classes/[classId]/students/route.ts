import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isSchoolAdmin, unauthorized } from "@/lib/school-auth";
import { classStudentAssignmentSchema } from "@/lib/validations";

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
  const parsed = classStudentAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { classId } = await params;
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, schoolYearId: true },
  });

  if (!schoolClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      id: { in: parsed.data.studentProfileIds },
      enrollments: {
        some: {
          schoolYearId: schoolClass.schoolYearId,
          status: "APPROVED",
        },
      },
    },
    select: { id: true },
  });

  if (students.length !== new Set(parsed.data.studentProfileIds).size) {
    return NextResponse.json({ error: "One or more students are invalid or not approved for this school year" }, { status: 400 });
  }

  const uniqueStudentIds = [...new Set(parsed.data.studentProfileIds)];

  await prisma.$transaction([
    // Ensure one active class per student within a school year.
    prisma.classStudentAssignment.updateMany({
      where: {
        schoolYearId: schoolClass.schoolYearId,
        studentProfileId: { in: uniqueStudentIds },
        removedOn: null,
      },
      data: { removedOn: new Date() },
    }),
    prisma.classStudentAssignment.updateMany({
      where: {
        schoolClassId: classId,
        removedOn: null,
      },
      data: { removedOn: new Date() },
    }),
    prisma.classStudentAssignment.createMany({
      data: uniqueStudentIds.map((studentProfileId) => ({
        schoolClassId: classId,
        studentProfileId,
        schoolYearId: schoolClass.schoolYearId,
      })),
    }),
  ]);

  const assignments = await prisma.classStudentAssignment.findMany({
    where: {
      schoolClassId: classId,
      removedOn: null,
    },
    include: {
      studentProfile: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ assignments });
}
