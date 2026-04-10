import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, Badge } from "@/components/ui";
import { formatDate, getMembershipLabel, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
} from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      familyMembers: { orderBy: [{ relationship: "asc" }, { firstName: "asc" }] },
      contactInfo: true,
      notificationSettings: true,
    },
  });

  if (!user) notFound();

  const { password: _, ...safeUser } = user;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl">
                {user.profile?.firstName?.[0] ?? user.name?.[0] ?? "?"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.profile
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user.name ?? "—"}
                </h1>
                <p className="text-gray-500">{user.email}</p>
                <div className="flex gap-2 mt-1">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(user.status)}`}
                  >
                    {user.status}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>

        {/* Member Details */}
        <Card title="Member Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="First Name" value={user.profile?.firstName} />
            <InfoRow label="Last Name" value={user.profile?.lastName} />
            <InfoRow
              label="Year of Birth"
              value={user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).getFullYear().toString() : undefined}
            />
            <InfoRow label="Phone" value={user.profile?.phone} icon={<Phone className="w-4 h-4" />} />
            <InfoRow label="Email" value={user.email} icon={<Mail className="w-4 h-4" />} />
            <InfoRow label="Membership" value={getMembershipLabel(user.membershipType)} />
            <InfoRow label="Member Since" value={formatDate(user.createdAt)} icon={<Calendar className="w-4 h-4" />} />
            <InfoRow
              label="Membership Expiry"
              value={user.membershipExpiry ? formatDate(user.membershipExpiry) : undefined}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>
        </Card>

        {/* Contact Info */}
        {user.contactInfo && (
          <Card title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Address" value={user.contactInfo.address} />
              <InfoRow label="City" value={user.contactInfo.city} />
              <InfoRow label="State" value={user.contactInfo.state} />
              <InfoRow label="ZIP Code" value={user.contactInfo.zipCode} />
              <InfoRow label="Country" value={user.contactInfo.country} />
            </div>
          </Card>
        )}

        {/* Family Members */}
        {user.familyMembers.length > 0 && (
          <Card title={`Family Members (${user.familyMembers.length})`}>
            <div className="space-y-3">
              {user.familyMembers.map((member: typeof user.familyMembers[number]) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                    {member.firstName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {member.relationship}{" "}
                      {member.dateOfBirth ? `· Born ${new Date(member.dateOfBirth).getFullYear()}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Notifications */}
        {user.notificationSettings && (
          <Card title="Notification Preferences">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ["Email Notifications", user.notificationSettings.emailNotifications],
                ["SMS Notifications", user.notificationSettings.smsNotifications],
                ["Newsletter", user.notificationSettings.newsletterSubscribed],
                ["Event Reminders", user.notificationSettings.eventReminders],
                ["Membership Alerts", user.notificationSettings.membershipAlerts],
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center gap-2">
                  {val ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                  <span className="text-sm text-gray-700">{label as string}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 flex items-center gap-1.5">
        {icon}
        {value ?? <span className="text-gray-300">—</span>}
      </p>
    </div>
  );
}
