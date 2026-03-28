"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Spinner } from "@/components/ui";
import { formatDate, getMembershipLabel } from "@/lib/utils";
import { DollarSign, Plus, X, ChevronDown, ChevronUp, History } from "lucide-react";

const MEMBERSHIP_TYPES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "FAMILY", label: "Family" },
  { value: "STUDENT_INDIVIDUAL", label: "Student – Individual" },
  { value: "STUDENT_FAMILY", label: "Student – Family" },
];

interface FeeEntry {
  id: string;
  membershipType: string;
  amount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: {
    email: string;
    profile: { firstName: string; lastName: string } | null;
  };
}

function formatAmount(amount: string | number) {
  return `$${parseFloat(String(amount)).toFixed(2)}`;
}

function creatorName(fee: FeeEntry) {
  if (fee.createdBy.profile) {
    return `${fee.createdBy.profile.firstName} ${fee.createdBy.profile.lastName}`;
  }
  return fee.createdBy.email;
}

export default function MembershipFeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [current, setCurrent] = useState<FeeEntry[]>([]);
  const [history, setHistory] = useState<FeeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState("INDIVIDUAL");
  const [formAmount, setFormAmount] = useState("");
  const [formEffectiveFrom, setFormEffectiveFrom] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const role = session?.user?.role as string | undefined;

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch("/api/membership-fees");
    if (res.ok) {
      const data = await res.json();
      setCurrent(data.current ?? []);
      setHistory(data.history ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      if (role !== "ADMIN" && role !== "OFFICE_BEARER") {
        router.push("/dashboard");
        return;
      }
      load();
    }
  }, [status, role, load, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setServerError(null);

    const res = await fetch("/api/membership-fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        membershipType: formType,
        amount: formAmount,
        effectiveFrom: formEffectiveFrom,
        notes: formNotes || null,
      }),
    });

    const json = await res.json();
    setIsSaving(false);

    if (!res.ok) {
      setServerError(json.error ?? "Failed to save fee.");
    } else {
      setSaveSuccess(`${getMembershipLabel(formType)} fee updated successfully.`);
      setTimeout(() => setSaveSuccess(null), 4000);
      setShowForm(false);
      setFormType("INDIVIDUAL");
      setFormAmount("");
      setFormEffectiveFrom("");
      setFormNotes("");
      load();
    }
  };

  // Build a per-type history list (all entries, sorted newest first)
  const historyByType: Record<string, FeeEntry[]> = {};
  for (const fee of history) {
    if (!historyByType[fee.membershipType]) historyByType[fee.membershipType] = [];
    historyByType[fee.membershipType].push(fee);
  }

  // Build current fee lookup by type
  const currentByType: Record<string, FeeEntry> = {};
  for (const fee of current) {
    currentByType[fee.membershipType] = fee;
  }

  if (isLoading || status === "loading") {
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
      <div className="max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <PageHeader
            title="Membership Fees"
            description="Manage annual membership fees. Changes take effect from the date specified. History is preserved."
          />
          <Button onClick={() => { setShowForm(true); setServerError(null); }}>
            <Plus className="w-4 h-4" />
            Update Fee
          </Button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ {saveSuccess}
          </div>
        )}

        {/* Update fee form */}
        {showForm && (
          <Card title="Set New Fee">
            <form onSubmit={handleSubmit} className="space-y-4">
              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membership Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    {MEMBERSHIP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {currentByType[formType] && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current fee: {formatAmount(currentByType[formType].amount)} (since {formatDate(currentByType[formType].effectiveFrom)})
                    </p>
                  )}
                </div>

                <Input
                  label="Annual Fee (USD)"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Effective From"
                  type="date"
                  required
                  value={formEffectiveFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormEffectiveFrom(e.target.value)}
                  hint="Membership year runs April 1 – March 31"
                />
                <Input
                  label="Notes (optional)"
                  value={formNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNotes(e.target.value)}
                  placeholder="e.g. Annual rate revision 2026"
                />
              </div>

              <div className="flex gap-3 justify-end pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowForm(false); setServerError(null); }}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Save Fee
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Current fees */}
        <Card title="Current Annual Fees">
          {MEMBERSHIP_TYPES.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {MEMBERSHIP_TYPES.map(({ value, label }) => {
                const fee = currentByType[value];
                const typeHistory = historyByType[value] ?? [];
                const expanded = showHistory[value];

                return (
                  <div key={value} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{label}</p>
                          {fee ? (
                            <p className="text-xs text-gray-500">
                              Effective from {formatDate(fee.effectiveFrom)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Not set</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-gray-900">
                          {fee ? formatAmount(fee.amount) : <span className="text-gray-300 text-base font-normal">—</span>}
                        </span>
                        {typeHistory.length > 1 && (
                          <button
                            onClick={() => setShowHistory((prev) => ({ ...prev, [value]: !prev[value] }))}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <History className="w-3.5 h-3.5" />
                            History
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fee notes */}
                    {fee?.notes && (
                      <p className="mt-1 ml-12 text-xs text-gray-400 italic">{fee.notes}</p>
                    )}

                    {/* Inline history table */}
                    {expanded && typeHistory.length > 0 && (
                      <div className="mt-3 ml-12 border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Effective From</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Effective To</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Set By</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {typeHistory.map((h) => (
                              <tr key={h.id} className={!h.effectiveTo ? "bg-blue-50/50" : ""}>
                                <td className="px-3 py-2 font-medium text-gray-900">{formatAmount(h.amount)}</td>
                                <td className="px-3 py-2 text-gray-600">{formatDate(h.effectiveFrom)}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  {h.effectiveTo ? formatDate(h.effectiveTo) : (
                                    <span className="text-green-600 font-medium">Current</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{creatorName(h)}</td>
                                <td className="px-3 py-2 text-gray-400 text-xs italic">{h.notes ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">No fees have been configured yet.</p>
          )}
        </Card>

        {/* Full history */}
        <Card title="Full Fee History">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Effective From</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Effective To</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Set By</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((fee) => (
                    <tr key={fee.id} className={!fee.effectiveTo ? "bg-blue-50/40" : ""}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{getMembershipLabel(fee.membershipType)}</td>
                      <td className="py-2.5 pr-4 text-gray-900">{formatAmount(fee.amount)}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{formatDate(fee.effectiveFrom)}</td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {fee.effectiveTo ? formatDate(fee.effectiveTo) : (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs bg-green-50 px-2 py-0.5 rounded-full">
                            ● Current
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs">{creatorName(fee)}</td>
                      <td className="py-2.5 text-gray-400 text-xs italic">{fee.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
