"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Button, Spinner } from "@/components/ui";
import { Plus, Calendar, MapPin, Users, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  status: string;
  posterUrl: string | null;
  _count: { rsvps: number };
}

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ManageEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const role = session?.user?.role as string | undefined;

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated") {
      if (role !== "ADMIN" && role !== "OFFICE_BEARER") { router.push("/dashboard"); return; }
      fetch("/api/events?manage=1")
        .then((r) => r.json())
        .then(({ events }) => { setEvents(events ?? []); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [status, role, router]);

  if (isLoading || status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20"><Spinner /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <PageHeader
            title="Events"
            description="Create and manage cultural events. Publish an event to make its evite available."
          />
          <Link href="/events/manage/new">
            <Button><Plus className="w-4 h-4" /> Create Event</Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No events yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first event to get started.</p>
            <Link href="/events/manage/new">
              <Button className="mt-4"><Plus className="w-4 h-4" /> Create Event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  {event.posterUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={event.posterUrl}
                      alt=""
                      className="w-16 h-12 object-cover rounded-lg shrink-0 border border-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[event.status] ?? ""}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.eventDate).toLocaleString("en-US", {
                          weekday: "short", year: "numeric", month: "short",
                          day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {event.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {event._count.rsvps} RSVP{event._count.rsvps !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.status === "PUBLISHED" && (
                      <a
                        href={`/events/${event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Evite
                      </a>
                    )}
                    <Link
                      href={`/events/manage/${event.id}`}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
