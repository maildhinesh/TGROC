import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbidden,
  getSchoolAccessState,
  getSchoolSession,
  hasAnySchoolRole,
  hasSchoolRole,
  SCHOOL_ADMIN_ROLE,
  unauthorized,
} from "@/lib/school-auth";
import { schoolCalendarSchema } from "@/lib/validations";

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
  const year = await prisma.schoolYear.findUnique({
    where: { id: yearId },
    select: {
      id: true,
      label: true,
      status: true,
      startsOn: true,
      endsOn: true,
      calendarDays: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!year) {
    return NextResponse.json({ error: "School year not found" }, { status: 404 });
  }

  return NextResponse.json({ year });
}

export async function PUT(req: Request, { params }: { params: Promise<{ yearId: string }> }) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!hasSchoolRole(accessState, SCHOOL_ADMIN_ROLE)) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = schoolCalendarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { yearId } = await params;
  const year = await prisma.schoolYear.findUnique({ where: { id: yearId }, select: { id: true } });
  if (!year) {
    return NextResponse.json({ error: "School year not found" }, { status: 404 });
  }

  const days = parsed.data.days.map((day) => ({
    schoolYearId: yearId,
    date: new Date(day.date),
    isSchoolDay: day.isSchoolDay,
    note: day.note ?? null,
  }));

  await prisma.$transaction([
    prisma.schoolCalendarDay.deleteMany({ where: { schoolYearId: yearId } }),
    ...(days.length > 0 ? [prisma.schoolCalendarDay.createMany({ data: days })] : []),
    prisma.schoolYear.update({
      where: { id: yearId },
      data: { lastUpdatedById: session.user.id },
    }),
  ]);

  const updatedYear = await prisma.schoolYear.findUnique({
    where: { id: yearId },
    select: {
      id: true,
      label: true,
      status: true,
      calendarDays: {
        orderBy: { date: "asc" },
      },
    },
  });

  return NextResponse.json({ year: updatedYear });
}
