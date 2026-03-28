import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/ui";
import { Users, UserCheck, UserX, Clock, Activity } from "lucide-react";
import Link from "next/link";
import { formatDate, getMembershipLabel, getStatusColor } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const [totalUsers, activeUsers, pendingUsers, inactiveUsers, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { status: "INACTIVE" } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { profile: true },
      }),
    ]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Members"
            value={totalUsers}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Active Members"
            value={activeUsers}
            icon={<UserCheck className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            title="Pending Approval"
            value={pendingUsers}
            icon={<Clock className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            title="Deactivated"
            value={inactiveUsers}
            icon={<UserX className="w-5 h-5" />}
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/users/new"
            className="bg-blue-600 text-white p-5 rounded-xl hover:bg-blue-700 transition-colors text-center"
          >
            <Users className="w-7 h-7 mx-auto mb-2" />
            <p className="font-semibold">Create User</p>
            <p className="text-sm text-blue-200 mt-0.5">Add a new member</p>
          </Link>
          <Link
            href="/admin/users?status=PENDING"
            className="bg-yellow-500 text-white p-5 rounded-xl hover:bg-yellow-600 transition-colors text-center"
          >
            <Clock className="w-7 h-7 mx-auto mb-2" />
            <p className="font-semibold">Pending Approvals</p>
            <p className="text-sm text-yellow-100 mt-0.5">{pendingUsers} awaiting review</p>
          </Link>
          <Link
            href="/admin/users"
            className="bg-white text-gray-800 border border-gray-200 p-5 rounded-xl hover:bg-gray-50 transition-colors text-center"
          >
            <Activity className="w-7 h-7 mx-auto mb-2 text-gray-600" />
            <p className="font-semibold">Manage All Users</p>
            <p className="text-sm text-gray-500 mt-0.5">View & edit members</p>
          </Link>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Registrations</h2>
            <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400">No users yet.</p>
            ) : (
              recentUsers.map((user: typeof recentUsers[number]) => (
                <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                      {user.profile?.firstName?.[0] ?? user.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.profile
                          ? `${user.profile.firstName} ${user.profile.lastName}`
                          : user.name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
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
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
