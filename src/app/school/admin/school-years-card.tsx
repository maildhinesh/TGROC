"use client";

import { useState, useEffect } from "react";
import { Badge, Card, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type SchoolYear = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  enrollmentOpenOn: string | null;
  enrollmentCloseOn: string | null;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  lastUpdatedAt: string;
  _count?: { enrollments: number; classes: number };
};

const defaultForm = {
  label: "",
  startsOn: "",
  endsOn: "",
  enrollmentOpenOn: "",
  enrollmentCloseOn: "",
  status: "PLANNED" as "PLANNED" | "ACTIVE" | "CLOSED",
};

const statusVariant: Record<string, "success" | "info" | "default"> = {
  ACTIVE: "success",
  PLANNED: "info",
  CLOSED: "default",
};

export function SchoolYearsCard() {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void loadYears();
  }, []);

  async function loadYears() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/years");
      const data = (await res.json()) as { years: SchoolYear[] };
      setYears(data.years ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/school/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label,
          startsOn: form.startsOn,
          endsOn: form.endsOn,
          enrollmentOpenOn: form.enrollmentOpenOn || null,
          enrollmentCloseOn: form.enrollmentCloseOn || null,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error as string) ?? "Failed to create school year");
      setFeedback({ type: "success", text: `School year "${(data.year as SchoolYear).label}" created.` });
      setForm(defaultForm);
      setShowForm(false);
      await loadYears();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to create school year" });
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(yearId: string, status: "PLANNED" | "ACTIVE" | "CLOSED") {
    setUpdatingId(yearId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/school/years/${yearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.error as string) ?? "Failed to update school year");
      setYears((prev) => prev.map((y) => (y.id === yearId ? { ...y, status: (data.year as SchoolYear).status } : y)));
      setFeedback({ type: "success", text: `"${years.find((y) => y.id === yearId)?.label}" status set to ${status}.` });
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to update status" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card title="School Years" description="Create and manage school years. Set a year Active to allow parent enrollments.">
      <div className="space-y-4">
        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm ${
              feedback.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {showForm ? "Cancel" : "+ New School Year"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-800">Create School Year</h3>
            <Input
              label="Label (e.g. 2025–2026)"
              required
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Starts on"
                type="date"
                required
                value={form.startsOn}
                onChange={(e) => setForm((p) => ({ ...p, startsOn: e.target.value }))}
              />
              <Input
                label="Ends on"
                type="date"
                required
                value={form.endsOn}
                onChange={(e) => setForm((p) => ({ ...p, endsOn: e.target.value }))}
              />
              <Input
                label="Enrollment opens on (optional)"
                type="date"
                value={form.enrollmentOpenOn}
                onChange={(e) => setForm((p) => ({ ...p, enrollmentOpenOn: e.target.value }))}
              />
              <Input
                label="Enrollment closes on (optional)"
                type="date"
                value={form.enrollmentCloseOn}
                onChange={(e) => setForm((p) => ({ ...p, enrollmentCloseOn: e.target.value }))}
              />
            </div>
            <Select
              label="Initial status"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "PLANNED" | "ACTIVE" | "CLOSED" }))}
              options={[
                { value: "PLANNED", label: "Planned" },
                { value: "ACTIVE", label: "Active (open for enrollment)" },
                { value: "CLOSED", label: "Closed" },
              ]}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create School Year"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : years.length === 0 ? (
          <p className="text-sm text-gray-500">No school years created yet. Use the button above to add one.</p>
        ) : (
          <div className="space-y-3">
            {years.map((year) => (
              <div key={year.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{year.label}</p>
                      <Badge variant={statusVariant[year.status] ?? "default"}>{year.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatDate(year.startsOn)} → {formatDate(year.endsOn)}
                    </p>
                    {(year.enrollmentOpenOn || year.enrollmentCloseOn) && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        Enrollment window: {year.enrollmentOpenOn ? formatDate(year.enrollmentOpenOn) : "—"} to{" "}
                        {year.enrollmentCloseOn ? formatDate(year.enrollmentCloseOn) : "—"}
                      </p>
                    )}
                    {year._count && (
                      <p className="mt-1 text-xs text-gray-400">
                        {year._count.enrollments} enrollments · {year._count.classes} classes
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {year.status !== "ACTIVE" && (
                      <button
                        type="button"
                        disabled={updatingId === year.id}
                        onClick={() => void handleStatusChange(year.id, "ACTIVE")}
                        className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
                      >
                        Set Active
                      </button>
                    )}
                    {year.status === "ACTIVE" && (
                      <button
                        type="button"
                        disabled={updatingId === year.id}
                        onClick={() => void handleStatusChange(year.id, "CLOSED")}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Close Year
                      </button>
                    )}
                    {year.status === "CLOSED" && (
                      <button
                        type="button"
                        disabled={updatingId === year.id}
                        onClick={() => void handleStatusChange(year.id, "PLANNED")}
                        className="rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
