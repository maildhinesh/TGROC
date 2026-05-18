"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui";

export function EnrollmentSettingsCard() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/school/enrollment-settings");
        const data = await res.json();
        setIsEnabled(data.isEnrollmentEnabled ?? false);
      } catch (error) {
        console.error("Failed to load enrollment settings", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleToggle = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/school/enrollment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnrollmentEnabled: !isEnabled }),
      });

      if (!res.ok) {
        throw new Error("Failed to update enrollment settings");
      }

      setIsEnabled(!isEnabled);
      setMessage({
        type: "success",
        text: `Student enrollment is now ${!isEnabled ? "enabled" : "disabled"}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update enrollment settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card title="Enrollment Settings" description="Control whether parents can enroll students.">
        <div className="text-sm text-gray-500">Loading...</div>
      </Card>
    );
  }

  return (
    <Card title="Enrollment Settings" description="Control whether parents can enroll students.">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div>
            <p className="font-medium text-gray-900">Student Enrollment</p>
            <p className="text-sm text-gray-500">
              {isEnabled ? "Parents can create and submit student enrollments" : "Parents cannot access enrollment features"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isSaving}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              isEnabled ? "bg-emerald-600" : "bg-gray-300"
            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isEnabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </Card>
  );
}
