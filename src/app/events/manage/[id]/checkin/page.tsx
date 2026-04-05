"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Spinner } from "@/components/ui";
import {
  ArrowLeft, UserCheck, UserPlus, Search, Trash2, Edit2, Check, X, DollarSign,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface CheckIn {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  adultCount: number;
  kidCount: number;
  amountPaid: string | null;
  paymentNote: string | null;
  checkedInAt: string;
  checkedInBy: { profile: { firstName: string; lastName: string } | null };
}

interface RsvpRow {
  key: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  adultCount: number;
  kidCount: number;
}

interface Event {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  status: string;
}

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

export default function EventCheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [rsvpRows, setRsvpRows] = useState<RsvpRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search RSVP list
  const [rsvpSearch, setRsvpSearch] = useState("");

  // Form state (shared for new / walk-in)
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAdults, setFormAdults] = useState(1);
  const [formKids, setFormKids] = useState(0);
  const [formAmountPaid, setFormAmountPaid] = useState("");
  const [formPaymentNote, setFormPaymentNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAdults, setEditAdults] = useState(1);
  const [editKids, setEditKids] = useState(0);
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const canManage = MGMT_ROLES.includes(session?.user?.role as string);

  useEffect(() => {
    if (!canManage) { router.push("/"); return; }
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => r.json()),
      fetch(`/api/events/${id}/checkin`).then((r) => r.json()),
      fetch(`/api/events/${id}/rsvp?full=1`).then((r) => r.json()),
    ]).then(([evData, ciData, rsvpData]) => {
      setEvent(evData.event ?? null);
      setCheckIns(ciData.checkIns ?? []);
      setRsvpRows((rsvpData.rows ?? []).filter((r: RsvpRow) => r.status === "YES"));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [id, canManage, router]);

  const checkedInEmails = new Set(checkIns.map((c) => c.email.toLowerCase()));

  const filteredRsvp = rsvpRows.filter((r) => {
    if (!rsvpSearch) return true;
    const q = rsvpSearch.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const prefillFromRsvp = (row: RsvpRow) => {
    setFormName(row.name);
    setFormEmail(row.email);
    setFormPhone(row.phone ?? "");
    setFormAdults(row.adultCount);
    setFormKids(row.kidCount);
    setFormAmountPaid("");
    setFormPaymentNote("");
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWalkIn = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAdults(1);
    setFormKids(0);
    setFormAmountPaid("");
    setFormPaymentNote("");
    setFormError(null);
    setShowForm(true);
  };

  const submitCheckIn = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const res = await fetch(`/api/events/${id}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        adultCount: formAdults,
        kidCount: formKids,
        amountPaid: formAmountPaid !== "" ? parseFloat(formAmountPaid) : null,
        paymentNote: formPaymentNote.trim() || undefined,
      }),
    });
    const json = await res.json();
    setIsSaving(false);
    if (!res.ok) {
      setFormError(json.error ?? "Failed to check in guest.");
    } else {
      setCheckIns((prev) => [json.checkIn, ...prev]);
      setShowForm(false);
    }
  };

  const startEdit = (ci: CheckIn) => {
    setEditingId(ci.id);
    setEditAdults(ci.adultCount);
    setEditKids(ci.kidCount);
    setEditAmountPaid(ci.amountPaid ?? "");
    setEditPaymentNote(ci.paymentNote ?? "");
  };

  const saveEdit = async (ciId: string) => {
    setIsEditing(true);
    const res = await fetch(`/api/events/${id}/checkin/${ciId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adultCount: editAdults,
        kidCount: editKids,
        amountPaid: editAmountPaid !== "" ? parseFloat(editAmountPaid) : null,
        paymentNote: editPaymentNote.trim() || undefined,
      }),
    });
    const json = await res.json();
    setIsEditing(false);
    if (res.ok) {
      setCheckIns((prev) => prev.map((c) => (c.id === ciId ? json.checkIn : c)));
      setEditingId(null);
    }
  };

  const removeCheckIn = async (ciId: string) => {
    if (!confirm("Undo this check-in?")) return;
    await fetch(`/api/events/${id}/checkin/${ciId}`, { method: "DELETE" });
    setCheckIns((prev) => prev.filter((c) => c.id !== ciId));
  };

  const totalAttendees = checkIns.reduce((s, c) => s + c.adultCount + c.kidCount, 0);
  const totalAdults = checkIns.reduce((s, c) => s + c.adultCount, 0);
  const totalKids = checkIns.reduce((s, c) => s + c.kidCount, 0);
  const totalCollected = checkIns.reduce((s, c) => s + (c.amountPaid ? parseFloat(c.amountPaid) : 0), 0);

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  if (!event) return <DashboardLayout><p className="mt-8 text-center text-gray-500">Event not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/events/manage/${id}`}>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <PageHeader
            title="Event Check-In"
            description={`${event.name} · ${formatDate(event.eventDate)}`}
          />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{checkIns.length}</p>
            <p className="text-sm text-blue-600 mt-1">Groups checked in</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{totalAttendees}</p>
            <p className="text-sm text-green-600 mt-1">Total attendees</p>
            <p className="text-xs text-green-500 mt-0.5">{totalAdults} adults · {totalKids} kids</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-purple-700">{rsvpRows.length - checkedInEmails.size > 0 ? rsvpRows.length - checkedInEmails.size : 0}</p>
            <p className="text-sm text-purple-600 mt-1">RSVP not checked in</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">${totalCollected.toFixed(2)}</p>
            <p className="text-sm text-yellow-600 mt-1">Collected at door</p>
          </div>
        </div>

        {/* Check-in form */}
        {showForm && (
          <Card title="Check In Guest">
            <div className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <Input
                label="Phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                hint="Optional"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults (15+)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formAdults}
                    onChange={(e) => setFormAdults(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kids (under 15)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={formKids}
                    onChange={(e) => setFormKids(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={formAmountPaid}
                    onChange={(e) => setFormAmountPaid(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note</label>
                  <input
                    type="text"
                    placeholder="Cash, Venmo, etc."
                    value={formPaymentNote}
                    onChange={(e) => setFormPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={submitCheckIn} isLoading={isSaving}>
                  <UserCheck className="w-4 h-4" /> Check In
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Checked-in list */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Checked In ({checkIns.length})</h3>
            <Button size="sm" onClick={openWalkIn}>
              <UserPlus className="w-4 h-4" /> Walk-in / Add Guest
            </Button>
          </div>
          {checkIns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No one checked in yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Name / Email</th>
                    <th className="pb-2 pr-4 text-center">Adults</th>
                    <th className="pb-2 pr-4 text-center">Kids</th>
                    <th className="pb-2 pr-4">Paid</th>
                    <th className="pb-2 pr-4">Note</th>
                    <th className="pb-2 pr-4">Checked in by</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checkIns.map((ci) => (
                    <tr key={ci.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-gray-900">{ci.name}</p>
                        <p className="text-xs text-gray-400">{ci.email}</p>
                      </td>
                      {editingId === ci.id ? (
                        <>
                          <td className="py-2.5 pr-4">
                            <input type="number" min={0} max={50} value={editAdults}
                              onChange={(e) => setEditAdults(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input type="number" min={0} max={50} value={editKids}
                              onChange={(e) => setEditKids(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input type="number" min={0} step="0.01" placeholder="0.00" value={editAmountPaid}
                              onChange={(e) => setEditAmountPaid(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </td>
                          <td className="py-2.5 pr-4">
                            <input type="text" placeholder="Cash, Venmo…" value={editPaymentNote}
                              onChange={(e) => setEditPaymentNote(e.target.value)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-gray-400">—</td>
                          <td className="py-2.5 text-right">
                            <button onClick={() => saveEdit(ci.id)} disabled={isEditing}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg mr-1">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pr-4 text-center text-gray-700">{ci.adultCount}</td>
                          <td className="py-2.5 pr-4 text-center text-gray-700">{ci.kidCount}</td>
                          <td className="py-2.5 pr-4 text-gray-700">
                            {ci.amountPaid ? `$${parseFloat(ci.amountPaid).toFixed(2)}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-gray-500 italic">{ci.paymentNote || "—"}</td>
                          <td className="py-2.5 pr-4 text-xs text-gray-400">
                            {ci.checkedInBy?.profile
                              ? `${ci.checkedInBy.profile.firstName} ${ci.checkedInBy.profile.lastName}`
                              : "—"}
                          </td>
                          <td className="py-2.5 text-right">
                            <button onClick={() => startEdit(ci)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg mr-1">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => removeCheckIn(ci.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* RSVP list — quick check-in */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">RSVP'd Members (YES)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click a row to pre-fill the check-in form</p>
            </div>
            <div className="relative w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search…"
                value={rsvpSearch}
                onChange={(e) => setRsvpSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {filteredRsvp.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No RSVP's to show.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Name / Email</th>
                    <th className="pb-2 pr-4 text-center">Adults</th>
                    <th className="pb-2 pr-4 text-center">Kids</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRsvp.map((row) => {
                    const checkedIn = checkedInEmails.has(row.email.toLowerCase());
                    return (
                      <tr
                        key={row.key}
                        onClick={() => !checkedIn && prefillFromRsvp(row)}
                        className={`${checkedIn ? "opacity-50 cursor-default" : "hover:bg-blue-50 cursor-pointer"} transition-colors`}
                      >
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-gray-900">{row.name}</p>
                          <p className="text-xs text-gray-400">{row.email}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-center text-gray-700">{row.adultCount}</td>
                        <td className="py-2.5 pr-4 text-center text-gray-700">{row.kidCount}</td>
                        <td className="py-2.5 text-center">
                          {checkedIn ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              <Check className="w-3 h-3" /> Checked in
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
