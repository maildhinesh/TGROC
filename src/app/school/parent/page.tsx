import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isEligibleSchoolParent } from "@/lib/school-auth";
import ParentWorkspaceClient, { type ParentEnrollment, type ParentStudent, type SchoolYearOption } from "./parent-workspace-client";

export default async function SchoolParentPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isEligibleSchoolParent(accessState)) {
    redirect("/school");
  }

  const prismaAny = prisma as unknown as Record<string, { findMany?: (...args: unknown[]) => Promise<unknown> } & Record<string, unknown>>;
  const hasFamilyMemberDelegate = typeof prismaAny.familyMember?.findMany === "function";
  const hasStudentProfileDelegate = typeof prismaAny.studentProfile?.findMany === "function";
  const hasSchoolYearDelegate = typeof prismaAny.schoolYear?.findMany === "function";
  const hasSchoolEnrollmentDelegate = typeof prismaAny.schoolEnrollment?.findMany === "function";
  const hasEnrollmentSettingsDelegate = typeof prismaAny.schoolEnrollmentSettings?.findFirst === "function";

  const studentKey = (firstName: string, lastName: string, dateOfBirth: Date | string) => {
    const dateKey = typeof dateOfBirth === "string" ? dateOfBirth.split("T")[0] : dateOfBirth.toISOString().split("T")[0];
    return `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}|${dateKey}`;
  };

  // Auto-sync StudentProfile entries from CHILD family members
  const childFamilyMembers = hasFamilyMemberDelegate
    ? await prisma.familyMember.findMany({
        where: { userId: session.user.id, relationship: "CHILD" },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          email: true,
          phone: true,
        },
      })
    : [];

  const spouseFamilyMember = hasFamilyMemberDelegate
    ? await prisma.familyMember.findFirst({
        where: { userId: session.user.id, relationship: "SPOUSE" },
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          email: true,
          phone: true,
        },
      })
    : null;

  const childrenWithDob = childFamilyMembers.filter((c) => c.dateOfBirth !== null);
  const childrenMissingDob = childFamilyMembers.length - childrenWithDob.length;

  if (childrenWithDob.length > 0 && hasStudentProfileDelegate) {
    const existingProfiles = await prisma.studentProfile.findMany({
      where: { parentUserId: session.user.id },
      select: { firstName: true, lastName: true, dateOfBirth: true },
    });
    const existingKeys = new Set(
      existingProfiles.map(
        (p) => `${p.firstName}|${p.lastName}|${p.dateOfBirth.toISOString().split("T")[0]}`
      )
    );
    const toCreate = childrenWithDob.filter((c) => {
      const key = `${c.firstName}|${c.lastName}|${c.dateOfBirth!.toISOString().split("T")[0]}`;
      return !existingKeys.has(key);
    });
    if (toCreate.length > 0) {
      await prisma.studentProfile.createMany({
        data: toCreate.map((c) => ({
          parentUserId: session.user.id,
          firstName: c.firstName,
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth!,
        })),
        skipDuplicates: true,
      });
    }
  }

  const [parentUser, students, years, enrollments, enrollmentSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        profile: {
          select: {
            phone: true,
          },
        },
      },
    }),
    hasStudentProfileDelegate
      ? prisma.studentProfile.findMany({
          where: { parentUserId: session.user.id },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : Promise.resolve([]),
    hasSchoolYearDelegate
      ? prisma.schoolYear.findMany({
          where: { status: { in: ["PLANNED", "ACTIVE"] } },
          orderBy: [{ startsOn: "desc" }],
          select: {
            id: true,
            label: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    hasSchoolEnrollmentDelegate
      ? prisma.schoolEnrollment.findMany({
          where: { parentUserId: session.user.id },
          include: {
            schoolYear: { select: { id: true, label: true, status: true } },
            studentProfile: { select: { id: true, firstName: true, lastName: true } },
            medicalInfo: true,
            waivers: true,
          },
          orderBy: [{ updatedAt: "desc" }],
        })
      : Promise.resolve([]),
    hasEnrollmentSettingsDelegate
      ? prisma.schoolEnrollmentSettings.findFirst({
          select: { isEnrollmentEnabled: true },
        })
      : Promise.resolve(null),
  ]);

  const childFamilyMemberByKey = new Map(childFamilyMembers.map((member) => [studentKey(member.firstName, member.lastName, member.dateOfBirth ?? ""), member]));

  const mappedStudents: ParentStudent[] = students.map((student) => ({
    ...student,
    dateOfBirth: student.dateOfBirth.toISOString(),
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    familyMemberId: childFamilyMemberByKey.get(studentKey(student.firstName, student.lastName, student.dateOfBirth))?.id ?? null,
    email: childFamilyMemberByKey.get(studentKey(student.firstName, student.lastName, student.dateOfBirth))?.email ?? null,
    phone: childFamilyMemberByKey.get(studentKey(student.firstName, student.lastName, student.dateOfBirth))?.phone ?? null,
  }));

  const mappedYears: SchoolYearOption[] = years;

  const mappedEnrollments: ParentEnrollment[] = enrollments.map((enrollment) => ({
    ...enrollment,
    submittedAt: enrollment.submittedAt?.toISOString() ?? null,
    reviewedAt: enrollment.reviewedAt?.toISOString() ?? null,
    approvedAt: enrollment.approvedAt?.toISOString() ?? null,
    withdrawnAt: enrollment.withdrawnAt?.toISOString() ?? null,
    createdAt: enrollment.createdAt.toISOString(),
    updatedAt: enrollment.updatedAt.toISOString(),
    schoolYear: {
      ...enrollment.schoolYear,
    },
    studentProfile: {
      ...enrollment.studentProfile,
    },
    medicalInfo: enrollment.medicalInfo
      ? {
          ...enrollment.medicalInfo,
          updatedAt: enrollment.medicalInfo.updatedAt.toISOString(),
        }
      : null,
    waivers: enrollment.waivers
      ? {
          ...enrollment.waivers,
          medicalWaiverAcceptedAt: enrollment.waivers.medicalWaiverAcceptedAt?.toISOString() ?? null,
          mediaWaiverAcceptedAt: enrollment.waivers.mediaWaiverAcceptedAt?.toISOString() ?? null,
          updatedAt: enrollment.waivers.updatedAt.toISOString(),
        }
      : null,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Parent Enrollment Workspace"
          description="Create student profiles, draft enrollments, edit details, and submit or withdraw as needed."
        />
        <ParentWorkspaceClient
          currentUserId={session.user.id}
          initialStudents={mappedStudents}
          initialYears={mappedYears}
          initialEnrollments={mappedEnrollments}
          initialParentContact={{
            parent1: {
              email: parentUser?.email ?? session.user.email ?? "",
              phone: parentUser?.profile?.phone ?? "",
            },
            parent2: {
              familyMemberId: spouseFamilyMember?.id ?? null,
              email: spouseFamilyMember?.email ?? "",
              phone: spouseFamilyMember?.phone ?? "",
            },
          }}
          isEnrollmentEnabled={enrollmentSettings?.isEnrollmentEnabled ?? false}
          childrenMissingDob={childrenMissingDob}
        />
      </div>
    </DashboardLayout>
  );
}
