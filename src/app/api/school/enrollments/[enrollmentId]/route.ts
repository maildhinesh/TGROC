import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbidden,
  getSchoolAccessState,
  getSchoolSession,
  hasAnySchoolRole,
  isEligibleSchoolParent,
  isSchoolAdmin,
  unauthorized,
} from "@/lib/school-auth";
import { schoolEnrollmentReviewSchema, schoolEnrollmentUpdateSchema } from "@/lib/validations";

export async function GET(_: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
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

  const { enrollmentId } = await params;
  const enrollment = await prisma.schoolEnrollment.findFirst({
    where: isSchoolAdmin(accessState)
      ? { id: enrollmentId }
      : {
          id: enrollmentId,
          parentUserId: session.user.id,
        },
    include: {
      schoolYear: true,
      studentProfile: true,
      medicalInfo: true,
      waivers: true,
      parent: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  return NextResponse.json({ enrollment });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  const { enrollmentId } = await params;

  if (isSchoolAdmin(accessState)) {
    const body = await req.json();
    const parsed = schoolEnrollmentReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const enrollment = await prisma.schoolEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, status: true },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    if (!["SUBMITTED", "REJECTED", "DRAFT"].includes(enrollment.status)) {
      return NextResponse.json({ error: "Enrollment cannot be reviewed in its current state" }, { status: 400 });
    }

    const nextStatus = parsed.data.decision === "APPROVED" ? "APPROVED" : "REJECTED";
    const reviewedEnrollment = await prisma.schoolEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
        rejectionReason: nextStatus === "REJECTED" ? parsed.data.rejectionReason?.trim() ?? null : null,
      },
      include: {
        schoolYear: { select: { id: true, label: true } },
        studentProfile: { select: { id: true, firstName: true, lastName: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ enrollment: reviewedEnrollment });
  }

  if (!isEligibleSchoolParent(accessState)) {
    return forbidden("An active paid parent membership is required");
  }

  const body = await req.json();
  const parsed = schoolEnrollmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Only draft or rejected enrollments can be updated" }, { status: 400 });
  }

  const updatedEnrollment = await prisma.schoolEnrollment.update({
    where: { id: enrollmentId },
    data: {
      medicalInfo: parsed.data.medicalInfo
        ? {
            update: {
              insuranceProviderName: parsed.data.medicalInfo.insuranceProviderName,
              insurancePolicyNumber: parsed.data.medicalInfo.insurancePolicyNumber,
              insuranceGroupNumber: parsed.data.medicalInfo.insuranceGroupNumber ?? null,
              insurancePhone: parsed.data.medicalInfo.insurancePhone ?? null,
              policyHolderName: parsed.data.medicalInfo.policyHolderName ?? null,
              pediatricianName: parsed.data.medicalInfo.pediatricianName,
              pediatricianPhone: parsed.data.medicalInfo.pediatricianPhone,
              pediatricianAddress: parsed.data.medicalInfo.pediatricianAddress ?? null,
              medicalNotes: parsed.data.medicalInfo.medicalNotes ?? null,
            },
          }
        : undefined,
      waivers: parsed.data.waivers
        ? {
            update: {
              medicalWaiverAccepted: parsed.data.waivers.medicalWaiverAccepted,
              medicalWaiverVersion: parsed.data.waivers.medicalWaiverVersion,
              medicalWaiverAcceptedAt: new Date(),
              mediaWaiverAccepted: parsed.data.waivers.mediaWaiverAccepted,
              mediaWaiverVersion: parsed.data.waivers.mediaWaiverVersion,
              mediaWaiverAcceptedAt: new Date(),
              acceptedByUserId: session.user.id,
            },
          }
        : undefined,
      updatedAt: new Date(),
    },
    include: {
      medicalInfo: true,
      waivers: true,
    },
  });

  return NextResponse.json({ enrollment: updatedEnrollment });
}
