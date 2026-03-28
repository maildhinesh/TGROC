import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/ui";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate, getMembershipLabel, getStatusColor } from "@/lib/utils";

export default async function OfficerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "OFFICE_BEARER" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const [totalMembers, activeMembers, pendingMembers, recentMembers] = await Promise.all([
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({ where: { role: "MEMBER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "MEMBER", status: "PENDING" } }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { profile: true },
    }),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Office Bearer Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome, {session.user.name ?? session.user.email}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Members"
            value={totalMembers}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Active Members"
            value={activeMembers}
            icon={<UserCheck className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            title="Pending Approval"
            value={pendingMembers}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Members</h2>
            <Link href="/officer/members" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentMembers.map((user: typeof recentMembers[number]) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                    {user.profile?.firstName?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.profile
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user.name}
                    </p>
                    <p className="text-sm text-gray-500">{getMembershipLabel(user.membershipType)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {formatDate(user.createdAt)}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(user.status)}`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
