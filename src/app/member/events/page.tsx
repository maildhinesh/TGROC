"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Spinner } from "@/components/ui";
import { Calendar, MapPin, ExternalLink, CheckCircle, XCircle, HelpCircle, Clock } from "lucide-react";

interface EventRsvp {
  attending: "YES" | "NO" | "MAYBE";
  adultCount: number;
  kidCount: number;
}

interface MemberEvent {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  venue: string;
  posterUrl: string | null;
  rsvp: EventRsvp | null;
}

const attendingConfig = {
  YES: { label: "Going", icon: CheckCircle, className: "bg-green-100 text-green-700 border-green-200" },
  NO: { label: "Not going", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
  MAYBE: { label: "Maybe", icon: HelpCircle, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export default function MemberEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<MemberEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated") {
      fetch("/api/events?member=1")
        .then((r) => r.json())
        .then(({ events }) => { setEvents(events ?? []); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [status, router]);

  if (isLoading || status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20"><Spinner /></div>
      </DashboardLayout>
    );
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.eventDate) >= now);
  const past = events.filter((e) => new Date(e.eventDate) < now).reverse(); // most recent first

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">
        <PageHeader
          title="Events"
          description="Browse upcoming TGROC events and manage your RSVPs."
        />

        {events.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No events scheduled</p>
            <p className="text-sm text-gray-400 mt-1">Check back soon for upcoming events.</p>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Upcoming Events
            </h2>
            <div className="space-y-4">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} isPast={false} />
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Past Events
            </h2>
            <div className="space-y-4">
              {past.map((event) => (
                <EventCard key={event.id} event={event} isPast={true} />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function EventCard({ event, isPast }: { event: MemberEvent; isPast: boolean }) {
  const eventDate = new Date(event.eventDate);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });

  // Past event attendance badge
  if (isPast) {
    const attended = event.rsvp?.attending === "YES";
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden opacity-80">
        <div className="flex gap-4 p-5">
          {event.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.posterUrl}
              alt=""
              className="w-20 h-16 object-cover rounded-lg shrink-0 border border-gray-100 grayscale"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-700">{event.name}</h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${
                attended
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                {attended
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Attended</>
                  : <><XCircle className="w-3.5 h-3.5" /> Not attended</>
                }
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-1.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {event.venue}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upcoming event
  const rsvpConfig = event.rsvp ? attendingConfig[event.rsvp.attending] : null;
  const RsvpIcon = rsvpConfig?.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {event.posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.posterUrl}
          alt=""
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{event.name}</h3>
          {rsvpConfig && RsvpIcon && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${rsvpConfig.className}`}>
              <RsvpIcon className="w-3.5 h-3.5" /> {rsvpConfig.label}
              {event.rsvp?.attending === "YES" && (event.rsvp.adultCount + event.rsvp.kidCount) > 0 && (
                <span className="ml-0.5 opacity-70">· {event.rsvp.adultCount + event.rsvp.kidCount} guest{(event.rsvp.adultCount + event.rsvp.kidCount) !== 1 ? "s" : ""}</span>
              )}
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-400" /> {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-400" /> {timeStr}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" /> {event.venue}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/events/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              event.rsvp
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            {event.rsvp ? "Update RSVP" : "RSVP Now"}
          </a>
          {!event.rsvp && (
            <span className="text-xs text-amber-600 font-medium">You haven&apos;t responded yet</span>
          )}
        </div>
      </div>
    </div>
  );
}
