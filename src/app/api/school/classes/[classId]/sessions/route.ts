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
import { classSessionCreateSchema } from "@/lib/validations";

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

export async function GET(_: Request, { params }: { params: Promise<{ classId: string }> }) {
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

  const { classId } = await params;
  const allowed = await canManageClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const sessions = await prisma.classSession.findMany({
    where: { schoolClassId: classId },
    include: {
      classroom: true,
      _count: { select: { attendanceEntries: true } },
    },
    orderBy: [{ calendarDate: "desc" }, { startTime: "desc" }],
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
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

  const { classId } = await params;
  const allowed = await canManageClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = classSessionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, schoolYearId: true },
  });
  if (!schoolClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const classroom = await prisma.campusClassroom.findUnique({
    where: { id: parsed.data.classroomId },
    select: { id: true, isActive: true },
  });
  if (!classroom || !classroom.isActive) {
    return NextResponse.json({ error: "Classroom not found or inactive" }, { status: 400 });
  }

  const classSession = await prisma.classSession.create({
    data: {
      schoolClassId: classId,
      schoolYearId: schoolClass.schoolYearId,
      calendarDate: new Date(parsed.data.calendarDate),
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      classroomId: parsed.data.classroomId,
      status: parsed.data.status ?? "SCHEDULED",
    },
    include: {
      classroom: true,
    },
  });

  return NextResponse.json({ session: classSession }, { status: 201 });
}
