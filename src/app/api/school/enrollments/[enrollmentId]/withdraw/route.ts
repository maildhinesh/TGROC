import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isEligibleSchoolParent, unauthorized } from "@/lib/school-auth";

export async function POST(_: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!isEligibleSchoolParent(accessState)) {
    return forbidden("An active paid parent membership is required");
  }

  const { enrollmentId } = await params;
  const enrollment = await prisma.schoolEnrollment.findFirst({
    where: {
      id: enrollmentId,
      parentUserId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      schoolYear: { select: { status: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  if (enrollment.schoolYear.status === "CLOSED") {
    return NextResponse.json({ error: "Closed school year enrollments cannot be withdrawn" }, { status: 400 });
  }

  if (!["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].includes(enrollment.status)) {
    return NextResponse.json({ error: "Enrollment cannot be withdrawn in its current state" }, { status: 400 });
  }

  const updatedEnrollment = await prisma.schoolEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
    },
    include: {
      schoolYear: { select: { id: true, label: true } },
      studentProfile: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ enrollment: updatedEnrollment });
}
