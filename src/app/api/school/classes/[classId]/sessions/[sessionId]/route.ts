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
import { classSessionUpdateSchema } from "@/lib/validations";

async function canManageClass(userId: string, classId: string, admin: boolean) {
  if (admin) {
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

export async function PATCH(
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
  if (!admin && !isSchoolTeacher(accessState)) {
    return forbidden();
  }

  const { classId, sessionId } = await params;
  const allowed = await canManageClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = classSessionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.classroomId) {
    const classroom = await prisma.campusClassroom.findUnique({
      where: { id: parsed.data.classroomId },
      select: { id: true, isActive: true },
    });

    if (!classroom || !classroom.isActive) {
      return NextResponse.json({ error: "Classroom not found or inactive" }, { status: 400 });
    }
  }

  const existing = await prisma.classSession.findFirst({
    where: {
      id: sessionId,
      schoolClassId: classId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  const updated = await prisma.classSession.update({
    where: { id: sessionId },
    data: {
      calendarDate: parsed.data.calendarDate ? new Date(parsed.data.calendarDate) : undefined,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
      classroomId: parsed.data.classroomId,
      status: parsed.data.status,
    },
    include: {
      classroom: true,
      _count: { select: { attendanceEntries: true } },
    },
  });

  return NextResponse.json({ session: updated });
}
