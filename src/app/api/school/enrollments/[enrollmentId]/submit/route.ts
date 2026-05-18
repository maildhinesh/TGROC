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
      medicalInfo: { select: { id: true } },
      waivers: { select: { id: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  if (!["DRAFT", "REJECTED"].includes(enrollment.status)) {
    return NextResponse.json({ error: "Only draft or rejected enrollments can be submitted" }, { status: 400 });
  }

  if (!enrollment.medicalInfo || !enrollment.waivers) {
    return NextResponse.json({ error: "Enrollment is incomplete" }, { status: 400 });
  }

  const updatedEnrollment = await prisma.schoolEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
    },
    include: {
      schoolYear: { select: { id: true, label: true } },
      studentProfile: { select: { id: true, firstName: true, lastName: true } },
      medicalInfo: true,
      waivers: true,
    },
  });

  return NextResponse.json({ enrollment: updatedEnrollment });
}
