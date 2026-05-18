import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolAdmin } from "@/lib/school-auth";

export default async function SchoolAdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolAdmin(accessState)) {
    redirect("/school");
  }

  const [attendanceCount, gradesCount, classesCount, years] = await Promise.all([
    prisma.studentAttendance.count(),
    prisma.studentGrade.count(),
    prisma.schoolClass.count(),
    prisma.schoolYear.findMany({
      orderBy: [{ startsOn: "desc" }],
      select: { id: true, label: true, status: true },
    }),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports and Exports"
          description="Attendance and grading summaries with CSV exports for operations and archival."
          action={
            <Link
              href="/school/admin"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Back to School Admin
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Attendance Rows" value={attendanceCount} icon={<FileSpreadsheet className="h-5 w-5" />} color="blue" />
          <StatCard title="Grade Rows" value={gradesCount} icon={<FileSpreadsheet className="h-5 w-5" />} color="purple" />
          <StatCard title="Classes" value={classesCount} icon={<Download className="h-5 w-5" />} color="green" />
        </div>

        <Card title="Download Exports" description="Use all-data exports or filter by class/year using query params in the URL.">
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="/api/school/reports/attendance?format=csv"
              className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-cyan-900 hover:bg-cyan-100"
            >
              <p className="font-semibold">Attendance CSV</p>
              <p className="mt-1 text-sm">All attendance rows across sessions and classes.</p>
            </a>
            <a
              href="/api/school/reports/grades?format=csv"
              className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-900 hover:bg-indigo-100"
            >
              <p className="font-semibold">Grades CSV</p>
              <p className="mt-1 text-sm">All grade rows by class and grade item.</p>
            </a>
          </div>
        </Card>

        <Card title="Available School Years" description="Use year and class filters in report URLs when needed.">
          <div className="space-y-2">
            {years.map((year) => (
              <div key={year.id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                {year.label} ({year.status})
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
