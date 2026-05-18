import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolTeacher } from "@/lib/school-auth";
import SessionsClient from "./sessions-client";

export default async function TeacherSessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolTeacher(accessState)) {
    redirect("/school");
  }

  const classes = await prisma.schoolClass.findMany({
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
        orderBy: [{ calendarDate: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          calendarDate: true,
          status: true,
        },
      },
    },
  });

  const classrooms = await prisma.campusClassroom.findMany({
    where: { isActive: true },
    orderBy: [{ roomCode: "asc" }],
    select: { id: true, roomCode: true, roomName: true, isActive: true },
  });

  const mappedClasses = classes.map((classItem) => ({
    id: classItem.id,
    className: classItem.className,
    classCode: classItem.classCode,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Session Scheduler"
          description="Track and adjust class sessions and room allocation."
          action={
            <Link
              href="/school/teacher"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Back to Teacher Workspace
            </Link>
          }
        />
        <SessionsClient classes={mappedClasses} classrooms={classrooms} />
      </div>
    </DashboardLayout>
  );
}
