"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, Button, Spinner } from "@/components/ui";
import {
  ArrowLeft, Calendar, MapPin, FileText, Users, ExternalLink,
  Edit, Trash2, Globe, XCircle, Package, Plus, Check, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Download, Music, Mic, ToggleLeft, ToggleRight,
  DollarSign, Bell,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  venue: string;
  posterUrl: string | null;
  status: string;
  performanceRegOpen: boolean;
  performanceRegDeadline: string | null;
  createdAt: string;
  _count: { performances: number };
  createdBy: {
    profile: { firstName: string; lastName: string } | null;
  };
}

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  quantityNeeded: number;
  quantityCommitted: number;
  sortOrder: number;
}

type SortField = "name" | "email" | "type" | "status" | "adultCount" | "kidCount";
type SortDir = "asc" | "desc";

interface Row {
  key: string;
  name: string;
  email: string;
  type: "MEMBER" | "GUEST";
  membershipType: string | null;
  status: "YES" | "NO" | "MAYBE" | "NO_ACTION";
  adultCount: number;
  kidCount: number;
  notes: string | null;
  items: { name: string; quantity: number }[];
}

const PERF_TYPE_LABELS: Record<string, string> = {
  SINGING: "Singing",
  DANCE: "Dance",
  SKIT: "Skit",
  POEM_RECITAL: "Poem Recital",
  QUIZ: "Quiz",
  STANDUP: "Standup Comedy",
};

interface EventPricing {
  isFree: boolean;
  feeType: "FAMILY" | "INDIVIDUAL" | null;
  memberFamilyFee: string | null;
  nonMemberFamilyFee: string | null;
  memberAdultFee: string | null;
  nonMemberAdultFee: string | null;
  memberKidFee: string | null;
  nonMemberKidFee: string | null;
  studentMemberFee: string | null;
  studentNonMemberFee: string | null;
  notes: string | null;
}

interface FeeReminder {
  id: string;
  sentAt: string;
  recipientCount: number;
  message: string | null;
  sentBy: { profile: { firstName: string; lastName: string } | null };
}

interface PerfReg {
  id: string;
  performanceType: string;
  isGroup: boolean;
  programName: string;
  duration: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  participantCount: number | null;
  songList: string | null;
  micCount: number | null;
  micType: string | null;
  additionalDetails: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

const attendingColors: Record<string, string> = {
  YES: "bg-green-100 text-green-700",
  NO: "bg-red-100 text-red-700",
  MAYBE: "bg-yellow-100 text-yellow-700",
  NO_ACTION: "bg-gray-100 text-gray-500",
};

const attendingLabels: Record<string, string> = {
  YES: "Going",
  NO: "Not going",
  MAYBE: "Maybe",
  NO_ACTION: "No response",
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [items, setItems] = useState<EventItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Performance registrations
  const [perfRegs, setPerfRegs] = useState<PerfReg[]>([]);
  const [perfRegOpen, setPerfRegOpen] = useState(false);
  const [perfRegDeadline, setPerfRegDeadline] = useState("");
  const [isSavingPerf, setIsSavingPerf] = useState(false);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);

  // Pricing
  const [pricing, setPricing] = useState<EventPricing | null>(null);
  const [pricingIsFree, setPricingIsFree] = useState(true);
  const [pricingFeeType, setPricingFeeType] = useState<"FAMILY" | "INDIVIDUAL">("INDIVIDUAL");
  const [memberFamilyFee, setMemberFamilyFee] = useState("");
  const [nonMemberFamilyFee, setNonMemberFamilyFee] = useState("");
  const [memberAdultFee, setMemberAdultFee] = useState("");
  const [nonMemberAdultFee, setNonMemberAdultFee] = useState("");
  const [memberKidFee, setMemberKidFee] = useState("");
  const [nonMemberKidFee, setNonMemberKidFee] = useState("");
  const [studentMemberFee, setStudentMemberFee] = useState("");
  const [studentNonMemberFee, setStudentNonMemberFee] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingSaved, setPricingSaved] = useState(false);

  // Fee reminders
  const [feeReminders, setFeeReminders] = useState<FeeReminder[]>([]);
  const [reminderMessage, setReminderMessage] = useState("");
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ count: number; emailSent: boolean; emailError?: string } | null>(null);

  // RSVP reminders
  const [isSendingRsvpReminder, setIsSendingRsvpReminder] = useState(false);
  const [rsvpReminderResult, setRsvpReminderResult] = useState<{ count: number; emailSent: boolean; emailError?: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => r.json()),
      fetch(`/api/events/${id}/rsvp?full=1`).then((r) => r.json()),
      fetch(`/api/events/${id}/items`).then((r) => r.json()),
      fetch(`/api/events/${id}/performances`).then((r) => r.json()),
      fetch(`/api/events/${id}/pricing`).then((r) => r.json()),
      fetch(`/api/events/${id}/fee-reminder`).then((r) => r.json()),
    ])
      .then(([evData, rsvpData, itemsData, perfData, pricingData, reminderData]) => {
        const ev = evData.event ?? null;
        setEvent(ev);
        setRows(rsvpData.rows ?? []);
        setItems(itemsData.items ?? []);
        setPerfRegs(perfData.registrations ?? []);
        if (ev) {
          setPerfRegOpen(ev.performanceRegOpen ?? false);
          setPerfRegDeadline(
            ev.performanceRegDeadline
              ? new Date(ev.performanceRegDeadline).toISOString().slice(0, 16)
              : ""
          );
        }
        // Pricing
        const p: EventPricing | null = pricingData.pricing ?? null;
        setPricing(p);
        if (p) {
          setPricingIsFree(p.isFree);
          setPricingFeeType(p.feeType ?? "INDIVIDUAL");
          setMemberFamilyFee(p.memberFamilyFee ?? "");
          setNonMemberFamilyFee(p.nonMemberFamilyFee ?? "");
          setMemberAdultFee(p.memberAdultFee ?? "");
          setNonMemberAdultFee(p.nonMemberAdultFee ?? "");
          setMemberKidFee(p.memberKidFee ?? "");
          setNonMemberKidFee(p.nonMemberKidFee ?? "");
          setStudentMemberFee(p.studentMemberFee ?? "");
          setStudentNonMemberFee(p.studentNonMemberFee ?? "");
          setPricingNotes(p.notes ?? "");
        }
        setFeeReminders(reminderData.reminders ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    setIsUpdating(false);
    if (res.ok) setEvent(json.event);
  };

  const savePerformanceSettings = async () => {
    setIsSavingPerf(true);
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performanceRegOpen: perfRegOpen,
        performanceRegDeadline: perfRegDeadline ? new Date(perfRegDeadline).toISOString() : null,
      }),
    });
    const json = await res.json();
    setIsSavingPerf(false);
    if (res.ok) setEvent(json.event);
  };

  const savePricing = async () => {
    setIsSavingPricing(true);
    setPricingError(null);
    setPricingSaved(false);
    const payload = {
      isFree: pricingIsFree,
      feeType: pricingIsFree ? null : pricingFeeType,
      memberFamilyFee: memberFamilyFee !== "" ? parseFloat(memberFamilyFee) : null,
      nonMemberFamilyFee: nonMemberFamilyFee !== "" ? parseFloat(nonMemberFamilyFee) : null,
      memberAdultFee: memberAdultFee !== "" ? parseFloat(memberAdultFee) : null,
      nonMemberAdultFee: nonMemberAdultFee !== "" ? parseFloat(nonMemberAdultFee) : null,
      memberKidFee: memberKidFee !== "" ? parseFloat(memberKidFee) : null,
      nonMemberKidFee: nonMemberKidFee !== "" ? parseFloat(nonMemberKidFee) : null,
      studentMemberFee: studentMemberFee !== "" ? parseFloat(studentMemberFee) : null,
      studentNonMemberFee: studentNonMemberFee !== "" ? parseFloat(studentNonMemberFee) : null,
      notes: pricingNotes || null,
    };
    const res = await fetch(`/api/events/${id}/pricing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setIsSavingPricing(false);
    if (!res.ok) {
      setPricingError(json.error ?? "Failed to save pricing.");
    } else {
      setPricing(json.pricing);
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 3000);
    }
  };

  const sendRsvpReminder = async () => {
    const noActionCount = rows.filter((r) => r.type === "MEMBER" && r.status === "NO_ACTION").length;
    if (!confirm(`Send an RSVP reminder to ${noActionCount} member${noActionCount !== 1 ? "s" : ""} who haven't responded?`)) return;
    setIsSendingRsvpReminder(true);
    setRsvpReminderResult(null);
    const res = await fetch(`/api/events/${id}/rsvp-reminder`, { method: "POST" });
    const json = await res.json();
    setIsSendingRsvpReminder(false);
    if (!res.ok) {
      alert(json.error ?? "Failed to send RSVP reminders.");
    } else {
      setRsvpReminderResult({
        count: json.recipientCount,
        emailSent: json.emailSent,
        emailError: json.emailError ?? undefined,
      });
    }
  };

  const sendFeeReminder = async () => {
    if (!confirm(`Send a fee payment reminder to all confirmed RSVPs (${rows.filter(r => r.status === "YES").length} people)?`)) return;
    setIsSendingReminder(true);
    setReminderResult(null);
    const res = await fetch(`/api/events/${id}/fee-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reminderMessage || undefined }),
    });
    const json = await res.json();
    setIsSendingReminder(false);
    if (!res.ok) {
      setReminderResult(null);
      alert(json.error ?? "Failed to send reminder.");
    } else {
      setReminderResult({
        count: json.recipientCount,
        emailSent: json.emailSent,
        emailError: json.emailError ?? undefined,
      });
      // Refresh reminders list
      fetch(`/api/events/${id}/fee-reminder`)
        .then((r) => r.json())
        .then((d) => setFeeReminders(d.reminders ?? []));
    }
  };

  const handleExportPerfCsv = () => {
    const escape = (v: string | number | null | boolean | undefined) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const headers = [
      "Program Name", "Type", "Format", "Duration", "Participants",
      "Coordinator", "Email", "WhatsApp", "Songs", "Mics", "Mic Type",
      "Additional Details", "Submitted",
    ];
    const csvRows = perfRegs.map((r) => [
      escape(r.programName),
      escape(PERF_TYPE_LABELS[r.performanceType] ?? r.performanceType),
      escape(r.isGroup ? `Group (${r.participantCount ?? "?"})` : "Solo"),
      escape(r.duration),
      escape(r.isGroup ? (r.participantCount ?? "") : ""),
      escape(r.coordinatorName),
      escape(r.coordinatorEmail),
      escape(r.coordinatorPhone),
      escape(r.songList ?? ""),
      escape(r.micCount ?? ""),
      escape(r.micType ?? ""),
      escape(r.additionalDetails ?? ""),
      escape(new Date(r.createdAt).toLocaleString("en-US")),
    ].join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = event?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() ?? "event";
    a.href = url;
    a.download = `${safeName}_performances.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event? This will also remove all RSVPs. This cannot be undone.")) return;
    setIsDeleting(true);
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.push("/events/manage");
  };

  const startAddItem = () => {
    setEditingItemId(null);
    setFormName("");
    setFormDesc("");
    setFormQty(1);
    setItemError(null);
    setIsAddingItem(true);
  };

  const startEditItem = (item: EventItem) => {
    setIsAddingItem(false);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormQty(item.quantityNeeded);
    setItemError(null);
    setEditingItemId(item.id);
  };

  const cancelItemForm = () => {
    setIsAddingItem(false);
    setEditingItemId(null);
    setItemError(null);
  };

  const saveAddItem = async () => {
    if (!formName.trim()) { setItemError("Item name is required."); return; }
    setItemSaving(true);
    setItemError(null);
    const res = await fetch(`/api/events/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null, quantityNeeded: formQty }),
    });
    const json = await res.json();
    setItemSaving(false);
    if (!res.ok) { setItemError(json.error ?? "Failed to add item."); return; }
    setItems((prev) => [...prev, { ...json.item, quantityCommitted: 0 }]);
    setIsAddingItem(false);
  };

  const saveEditItem = async (itemId: string) => {
    if (!formName.trim()) { setItemError("Item name is required."); return; }
    setItemSaving(true);
    setItemError(null);
    const res = await fetch(`/api/events/${id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null, quantityNeeded: formQty }),
    });
    const json = await res.json();
    setItemSaving(false);
    if (!res.ok) { setItemError(json.error ?? "Failed to update item."); return; }
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, ...json.item } : it));
    setEditingItemId(null);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Remove this item? Members who committed to bring it will lose their selection.")) return;
    const res = await fetch(`/api/events/${id}/items/${itemId}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleExportCsv = () => {
    const escape = (v: string | number | null) => {
      const s = v === null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const headers = ["Name", "Email", "Type", "Response", "Adults (15+)", "Kids (under 15)", "Items Bringing", "Notes"];
    const csvRows = sortedRows.map((r) => [
      escape(r.name),
      escape(r.email),
      escape(r.type === "MEMBER" ? "Member" : "Guest"),
      escape(attendingLabels[r.status] ?? r.status),
      escape(r.status === "YES" ? r.adultCount : ""),
      escape(r.status === "YES" ? r.kidCount : ""),
      escape(r.items.length > 0 ? r.items.map((i) => `${i.name} x${i.quantity}`).join("; ") : ""),
      escape(r.notes),
    ].join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = event?.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() ?? "event";
    a.href = url;
    a.download = `${safeName}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  }
  if (!event) {
    return <DashboardLayout><p className="mt-8 text-center text-gray-500">Event not found.</p></DashboardLayout>;
  }

  const totalAttending = rows.filter((r) => r.status === "YES").reduce((sum, r) => sum + r.adultCount + r.kidCount, 0);
  const totalAdults = rows.filter((r) => r.status === "YES").reduce((sum, r) => sum + r.adultCount, 0);
  const totalKids = rows.filter((r) => r.status === "YES").reduce((sum, r) => sum + r.kidCount, 0);
  const noCount = rows.filter((r) => r.status === "NO").length;
  const maybeCount = rows.filter((r) => r.status === "MAYBE").length;
  const noActionCount = rows.filter((r) => r.status === "NO_ACTION").length;

  const statusOrder: Record<string, number> = { YES: 0, MAYBE: 1, NO: 2, NO_ACTION: 3 };
  const sortedRows = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else if (sortField === "email") cmp = a.email.localeCompare(b.email);
    else if (sortField === "type") cmp = a.type.localeCompare(b.type);
    else if (sortField === "status") cmp = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    else if (sortField === "adultCount") cmp = a.adultCount - b.adultCount;
    else if (sortField === "kidCount") cmp = a.kidCount - b.kidCount;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const eviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${id}`
    : `/events/${id}`;

  const performUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${id}/perform`
    : `/events/${id}/perform`;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <Link href="/events/manage" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[event.status] ?? ""}`}>
                {event.status}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {event.status === "PUBLISHED" && (
                <a
                  href={`/events/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> View Evite
                </a>
              )}
              {event.status === "DRAFT" && (
                <Button size="sm" onClick={() => updateStatus("PUBLISHED")} isLoading={isUpdating}>
                  <Globe className="w-4 h-4" /> Publish
                </Button>
              )}
              {event.status === "PUBLISHED" && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus("CANCELLED")} isLoading={isUpdating}>
                  <XCircle className="w-4 h-4" /> Cancel Event
                </Button>
              )}
              {event.status === "CANCELLED" && (
                <Button size="sm" onClick={() => updateStatus("PUBLISHED")} isLoading={isUpdating}>
                  <Globe className="w-4 h-4" /> Re-publish
                </Button>
              )}
              <Link href={`/events/manage/${id}/edit`}>
                <Button size="sm" variant="secondary"><Edit className="w-4 h-4" /> Edit</Button>
              </Link>
              <Button size="sm" variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Event Details card */}
        <Card title="Event Details">
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                <span>
                  {new Date(event.eventDate).toLocaleString("en-US", {
                    weekday: "long", year: "numeric", month: "long",
                    day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                <span>{event.venue}</span>
              </div>
              {event.description && (
                <div className="flex items-start gap-3 text-gray-700">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm">{event.description}</p>
                </div>
              )}
              {event.status === "PUBLISHED" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Evite link (share with members &amp; guests):</p>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <code className="text-xs text-blue-700 flex-1 truncate">{eviteUrl}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(eviteUrl)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded hover:bg-white transition-colors shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            {event.posterUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={event.posterUrl}
                alt="Event poster"
                className="w-48 rounded-xl border border-gray-200 object-cover shrink-0 shadow-sm"
              />
            )}
          </div>
        </Card>

        {/* Items to Bring */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Items to Bring</h3>
            </div>
            {!isAddingItem && !editingItemId && (
              <Button size="sm" variant="secondary" onClick={startAddItem}>
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            )}
          </div>

          {itemError && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{itemError}</div>
          )}

          {items.length === 0 && !isAddingItem ? (
            <div className="text-center py-6">
              <Package className="w-9 h-9 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No items yet. Add items that members can volunteer to bring.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) =>
                editingItemId === item.id ? (
                  <div key={item.id} className="flex items-end gap-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Item name *</label>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <input
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="optional"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-gray-500 mb-1">Qty needed</label>
                      <input
                        type="number"
                        min={1}
                        value={formQty}
                        onChange={(e) => setFormQty(Math.max(1, +e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => saveEditItem(item.id)} isLoading={itemSaving}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelItemForm}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                        {item.description && (
                          <span className="text-xs text-gray-400 truncate">{item.description}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Needed: <span className="font-semibold text-gray-700">{item.quantityNeeded}</span>
                        <span className="mx-1.5 text-gray-300">•</span>
                        Committed: <span className={`font-semibold ${
                          item.quantityCommitted >= item.quantityNeeded ? "text-green-600" : "text-amber-600"
                        }`}>{item.quantityCommitted}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditItem(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Inline add form */}
              {isAddingItem && (
                <div className="flex items-end gap-2 bg-gray-50 rounded-lg p-3 border border-dashed border-gray-300">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Item name *</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Biryani"
                      autoFocus
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="optional"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-1">Qty needed</label>
                    <input
                      type="number"
                      min={1}
                      value={formQty}
                      onChange={(e) => setFormQty(Math.max(1, +e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" onClick={saveAddItem} isLoading={itemSaving}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelItemForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Entry Fee / Pricing */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Entry Fee</h3>
            </div>
          </div>

          <div className="space-y-4">
            {/* Free / Paid toggle */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Entry type:</span>
              <div className="flex gap-2">
                {[
                  { label: "Free entry", value: true },
                  { label: "Paid entry", value: false },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setPricingIsFree(opt.value)}
                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      pricingIsFree === opt.value
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {!pricingIsFree && (
              <>
                {/* Fee type: Family vs Individual */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 w-28">Fee per:</span>
                  <div className="flex gap-2">
                    {[
                      { label: "Family", value: "FAMILY" as const },
                      { label: "Person", value: "INDIVIDUAL" as const },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPricingFeeType(opt.value)}
                        className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          pricingFeeType === opt.value
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {pricingFeeType === "FAMILY" && (
                  <>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Family</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Member family fee ($)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="e.g. 20.00"
                          value={memberFamilyFee}
                          onChange={(e) => setMemberFamilyFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Non-member family fee ($)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="e.g. 30.00"
                          value={nonMemberFamilyFee}
                          onChange={(e) => setNonMemberFamilyFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Individual <span className="font-normal normal-case text-gray-400">(attending without family)</span></p>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {pricingFeeType === "FAMILY" ? "Individual member ($)" : "Member adult (15+) fee ($)"}
                    </label>
                    <input
                      type="number" min="0" step="0.01" placeholder="e.g. 10.00"
                      value={memberAdultFee}
                      onChange={(e) => setMemberAdultFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {pricingFeeType === "FAMILY" ? "Individual non-member ($)" : "Non-member adult (15+) fee ($)"}
                    </label>
                    <input
                      type="number" min="0" step="0.01" placeholder="e.g. 15.00"
                      value={nonMemberAdultFee}
                      onChange={(e) => setNonMemberAdultFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {pricingFeeType !== "FAMILY" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Member child (under 15) fee ($)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="e.g. 5.00"
                          value={memberKidFee}
                          onChange={(e) => setMemberKidFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Non-member child (under 15) fee ($)</label>
                        <input
                          type="number" min="0" step="0.01" placeholder="e.g. 8.00"
                          value={nonMemberKidFee}
                          onChange={(e) => setNonMemberKidFee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">Student</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Student member ($)</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="e.g. 5.00"
                      value={studentMemberFee}
                      onChange={(e) => setStudentMemberFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Student non-member ($)</label>
                    <input
                      type="number" min="0" step="0.01" placeholder="e.g. 8.00"
                      value={studentNonMemberFee}
                      onChange={(e) => setStudentNonMemberFee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Payment instructions / notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Pay at the door with cash or Zelle to treasurer@tgroc.org"
                value={pricingNotes}
                onChange={(e) => setPricingNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {pricingError && (
              <p className="text-sm text-red-600">{pricingError}</p>
            )}

            <div className="flex items-center gap-3">
              <Button size="sm" onClick={savePricing} isLoading={isSavingPricing}>
                <Check className="w-4 h-4" /> Save Pricing
              </Button>
              {pricingSaved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Fee Reminder section — only shown when event has paid fees set */}
          {pricing && !pricing.isFree && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-900">Send Payment Reminders</h4>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Sends an email reminder to all confirmed RSVPs ({rows.filter(r => r.status === "YES").length} people) with the fee details.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Additional message <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please bring exact change or pay via Venmo @TGROC before the event."
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={sendFeeReminder}
                  isLoading={isSendingReminder}
                  disabled={rows.filter(r => r.status === "YES").length === 0}
                >
                  <Bell className="w-4 h-4" /> Send Reminder
                </Button>

                {reminderResult && (
                  <div className={`p-3 rounded-lg text-sm ${reminderResult.emailSent ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                    {reminderResult.emailSent
                      ? `✓ Reminder sent to ${reminderResult.count} attendee${reminderResult.count !== 1 ? "s" : ""}.`
                      : `Reminder logged for ${reminderResult.count} attendee${reminderResult.count !== 1 ? "s" : ""}, but email delivery requires server configuration.`
                    }
                    {reminderResult.emailError && (
                      <p className="text-xs mt-1 opacity-75">{reminderResult.emailError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Reminder history */}
              {feeReminders.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Reminder history</p>
                  <div className="space-y-1.5">
                    {feeReminders.map((r) => {
                      const sender = r.sentBy?.profile
                        ? `${r.sentBy.profile.firstName} ${r.sentBy.profile.lastName}`
                        : "Admin";
                      return (
                        <div key={r.id} className="flex items-center gap-3 text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
                          <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {new Date(r.sentAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            <span className="font-medium text-gray-700">{r.recipientCount} recipient{r.recipientCount !== 1 ? "s" : ""}</span>
                            {" · sent by "}{sender}
                          </span>
                          {r.message && <span className="text-gray-400 italic truncate">"{r.message}"</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Performance Registration Settings */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Performance Registration</h3>
              {(event._count?.performances ?? 0) > 0 && (
                <span className="ml-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {event._count?.performances}
                </span>
              )}
            </div>
            {perfRegs.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleExportPerfCsv}>
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            )}
          </div>

          {/* Settings row */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 mb-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Registration open?</span>
              <button
                type="button"
                onClick={() => setPerfRegOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  perfRegOpen
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
              >
                {perfRegOpen
                  ? <><ToggleRight className="w-4 h-4" /> Open</>
                  : <><ToggleLeft className="w-4 h-4" /> Closed</>}
              </button>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Registration deadline (optional)</label>
              <input
                type="datetime-local"
                value={perfRegDeadline}
                onChange={(e) => setPerfRegDeadline(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <Button size="sm" onClick={savePerformanceSettings} isLoading={isSavingPerf}>
              <Check className="w-4 h-4" /> Save
            </Button>
          </div>

          {/* Registration link */}
          {perfRegOpen && event.status === "PUBLISHED" && (
            <div className="mb-5 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-purple-500 mb-1">Registration link (share with performers):</p>
                <code className="text-xs text-purple-800 truncate block">{performUrl}</code>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(performUrl)}
                  className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 border border-purple-200 rounded hover:bg-white transition-colors"
                >
                  Copy
                </button>
                <a
                  href={performUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 border border-purple-200 rounded hover:bg-white transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Preview
                </a>
              </div>
            </div>
          )}

          {/* Submissions table */}
          {perfRegs.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {perfRegOpen
                  ? "No registrations yet. Share the link above to start collecting submissions."
                  : "Enable registration above and share the link to collect performance submissions."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {perfRegs.map((reg) => {
                const isExpanded = expandedReg === reg.id;
                return (
                  <div key={reg.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedReg(isExpanded ? null : reg.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg shrink-0">
                        {reg.performanceType === "SINGING" ? "🎤" :
                         reg.performanceType === "DANCE" ? "💃" :
                         reg.performanceType === "SKIT" ? "🎭" :
                         reg.performanceType === "POEM_RECITAL" ? "📜" :
                         reg.performanceType === "QUIZ" ? "🧠" : "😄"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{reg.programName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {PERF_TYPE_LABELS[reg.performanceType]} ·{" "}
                          {reg.isGroup ? `Group (${reg.participantCount ?? "?"} participants)` : "Solo"} ·{" "}
                          {reg.duration}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-700">{reg.coordinatorName}</p>
                        <p className="text-xs text-gray-400">{reg.coordinatorEmail}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-3">
                        <PerfDetail label="Type">{PERF_TYPE_LABELS[reg.performanceType]}</PerfDetail>
                        <PerfDetail label="Format">{reg.isGroup ? `Group` : "Solo"}</PerfDetail>
                        {reg.isGroup && <PerfDetail label="Participants">{reg.participantCount ?? "—"}</PerfDetail>}
                        <PerfDetail label="Duration">{reg.duration}</PerfDetail>
                        <PerfDetail label="Coordinator">{reg.coordinatorName}</PerfDetail>
                        <PerfDetail label="Email">{reg.coordinatorEmail}</PerfDetail>
                        <PerfDetail label="WhatsApp">{reg.coordinatorPhone}</PerfDetail>
                        {reg.micCount !== null && (
                          <PerfDetail label="Mics">
                            {reg.micCount} {reg.micType ? `(${reg.micType === "STANDING" ? "Standing" : "Handheld"})` : ""}
                          </PerfDetail>
                        )}
                        {reg.songList && (
                          <div className="col-span-full">
                            <p className="text-xs text-gray-400 mb-0.5">Songs</p>
                            <p className="text-gray-700 whitespace-pre-line text-xs">{reg.songList}</p>
                          </div>
                        )}
                        {reg.additionalDetails && (
                          <div className="col-span-full">
                            <p className="text-xs text-gray-400 mb-0.5">Additional Details</p>
                            <p className="text-gray-700 text-xs">{reg.additionalDetails}</p>
                          </div>
                        )}
                        <div className="col-span-full">
                          <p className="text-xs text-gray-400">
                            Submitted {new Date(reg.createdAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* RSVP Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{totalAttending}</p>
            <p className="text-sm text-green-600 mt-1">Attending</p>
            <p className="text-xs text-green-500 mt-0.5">{totalAdults} adults · {totalKids} kids</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">{maybeCount}</p>
            <p className="text-sm text-yellow-600 mt-1">Maybe</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{noCount}</p>
            <p className="text-sm text-red-600 mt-1">Declined</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-gray-500">{noActionCount}</p>
            <p className="text-sm text-gray-400 mt-1">No response</p>
          </div>
        </div>

        {/* RSVP / Member Response List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Member Responses</h3>
              <p className="text-xs text-gray-400 mt-0.5">{rows.filter(r => r.type === "MEMBER").length} members · {rows.filter(r => r.type === "GUEST").length} guests · click a column header to sort</p>
            </div>
            <div className="flex items-center gap-2">
              {event.status === "PUBLISHED" && noActionCount > 0 && (
                <Button size="sm" variant="secondary" onClick={sendRsvpReminder} isLoading={isSendingRsvpReminder}>
                  <Bell className="w-4 h-4" /> Remind ({noActionCount})
                </Button>
              )}
              {rows.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              )}
            </div>
          </div>
          {rsvpReminderResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              rsvpReminderResult.emailSent
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
            }`}>
              {rsvpReminderResult.emailSent
                ? `✓ Reminder sent to ${rsvpReminderResult.count} member${rsvpReminderResult.count !== 1 ? "s" : ""}.`
                : `⚠ Reminder recorded but email could not be sent. ${rsvpReminderResult.emailError ?? ""}`}
            </div>
          )}
          {rows.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {event.status === "PUBLISHED" ? "No responses yet. Share the evite link to start collecting RSVPs." : "Publish this event to start collecting RSVPs."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <SortTh label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Response" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Adults" field="adultCount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortTh label="Kids" field="kidCount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th className="text-left pb-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Bringing</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRows.map((row) => (
                    <tr key={row.key} className={row.status === "NO_ACTION" ? "opacity-50" : ""}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{row.name}</td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs">{row.email}</td>
                      <td className="py-2.5 pr-4 text-xs">
                        {row.type === "MEMBER"
                          ? <span className="text-blue-600 font-medium">Member</span>
                          : <span className="text-gray-400">Guest</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${attendingColors[row.status] ?? ""}`}>
                          {attendingLabels[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 text-center">
                        {row.status === "YES" ? row.adultCount : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 text-center">
                        {row.status === "YES" ? row.kidCount : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-gray-700">
                        {row.items.length > 0
                          ? row.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 text-gray-400 text-xs italic">{row.notes || "—"}</td>
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

function SortTh({
  label, field, sortField, sortDir, onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = field === sortField;
  return (
    <th
      className="text-left pb-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc"
            ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </div>
    </th>
  );
}

function PerfDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-800 font-medium text-sm">{children}</p>
    </div>
  );
}
