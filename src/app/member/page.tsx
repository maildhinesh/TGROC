import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard-layout";
import { formatDate, getMembershipLabel } from "@/lib/utils";
import Link from "next/link";
import { UserCircle, MapPin, Bell, Users, ArrowRight, AlertTriangle, Clock } from "lucide-react";

export default async function MemberDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MEMBER") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      familyMembers: true,
      contactInfo: true,
      notificationSettings: true,
    },
  });

  if (!user) redirect("/auth/login");

  const profileComplete = !!(
    user.profile?.firstName &&
    user.profile?.lastName &&
    user.profile?.phone
  );

  const now = new Date();
  const expiry = user.membershipExpiry ? new Date(user.membershipExpiry) : null;
  const daysUntilExpiry = expiry
    ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const hasFamily = user.familyMembers.length > 0;
  const isFamilyMembership =
    user.membershipType === "FAMILY" || user.membershipType === "STUDENT_FAMILY";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6">
          <h1 className="text-2xl font-bold">
            Welcome, {user.profile?.firstName ?? user.name ?? "Member"}!
          </h1>
          <p className="text-blue-100 mt-1">
            Member since {formatDate(user.createdAt)} ·{" "}
            {getMembershipLabel(user.membershipType)} Membership
          </p>
        </div>

        {/* Incomplete profile warning */}
        {!profileComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-800">Complete your profile</p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Some profile information is missing. Please{" "}
                <Link href="/member/profile" className="underline font-medium">
                  update your profile
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Membership expiry warning / renewal banner */}
        {expiry && isExpired && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-800">Membership expired</p>
                <p className="text-sm text-red-700 mt-0.5">
                  Your membership expired on {formatDate(expiry)}. Please renew to maintain access.
                </p>
              </div>
            </div>
            <button className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Renew Membership
            </button>
          </div>
        )}

        {expiry && !isExpired && isExpiringSoon && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">
                  Membership expiring in {daysUntilExpiry} day{daysUntilExpiry === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Your membership expires on {formatDate(expiry)}. Renew now to avoid interruption.
                </p>
              </div>
            </div>
            <button className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Renew Membership
            </button>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard
            href="/member/profile"
            icon={<UserCircle className="w-7 h-7 text-blue-600" />}
            title="My Profile"
            description="View and update your personal information"
            bg="bg-blue-50"
          />
          <DashboardCard
            href="/member/contact"
            icon={<MapPin className="w-7 h-7 text-green-600" />}
            title="Contact Info"
            description="Manage your address and contact details"
            bg="bg-green-50"
          />
          <DashboardCard
            href="/member/notifications"
            icon={<Bell className="w-7 h-7 text-purple-600" />}
            title="Notifications"
            description="Customize how you receive updates"
            bg="bg-purple-50"
          />
        </div>

        {/* Membership Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Membership Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Detail label="Member ID" value={`#${user.id.slice(-8).toUpperCase()}`} />
            <Detail label="Type" value={getMembershipLabel(user.membershipType)} />
            <Detail label="Status" value={user.status} />
            <Detail label="Since" value={formatDate(user.createdAt)} />
            <Detail
              label="Membership Expiry"
              value={expiry ? formatDate(expiry) : undefined}
              highlight={isExpired ? "red" : isExpiringSoon ? "amber" : undefined}
            />
          </div>
        </div>

        {/* Family Members */}
        {isFamilyMembership && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Family Members ({user.familyMembers.length})
                </h2>
              </div>
              <Link
                href="/member/profile#family"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4">
              {user.familyMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No family members added yet.{" "}
                  <Link href="/member/profile#family" className="text-blue-600 underline">
                    Add family members
                  </Link>
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {user.familyMembers.map((m: typeof user.familyMembers[number]) => (
                    <div key={m.id} className="py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                        {m.firstName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {m.relationship.toLowerCase()}
                          {m.dateOfBirth ? ` · Born ${formatDate(m.dateOfBirth)}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function DashboardCard({
  href,
  icon,
  title,
  description,
  bg,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group"
    >
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </Link>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: "red" | "amber";
}) {
  const valueClass =
    highlight === "red"
      ? "text-red-600 font-semibold"
      : highlight === "amber"
      ? "text-amber-600 font-semibold"
      : "text-gray-800";
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${valueClass}`}>{value ?? "—"}</p>
    </div>
  );
}
