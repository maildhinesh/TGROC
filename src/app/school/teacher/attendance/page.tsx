import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolTeacher } from "@/lib/school-auth";
import AttendanceClient from "./attendance-client";

export default async function TeacherAttendancePage() {
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
      sessions: {
        where: { status: { in: ["SCHEDULED", "COMPLETED"] } },
        orderBy: [{ calendarDate: "desc" }],
        take: 5,
        select: {
          id: true,
          calendarDate: true,
          status: true,
        },
      },
    },
  });

  const mappedClasses = assignedClasses.map((classItem) => ({
    id: classItem.id,
    className: classItem.className,
    classCode: classItem.classCode,
    sessions: classItem.sessions.map((sessionItem) => ({
      id: sessionItem.id,
      calendarDate: sessionItem.calendarDate.toISOString(),
      status: sessionItem.status,
    })),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Attendance Workspace"
          description="Review attendance coverage for your assigned class sessions."
          action={
            <Link
              href="/school/teacher"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Back to Teacher Workspace
            </Link>
          }
        />
        <AttendanceClient classes={mappedClasses} />
      </div>
    </DashboardLayout>
  );
}
