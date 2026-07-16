import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardList, FileSpreadsheet, School2, TimerReset, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolAdmin } from "@/lib/school-auth";
import { EnrollmentSettingsCard } from "./enrollment-settings-card";
import { SchoolYearsCard } from "./school-years-card";
import { AdminManagementPanel } from "./admin-management-panel";

export default async function SchoolAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolAdmin(accessState)) {
    redirect("/school");
  }

  const [yearCount, pendingEnrollments, classes, yearsForClassrooms, teachersResult] = await Promise.all([
    prisma.schoolYear.count(),
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
      orderBy: [{ updatedAt: "desc" }],
      include: {
        schoolYear: { select: { id: true, label: true } },
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
        _count: {
          select: { teacherAssignments: true, studentAssignments: true },
        },
      },
    }),
    prisma.schoolYear.findMany({
      orderBy: [{ startsOn: "desc" }],
      select: { id: true, label: true, status: true },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "userId")::bigint AS count
      FROM "school_user_roles"
      WHERE "role" = 'SCHOOL_TEACHER' AND "isActive" = true
    `,
  ]);

  const teacherDirectory = await prisma.$queryRaw<Array<{ id: string; name: string | null; email: string }>>`
    SELECT u."id", u."name", u."email"
    FROM "users" u
    INNER JOIN "school_user_roles" sur ON sur."userId" = u."id"
    WHERE sur."role" = 'SCHOOL_TEACHER' AND sur."isActive" = true
    ORDER BY COALESCE(u."name", u."email") ASC
  `;

  const teachers = Number(teachersResult[0]?.count ?? 0);

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
          <StatCard title="School Years" value={yearCount} icon={<CalendarDays className="h-5 w-5" />} color="blue" />
          <StatCard title="Pending Reviews" value={pendingEnrollments.length} icon={<ClipboardList className="h-5 w-5" />} color="yellow" />
          <StatCard title="Active Classes" value={classes.length} icon={<School2 className="h-5 w-5" />} color="green" />
          <StatCard title="Active Teachers" value={teachers} icon={<Users className="h-5 w-5" />} color="purple" />
        </div>

        <EnrollmentSettingsCard />
        <SchoolYearsCard />
        <AdminManagementPanel
          initialPendingEnrollments={pendingEnrollments.map((enrollment) => ({
            id: enrollment.id,
            status: enrollment.status,
            updatedAt: enrollment.updatedAt.toISOString(),
            schoolYear: { label: enrollment.schoolYear.label },
            studentProfile: {
              firstName: enrollment.studentProfile.firstName,
              lastName: enrollment.studentProfile.lastName,
            },
            parent: {
              name: enrollment.parent.name,
              email: enrollment.parent.email,
            },
          }))}
          yearOptions={yearsForClassrooms}
          initialTeachers={teacherDirectory}
          initialClasses={classes.map((cls) => ({
            id: cls.id,
            classCode: cls.classCode,
            className: cls.className,
            levelOrGrade: cls.levelOrGrade,
            schoolYearId: cls.schoolYear.id,
            schoolYearLabel: cls.schoolYear.label,
            teacherAssignments: cls.teacherAssignments.map((ta) => ({
              teacherUserId: ta.teacherUserId,
              teacherName: ta.teacher.name,
              teacherEmail: ta.teacher.email,
            })),
            studentAssignments: cls.studentAssignments.map((sa) => ({
              studentProfileId: sa.studentProfileId,
              studentName: `${sa.studentProfile.firstName} ${sa.studentProfile.lastName}`,
            })),
          }))}
        />

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
