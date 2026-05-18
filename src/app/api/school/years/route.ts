import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, getSchoolSession, hasAnySchoolRole, hasSchoolRole, SCHOOL_ADMIN_ROLE, forbidden, unauthorized } from "@/lib/school-auth";
import { schoolYearSchema } from "@/lib/validations";

export async function GET() {
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

  const years = await prisma.schoolYear.findMany({
    orderBy: [{ startsOn: "desc" }],
    select: {
      id: true,
      label: true,
      startsOn: true,
      endsOn: true,
      enrollmentOpenOn: true,
      enrollmentCloseOn: true,
      status: true,
      lastUpdatedAt: true,
    },
  });

  return NextResponse.json({ years });
}

export async function POST(req: Request) {
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
  const parsed = schoolYearSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const startsOn = new Date(parsed.data.startsOn);
  const endsOn = new Date(parsed.data.endsOn);
  const enrollmentOpenOn = parsed.data.enrollmentOpenOn ? new Date(parsed.data.enrollmentOpenOn) : null;
  const enrollmentCloseOn = parsed.data.enrollmentCloseOn ? new Date(parsed.data.enrollmentCloseOn) : null;

  if (startsOn >= endsOn) {
    return NextResponse.json({ error: "startsOn must be before endsOn" }, { status: 400 });
  }

  const year = await prisma.schoolYear.create({
    data: {
      label: parsed.data.label,
      startsOn,
      endsOn,
      enrollmentOpenOn,
      enrollmentCloseOn,
      status: parsed.data.status ?? "PLANNED",
      lastUpdatedById: session.user.id,
    },
  });

  return NextResponse.json({ year }, { status: 201 });
}
