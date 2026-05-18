import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolTeacher } from "@/lib/school-auth";
import GradesClient from "./grades-client";

export default async function TeacherGradesPage() {
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
      gradeItems: {
        orderBy: [{ assignedOn: "desc" }],
        take: 6,
        include: {
          _count: {
            select: { studentGrades: true },
          },
        },
      },
      studentAssignments: {
        where: { removedOn: null },
        select: { id: true },
      },
    },
  });

  const mappedClasses = assignedClasses.map((classItem) => ({
    id: classItem.id,
    className: classItem.className,
    classCode: classItem.classCode,
    rosterSize: classItem.studentAssignments.length,
    gradeItems: classItem.gradeItems.map((item) => ({
      id: item.id,
      title: item.title,
      maxScore: Number(item.maxScore),
      assignedOn: item.assignedOn.toISOString(),
      gradedCount: item._count.studentGrades,
    })),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Grading Workspace"
          description="Track grade items and grading coverage for your classes."
          action={
            <Link
              href="/school/teacher"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Back to Teacher Workspace
            </Link>
          }
        />

        <GradesClient classes={mappedClasses} />
      </div>
    </DashboardLayout>
  );
}
