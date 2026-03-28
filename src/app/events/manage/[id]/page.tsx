"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, Button, Spinner } from "@/components/ui";
import {
  ArrowLeft, Calendar, MapPin, FileText, Users, ExternalLink,
  Edit, Trash2, Globe, XCircle,
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
  createdAt: string;
  createdBy: {
    profile: { firstName: string; lastName: string } | null;
  };
}

interface Rsvp {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  attending: string;
  guestCount: number;
  notes: string | null;
  createdAt: string;
  user: { id: string; email: string; role: string } | null;
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
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => r.json()),
      fetch(`/api/events/${id}/rsvp`).then((r) => r.json()),
    ])
      .then(([evData, rsvpData]) => {
        setEvent(evData.event ?? null);
        setRsvps(rsvpData.rsvps ?? []);
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

  const handleDelete = async () => {
    if (!confirm("Delete this event? This will also remove all RSVPs. This cannot be undone.")) return;
    setIsDeleting(true);
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.push("/events/manage");
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  }
  if (!event) {
    return <DashboardLayout><p className="mt-8 text-center text-gray-500">Event not found.</p></DashboardLayout>;
  }

  const yesAttendees = rsvps.filter((r) => r.attending === "YES");
  const totalGuests = yesAttendees.reduce((sum, r) => sum + r.guestCount, 0);
  const noCount = rsvps.filter((r) => r.attending === "NO").length;
  const maybeCount = rsvps.filter((r) => r.attending === "MAYBE").length;

  const eviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/events/${id}`
    : `/events/${id}`;

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

        {/* RSVP Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{totalGuests}</p>
            <p className="text-sm text-green-600 mt-1">Attending (incl. guests)</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">{maybeCount}</p>
            <p className="text-sm text-yellow-600 mt-1">Maybe</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{noCount}</p>
            <p className="text-sm text-red-600 mt-1">Declined</p>
          </div>
        </div>

        {/* RSVP List */}
        <Card title={`RSVPs (${rsvps.length})`}>
          {rsvps.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {event.status === "PUBLISHED" ? "No RSVPs yet. Share the evite link to start collecting responses." : "Publish this event to start collecting RSVPs."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Response</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Guests</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{rsvp.name}</td>
                      <td className="py-2.5 pr-4 text-gray-600 text-xs">{rsvp.email}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${attendingColors[rsvp.attending] ?? ""}`}>
                          {rsvp.attending}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">
                        {rsvp.attending === "YES" ? rsvp.guestCount : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {rsvp.user
                          ? <span className="text-blue-600 font-medium">Member</span>
                          : <span className="text-gray-400">Guest</span>}
                      </td>
                      <td className="py-2.5 text-gray-400 text-xs italic">{rsvp.notes || "—"}</td>
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
