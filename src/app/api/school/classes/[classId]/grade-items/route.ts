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
import { gradeItemSchema } from "@/lib/validations";

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
  const teacher = isSchoolTeacher(accessState);
  if (!admin && !teacher) {
    return forbidden();
  }

  const { classId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const gradeItems = await prisma.gradeItem.findMany({
    where: { schoolClassId: classId },
    include: {
      category: true,
      _count: {
        select: { studentGrades: true },
      },
    },
    orderBy: [{ assignedOn: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ gradeItems });
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
  const teacher = isSchoolTeacher(accessState);
  if (!admin && !teacher) {
    return forbidden();
  }

  const { classId } = await params;
  const allowed = await canAccessClass(session.user.id, classId, admin);
  if (!allowed) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = gradeItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true, gradeCategories: { select: { id: true } } },
  });
  if (!schoolClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (
    parsed.data.categoryId &&
    !schoolClass.gradeCategories.some((category) => category.id === parsed.data.categoryId)
  ) {
    return NextResponse.json({ error: "Invalid grade category for this class" }, { status: 400 });
  }

  const item = await prisma.gradeItem.create({
    data: {
      schoolClassId: classId,
      categoryId: parsed.data.categoryId ?? null,
      title: parsed.data.title,
      maxScore: parsed.data.maxScore,
      assignedOn: new Date(parsed.data.assignedOn),
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
