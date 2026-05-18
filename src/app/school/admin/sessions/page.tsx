import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { getSchoolAccessState, hasAnySchoolRole, isSchoolAdmin } from "@/lib/school-auth";
import { CalendarDays, DoorOpen, School2, Users } from "lucide-react";

export default async function SchoolAdminSessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/login");
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState || !hasAnySchoolRole(accessState) || !isSchoolAdmin(accessState)) {
    redirect("/school");
  }

  const [classrooms, sessions, classes] = await Promise.all([
    prisma.campusClassroom.findMany({
      orderBy: [{ roomCode: "asc" }],
      include: { _count: { select: { sessions: true } } },
    }),
    prisma.classSession.findMany({
      orderBy: [{ calendarDate: "desc" }, { startTime: "desc" }],
      take: 12,
      include: {
        schoolClass: { select: { className: true, classCode: true } },
        classroom: { select: { roomCode: true, roomName: true } },
      },
    }),
    prisma.schoolClass.count(),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Session Operations"
          description="Manage classrooms and session schedules across all classes."
          action={
            <Link
              href="/school/admin"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Back to School Admin
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Classrooms" value={classrooms.length} icon={<DoorOpen className="h-5 w-5" />} color="blue" />
          <StatCard title="Scheduled Sessions" value={sessions.length} icon={<CalendarDays className="h-5 w-5" />} color="green" />
          <StatCard title="Classes" value={classes} icon={<School2 className="h-5 w-5" />} color="purple" />
          <StatCard
            title="Active Rooms"
            value={classrooms.filter((room) => room.isActive).length}
            icon={<Users className="h-5 w-5" />}
            color="yellow"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card title="Campus Classrooms" description="Create via POST /api/school/classrooms. Used by class session scheduling.">
            <div className="space-y-3">
              {classrooms.length === 0 ? (
                <p className="text-sm text-gray-500">No classrooms configured yet.</p>
              ) : (
                classrooms.map((room) => (
                  <div key={room.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{room.roomCode}</p>
                        <p className="text-sm text-gray-500">{room.roomName}</p>
                      </div>
                      <Badge variant={room.isActive ? "success" : "default"}>{room.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Sessions: {room._count.sessions}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Recent Sessions" description="Updated through class-scoped session APIs and teacher scheduling pages.">
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions yet.</p>
              ) : (
                sessions.map((sessionItem) => (
                  <div key={sessionItem.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {sessionItem.schoolClass.className} ({sessionItem.schoolClass.classCode})
                        </p>
                        <p className="text-sm text-gray-500">
                          {sessionItem.classroom.roomCode} · {sessionItem.classroom.roomName}
                        </p>
                      </div>
                      <Badge variant={sessionItem.status === "SCHEDULED" ? "info" : sessionItem.status === "COMPLETED" ? "success" : "danger"}>
                        {sessionItem.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{formatDate(sessionItem.calendarDate)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
