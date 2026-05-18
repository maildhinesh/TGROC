import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardList, FileSpreadsheet, School2, TimerReset, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolAdmin } from "@/lib/school-auth";
import { EnrollmentSettingsCard } from "./enrollment-settings-card";

export default async function SchoolAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolAdmin(accessState)) {
    redirect("/school");
  }

  const [years, pendingEnrollments, classes, teachers] = await Promise.all([
    prisma.schoolYear.findMany({
      orderBy: [{ startsOn: "desc" }],
      take: 4,
      include: {
        _count: {
          select: { enrollments: true, classes: true },
        },
      },
    }),
    prisma.schoolEnrollment.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      take: 8,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schoolYear: { select: { label: true } },
        studentProfile: { select: { firstName: true, lastName: true } },
        parent: { select: { name: true, email: true } },
      },
    }),
    prisma.schoolClass.findMany({
      take: 6,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schoolYear: { select: { label: true } },
        _count: {
          select: { teacherAssignments: true, studentAssignments: true },
        },
      },
    }),
    prisma.user.count({
      where: {
        schoolRoleAssignments: {
          some: {
            role: "SCHOOL_TEACHER",
            isActive: true,
          },
        },
      },
    }),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="School Admin"
          description="Oversight for school years, classes, and enrollment review."
          action={
            <Link
              href="/school"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Back to School Hub
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="School Years" value={years.length} icon={<CalendarDays className="h-5 w-5" />} color="blue" />
          <StatCard title="Pending Reviews" value={pendingEnrollments.length} icon={<ClipboardList className="h-5 w-5" />} color="yellow" />
          <StatCard title="Active Classes" value={classes.length} icon={<School2 className="h-5 w-5" />} color="green" />
          <StatCard title="Active Teachers" value={teachers} icon={<Users className="h-5 w-5" />} color="purple" />
        </div>

        <EnrollmentSettingsCard />

        <Link
          href="/school/admin/sessions"
          className="block rounded-xl border border-emerald-200 bg-emerald-50 p-5 transition hover:bg-emerald-100"
        >
          <div className="flex items-start gap-3">
            <TimerReset className="mt-0.5 h-6 w-6 text-emerald-700" />
            <div>
              <h2 className="font-semibold text-emerald-900">Session Operations</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Manage classrooms, session schedules, and cross-class session visibility.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/school/admin/reports"
          className="block rounded-xl border border-violet-200 bg-violet-50 p-5 transition hover:bg-violet-100"
        >
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 h-6 w-6 text-violet-700" />
            <div>
              <h2 className="font-semibold text-violet-900">Reports and Exports</h2>
              <p className="mt-1 text-sm text-violet-800">
                Export attendance and grade reports for school operations.
              </p>
            </div>
          </div>
        </Link>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Enrollment Review Queue" description="Newest school enrollments awaiting decision.">
            <div className="space-y-3">
              {pendingEnrollments.length === 0 ? (
                <p className="text-sm text-gray-500">No enrollments need review right now.</p>
              ) : (
                pendingEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {enrollment.studentProfile.firstName} {enrollment.studentProfile.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {enrollment.schoolYear.label} · {enrollment.parent.name ?? enrollment.parent.email}
                        </p>
                      </div>
                      <Badge variant={enrollment.status === "UNDER_REVIEW" ? "info" : "warning"}>
                        {enrollment.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">Updated {formatDate(enrollment.updatedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="School Years" description="Current terms and enrollment volume.">
            <div className="space-y-3">
              {years.map((year) => (
                <div key={year.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{year.label}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(year.startsOn)} to {formatDate(year.endsOn)}
                      </p>
                    </div>
                    <Badge variant={year.status === "ACTIVE" ? "success" : year.status === "PLANNED" ? "info" : "default"}>
                      {year.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {year._count.enrollments} enrollments · {year._count.classes} classes
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Recent Classes" description="Latest class groups available for staffing and roster management.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.length === 0 ? (
              <p className="text-sm text-gray-500">No classes created yet.</p>
            ) : (
              classes.map((schoolClass) => (
                <div key={schoolClass.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="font-medium text-gray-900">{schoolClass.className}</p>
                  <p className="text-sm text-gray-500">
                    {schoolClass.classCode} · {schoolClass.levelOrGrade}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{schoolClass.schoolYear.label}</p>
                  <p className="mt-3 text-sm text-gray-600">
                    {schoolClass._count.teacherAssignments} teacher assignments · {schoolClass._count.studentAssignments} student assignments
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
