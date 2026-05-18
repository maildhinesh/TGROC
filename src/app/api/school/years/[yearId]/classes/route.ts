import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, hasAnySchoolRole, isSchoolAdmin, isSchoolTeacher, unauthorized } from "@/lib/school-auth";
import { schoolClassSchema } from "@/lib/validations";

export async function GET(_: Request, { params }: { params: Promise<{ yearId: string }> }) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!hasAnySchoolRole(accessState)) {
    return forbidden();
  }

  const { yearId } = await params;
  const classes = await prisma.schoolClass.findMany({
    where: {
      schoolYearId: yearId,
      ...(isSchoolTeacher(accessState)
        ? {
            teacherAssignments: {
              some: {
                teacherUserId: session.user.id,
                assignedTo: null,
              },
            },
          }
        : {}),
    },
    orderBy: [{ className: "asc" }],
    include: {
      teacherAssignments: {
        where: { assignedTo: null },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      },
      studentAssignments: {
        where: { removedOn: null },
        include: {
          studentProfile: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return NextResponse.json({ classes });
}

export async function POST(req: Request, { params }: { params: Promise<{ yearId: string }> }) {
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
  const parsed = schoolClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { yearId } = await params;
  if (parsed.data.schoolYearId !== yearId) {
    return NextResponse.json({ error: "schoolYearId must match the route yearId" }, { status: 400 });
  }

  const schoolYear = await prisma.schoolYear.findUnique({ where: { id: yearId }, select: { id: true } });
  if (!schoolYear) {
    return NextResponse.json({ error: "School year not found" }, { status: 404 });
  }

  const schoolClass = await prisma.schoolClass.create({
    data: {
      schoolYearId: yearId,
      classCode: parsed.data.classCode,
      className: parsed.data.className,
      levelOrGrade: parsed.data.levelOrGrade,
      maxCapacity: parsed.data.maxCapacity ?? null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ class: schoolClass }, { status: 201 });
}
