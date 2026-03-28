import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card } from "@/components/ui";
import { formatDate, getMembershipLabel } from "@/lib/utils";
import Link from "next/link";
import { Edit, Mail, Phone, Calendar, Users } from "lucide-react";

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, contactInfo: true },
  });

  if (!user) redirect("/auth/login");

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <Link
            href={`/admin/users/${user.id}/edit`}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Edit className="w-4 h-4" /> Edit
          </Link>
        </div>

        <div className="flex items-center gap-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold">
            {user.profile?.firstName?.[0] ?? user.name?.[0] ?? "A"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user.name ?? "—"}
            </h2>
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <Mail className="w-4 h-4" /> {user.email}
            </p>
            {user.profile?.phone && (
              <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-4 h-4" /> {user.profile.phone}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                Administrator
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                {user.status}
              </span>
            </div>
          </div>
        </div>

        <Card title="Account Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Member Since</p>
              <p className="text-sm text-gray-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {formatDate(user.createdAt)}
              </p>
            </div>
            {user.profile?.dateOfBirth && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                  Date of Birth
                </p>
                <p className="text-sm text-gray-800">{formatDate(user.profile.dateOfBirth)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
