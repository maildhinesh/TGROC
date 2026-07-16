import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbidden,
  getSchoolAccessState,
  getSchoolSession,
  hasAnySchoolRole,
  isEligibleSchoolParent,
  isSchoolAdmin,
  isSchoolTeacher,
  unauthorized,
} from "@/lib/school-auth";
import { schoolEnrollmentCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const schoolYearId = searchParams.get("schoolYearId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  if (isSchoolAdmin(accessState)) {
    const enrollments = await prisma.schoolEnrollment.findMany({
      where: {
        schoolYearId,
        status: status as never,
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schoolYear: { select: { id: true, label: true } },
        studentProfile: { select: { id: true, firstName: true, lastName: true } },
        parent: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ enrollments });
  }

  if (isSchoolTeacher(accessState)) {
    const enrollments = await prisma.schoolEnrollment.findMany({
      where: {
        schoolYearId,
        status: status as never,
        schoolYear: {
          classes: {
            some: {
              teacherAssignments: {
                some: {
                  teacherUserId: session.user.id,
                  assignedTo: null,
                },
              },
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schoolYear: { select: { id: true, label: true } },
        studentProfile: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ enrollments });
  }

  if (!isEligibleSchoolParent(accessState)) {
    return forbidden("An active paid parent membership is required");
  }

  const enrollments = await prisma.schoolEnrollment.findMany({
    where: {
      parentUserId: session.user.id,
      schoolYearId,
      status: status as never,
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      schoolYear: { select: { id: true, label: true } },
      studentProfile: { select: { id: true, firstName: true, lastName: true } },
      medicalInfo: true,
      waivers: true,
    },
  });

  return NextResponse.json({ enrollments });
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

  if (!isEligibleSchoolParent(accessState)) {
    return forbidden("An active paid parent membership is required");
  }

  const body = await req.json();
  const parsed = schoolEnrollmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const student = await prisma.studentProfile.findFirst({
    where: {
      id: parsed.data.studentProfileId,
      parentUserId: session.user.id,
    },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: parsed.data.schoolYearId },
    select: { id: true, status: true },
  });

  if (!schoolYear) {
    return NextResponse.json({ error: "School year not found" }, { status: 404 });
  }

  if (schoolYear.status === "CLOSED") {
    return NextResponse.json({ error: "Enrollment is closed for this school year" }, { status: 400 });
  }

  const existingEnrollment = await prisma.schoolEnrollment.findFirst({
    where: {
      schoolYearId: parsed.data.schoolYearId,
      studentProfileId: parsed.data.studentProfileId,
    },
    select: { id: true },
  });

  if (existingEnrollment) {
    return NextResponse.json({ error: "Enrollment already exists for this student and year" }, { status: 409 });
  }

  const enrollment = await prisma.schoolEnrollment.create({
    data: {
      schoolYearId: parsed.data.schoolYearId,
      studentProfileId: parsed.data.studentProfileId,
      parentUserId: session.user.id,
      status: "DRAFT",
      medicalInfo: {
        create: {
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
      },
      waivers: {
        create: {
          medicalWaiverAccepted: parsed.data.waivers.medicalWaiverAccepted,
          medicalWaiverVersion: parsed.data.waivers.medicalWaiverVersion,
          medicalWaiverAcceptedAt: new Date(),
          mediaWaiverAccepted: parsed.data.waivers.mediaWaiverAccepted,
          mediaWaiverVersion: parsed.data.waivers.mediaWaiverVersion,
          mediaWaiverAcceptedAt: new Date(),
          acceptedByUserId: session.user.id,
        },
      },
    },
    include: {
      medicalInfo: true,
      waivers: true,
    },
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}
