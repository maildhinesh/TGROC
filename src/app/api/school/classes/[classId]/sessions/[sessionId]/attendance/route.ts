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
import { classSessionAttendanceSchema } from "@/lib/validations";

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
  { params }: { params: Promise<{ classId: string; sessionId: string }> }
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

  const { classId, sessionId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const classSession = await prisma.classSession.findFirst({
    where: {
      id: sessionId,
      schoolClassId: classId,
    },
    include: {
      schoolClass: {
        select: {
          id: true,
          className: true,
          classCode: true,
        },
      },
      attendanceEntries: {
        include: {
          studentProfile: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ studentProfile: { firstName: "asc" } }],
      },
    },
  });

  if (!classSession) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
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

  return NextResponse.json({
    session: classSession,
    roster,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ classId: string; sessionId: string }> }
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

  const { classId, sessionId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = classSessionAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const classSession = await prisma.classSession.findFirst({
    where: {
      id: sessionId,
      schoolClassId: classId,
    },
    select: { id: true },
  });

  if (!classSession) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
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

  await prisma.$transaction([
    prisma.studentAttendance.deleteMany({
      where: {
        classSessionId: sessionId,
        studentProfileId: { in: uniqueEntries.map((entry) => entry.studentProfileId) },
      },
    }),
    prisma.studentAttendance.createMany({
      data: uniqueEntries.map((entry) => ({
        classSessionId: sessionId,
        studentProfileId: entry.studentProfileId,
        status: entry.status,
        note: entry.note ?? null,
        markedByUserId: session.user.id,
      })),
    }),
  ]);

  const attendance = await prisma.studentAttendance.findMany({
    where: { classSessionId: sessionId },
    include: {
      studentProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ studentProfile: { firstName: "asc" } }],
  });

  return NextResponse.json({ attendance });
}
