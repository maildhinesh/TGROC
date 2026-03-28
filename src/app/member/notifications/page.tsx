"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Spinner } from "@/components/ui";
import { Save, Mail, MessageSquare, Newspaper, CalendarClock, Shield } from "lucide-react";

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  newsletterSubscribed: boolean;
  eventReminders: boolean;
  membershipAlerts: boolean;
}

interface ToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, icon, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <p className="font-medium text-gray-800">{label}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ml-4 ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    newsletterSubscribed: true,
    eventReminders: true,
    membershipAlerts: true,
  });

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then(({ user }) => {
        if (user?.notificationSettings) {
          const { id: _id, userId: _uid, createdAt: _c, updatedAt: _u, ...s } =
            user.notificationSettings;
          setSettings(s);
        }
        setIsFetching(false);
      });
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationSettings: settings }),
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const set = (key: keyof NotificationSettings) => (val: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  if (isFetching) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <PageHeader
          title="Notification Settings"
          description="Choose how and when you hear from TGROC."
        />

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ Notification preferences saved.
          </div>
        )}

        <Card>
          <Toggle
            label="Email Notifications"
            description="Receive important updates via email"
            icon={<Mail className="w-4 h-4" />}
            checked={settings.emailNotifications}
            onChange={set("emailNotifications")}
          />
          <Toggle
            label="SMS Notifications"
            description="Get text messages for urgent alerts"
            icon={<MessageSquare className="w-4 h-4" />}
            checked={settings.smsNotifications}
            onChange={set("smsNotifications")}
          />
          <Toggle
            label="Newsletter"
            description="Monthly newsletter with community news"
            icon={<Newspaper className="w-4 h-4" />}
            checked={settings.newsletterSubscribed}
            onChange={set("newsletterSubscribed")}
          />
          <Toggle
            label="Event Reminders"
            description="Reminders for upcoming TGROC events"
            icon={<CalendarClock className="w-4 h-4" />}
            checked={settings.eventReminders}
            onChange={set("eventReminders")}
          />
          <Toggle
            label="Membership Alerts"
            description="Alerts about your membership renewal and status"
            icon={<Shield className="w-4 h-4" />}
            checked={settings.membershipAlerts}
            onChange={set("membershipAlerts")}
          />

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save className="w-4 h-4" />
              Save Preferences
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
