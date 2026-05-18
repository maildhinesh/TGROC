import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbidden,
  getSchoolAccessState,
  getSchoolSession,
  isSchoolAdmin,
  isSchoolTeacher,
  unauthorized,
} from "@/lib/school-auth";
import { gradeEntrySchema } from "@/lib/validations";

async function canAccessClass(userId: string, classId: string, isAdmin: boolean) {
  if (isAdmin) {
    return true;
  }

  const assignment = await prisma.classTeacherAssignment.findFirst({
    where: {
      schoolClassId: classId,
      teacherUserId: userId,
      assignedTo: null,
    },
    select: { id: true },
  });

  return Boolean(assignment);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ classId: string; gradeItemId: string }> }
) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  const admin = isSchoolAdmin(accessState);
  const teacher = isSchoolTeacher(accessState);
  if (!admin && !teacher) {
    return forbidden();
  }

  const { classId, gradeItemId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const gradeItem = await prisma.gradeItem.findFirst({
    where: {
      id: gradeItemId,
      schoolClassId: classId,
    },
    include: {
      studentGrades: {
        include: {
          studentProfile: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ studentProfile: { firstName: "asc" } }],
      },
    },
  });

  if (!gradeItem) {
    return NextResponse.json({ error: "Grade item not found" }, { status: 404 });
  }

  const roster = await prisma.classStudentAssignment.findMany({
    where: {
      schoolClassId: classId,
      removedOn: null,
    },
    include: {
      studentProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ studentProfile: { firstName: "asc" } }],
  });

  return NextResponse.json({ gradeItem, roster });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ classId: string; gradeItemId: string }> }
) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  const admin = isSchoolAdmin(accessState);
  const teacher = isSchoolTeacher(accessState);
  if (!admin && !teacher) {
    return forbidden();
  }

  const { classId, gradeItemId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = gradeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const gradeItem = await prisma.gradeItem.findFirst({
    where: {
      id: gradeItemId,
      schoolClassId: classId,
    },
    select: { id: true, maxScore: true },
  });

  if (!gradeItem) {
    return NextResponse.json({ error: "Grade item not found" }, { status: 404 });
  }

  const uniqueEntries = [...new Map(parsed.data.entries.map((entry) => [entry.studentProfileId, entry])).values()];

  const roster = await prisma.classStudentAssignment.findMany({
    where: {
      schoolClassId: classId,
      removedOn: null,
      studentProfileId: { in: uniqueEntries.map((entry) => entry.studentProfileId) },
    },
    select: { studentProfileId: true },
  });

  if (roster.length !== uniqueEntries.length) {
    return NextResponse.json({ error: "One or more students are not currently rostered for this class" }, { status: 400 });
  }

  const maxScore = Number(gradeItem.maxScore);
  if (uniqueEntries.some((entry) => entry.score > maxScore)) {
    return NextResponse.json({ error: "One or more scores exceed the max score for this grade item" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.studentGrade.deleteMany({
      where: {
        gradeItemId,
        studentProfileId: { in: uniqueEntries.map((entry) => entry.studentProfileId) },
      },
    }),
    prisma.studentGrade.createMany({
      data: uniqueEntries.map((entry) => ({
        gradeItemId,
        studentProfileId: entry.studentProfileId,
        score: entry.score,
        letterGrade: entry.letterGrade ?? null,
        comment: entry.comment ?? null,
        gradedByUserId: session.user.id,
      })),
    }),
  ]);

  const grades = await prisma.studentGrade.findMany({
    where: { gradeItemId },
    include: {
      studentProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ studentProfile: { firstName: "asc" } }],
  });

  return NextResponse.json({ grades });
}
