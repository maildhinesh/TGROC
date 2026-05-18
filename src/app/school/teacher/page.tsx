import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookOpen, CalendarCheck2, CalendarDays, GraduationCap, PenSquare, TimerReset, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolTeacher } from "@/lib/school-auth";

export default async function SchoolTeacherPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolTeacher(accessState)) {
    redirect("/school");
  }

  const assignedClasses = await prisma.schoolClass.findMany({
    where: {
      teacherAssignments: {
        some: {
          teacherUserId: session.user.id,
          assignedTo: null,
        },
      },
    },
    orderBy: [{ className: "asc" }],
    include: {
      schoolYear: { select: { label: true, status: true } },
      teacherAssignments: {
        where: { assignedTo: null },
        include: { teacher: { select: { id: true, name: true, email: true } } },
      },
      studentAssignments: {
        where: { removedOn: null },
        include: {
          studentProfile: {
            select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
          },
        },
      },
      sessions: {
        where: { status: { in: ["SCHEDULED", "COMPLETED"] } },
        orderBy: [{ calendarDate: "asc" }],
        take: 3,
      },
    },
  });

  const totalStudents = assignedClasses.reduce((sum, schoolClass) => sum + schoolClass.studentAssignments.length, 0);
  const upcomingSessions = assignedClasses.reduce((sum, schoolClass) => sum + schoolClass.sessions.length, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Teacher Workspace"
          description="Assigned classes, rosters, and upcoming session visibility."
          action={
            <Link
              href="/school"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Back to School Hub
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Assigned Classes" value={assignedClasses.length} icon={<BookOpen className="h-5 w-5" />} color="blue" />
          <StatCard title="Rostered Students" value={totalStudents} icon={<Users className="h-5 w-5" />} color="green" />
          <StatCard title="Visible Sessions" value={upcomingSessions} icon={<CalendarDays className="h-5 w-5" />} color="purple" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/school/teacher/attendance"
            className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 transition hover:bg-cyan-100"
          >
            <CalendarCheck2 className="h-6 w-6 text-cyan-700" />
            <h2 className="mt-3 font-semibold text-cyan-900">Attendance Workspace</h2>
            <p className="mt-1 text-sm text-cyan-800">Track session coverage and mark attendance via API.</p>
          </Link>
          <Link
            href="/school/teacher/grades"
            className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 transition hover:bg-indigo-100"
          >
            <PenSquare className="h-6 w-6 text-indigo-700" />
            <h2 className="mt-3 font-semibold text-indigo-900">Grading Workspace</h2>
            <p className="mt-1 text-sm text-indigo-800">Monitor grade items and grading completion per class.</p>
          </Link>
          <Link
            href="/school/teacher/sessions"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 transition hover:bg-emerald-100"
          >
            <TimerReset className="h-6 w-6 text-emerald-700" />
            <h2 className="mt-3 font-semibold text-emerald-900">Session Scheduler</h2>
            <p className="mt-1 text-sm text-emerald-800">Manage schedule status, classroom allocation, and timing.</p>
          </Link>
        </div>

        <Card title="My Classes" description="Current class assignments and enrolled students.">
          <div className="space-y-4">
            {assignedClasses.length === 0 ? (
              <p className="text-sm text-gray-500">No active class assignments yet.</p>
            ) : (
              assignedClasses.map((schoolClass) => (
                <div key={schoolClass.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">{schoolClass.className}</h2>
                        <Badge variant={schoolClass.schoolYear.status === "ACTIVE" ? "success" : "info"}>
                          {schoolClass.schoolYear.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {schoolClass.classCode} · {schoolClass.levelOrGrade}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{schoolClass.teacherAssignments.length} teacher(s)</p>
                      <p>{schoolClass.studentAssignments.length} student(s)</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="mb-3 text-sm font-medium text-gray-700">Roster</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {schoolClass.studentAssignments.length === 0 ? (
                          <p className="text-sm text-gray-500">No rostered students.</p>
                        ) : (
                          schoolClass.studentAssignments.map((assignment) => (
                            <div key={assignment.id} className="rounded-lg bg-gray-50 p-3">
                              <p className="font-medium text-gray-900">
                                {assignment.studentProfile.firstName} {assignment.studentProfile.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                DOB {formatDate(assignment.studentProfile.dateOfBirth)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-gray-700">Upcoming Sessions</p>
                      <div className="space-y-3">
                        {schoolClass.sessions.length === 0 ? (
                          <p className="text-sm text-gray-500">No sessions scheduled yet.</p>
                        ) : (
                          schoolClass.sessions.map((sessionItem) => (
                            <div key={sessionItem.id} className="rounded-lg bg-cyan-50 p-3">
                              <p className="font-medium text-gray-900">{formatDate(sessionItem.calendarDate)}</p>
                              <p className="text-xs text-gray-600">{sessionItem.status}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Teaching Notes" description="This slice exposes assignment visibility; attendance and grading actions come next.">
          <div className="flex items-start gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Attendance, grading, and class session tools are now enabled. Use the three workspaces above for day-to-day teaching operations.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
