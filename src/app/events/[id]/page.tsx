"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, MapPin, Users, CheckCircle } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  venue: string;
  status: string;
  _count: { rsvps: number };
}

export default function EvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attending, setAttending] = useState("YES");
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setIsLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setEvent(data.event); setIsLoading(false); }
      })
      .catch(() => { setNotFound(true); setIsLoading(false); });
  }, [id]);

  // Pre-fill from session when available
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const handleRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const res = await fetch(`/api/events/${id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone || undefined,
        attending,
        guestCount: attending === "YES" ? guestCount : 0,
        notes: notes || undefined,
      }),
    });

    const json = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      setSubmitError(json.error ?? "Failed to submit RSVP. Please try again.");
    } else {
      setSubmitSuccess(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-300">Event not found</p>
          <p className="text-gray-400 mt-2">This event may no longer be available.</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.eventDate);
  const dayName = eventDate.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = eventDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Top strip */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-2.5 text-sm font-medium tracking-wide">
        TGROC — The Greater Richmond Organization of Cultures
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Evite card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-100">

          {/* Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-8 py-10 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎉
            </div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-2">
              You&apos;re invited to
            </p>
            <h1 className="text-3xl font-bold leading-tight mb-3">{event.name}</h1>
            {event.description && (
              <p className="text-indigo-100 text-sm leading-relaxed max-w-sm mx-auto">
                {event.description}
              </p>
            )}
          </div>

          {/* Event details */}
          <div className="px-8 py-6 border-b border-gray-100 bg-indigo-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EventDetail icon={<Calendar className="w-5 h-5 text-indigo-500" />} label="Date">
                <p className="font-semibold text-gray-900 text-sm">{dayName}</p>
                <p className="text-gray-500 text-xs">{monthDay}</p>
              </EventDetail>
              <EventDetail icon={<Clock className="w-5 h-5 text-indigo-500" />} label="Time">
                <p className="font-semibold text-gray-900 text-sm">{time}</p>
              </EventDetail>
              <EventDetail icon={<MapPin className="w-5 h-5 text-indigo-500" />} label="Venue" fullWidth>
                <p className="font-semibold text-gray-900 text-sm">{event.venue}</p>
              </EventDetail>
              {event._count.rsvps > 0 && (
                <EventDetail icon={<Users className="w-5 h-5 text-indigo-500" />} label="Attending" fullWidth>
                  <p className="font-semibold text-gray-900 text-sm">
                    {event._count.rsvps} {event._count.rsvps === 1 ? "person" : "people"} attending
                  </p>
                </EventDetail>
              )}
            </div>
          </div>

          {/* RSVP section */}
          <div className="px-8 py-6">
            {submitSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Thank you!</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  {attending === "YES" && "Your RSVP is confirmed. We look forward to seeing you!"}
                  {attending === "MAYBE" && "Got it! We hope to see you there."}
                  {attending === "NO" && "Thanks for letting us know. We hope to see you at the next event!"}
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-5 text-sm text-indigo-600 hover:underline"
                >
                  Update my RSVP
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-4">RSVP</h2>

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleRsvp} className="space-y-4">
                  {/* Attending selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Will you attend? <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "YES", label: "Yes!", icon: "🎉" },
                        { value: "MAYBE", label: "Maybe", icon: "🤔" },
                        { value: "NO", label: "Can't make it", icon: "😔" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAttending(opt.value)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                            attending === opt.value
                              ? opt.value === "YES"
                                ? "border-green-500 bg-green-50 text-green-700"
                                : opt.value === "NO"
                                ? "border-red-400 bg-red-50 text-red-700"
                                : "border-yellow-400 bg-yellow-50 text-yellow-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-500"
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  {attending === "YES" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of guests (incl. you)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Dietary requirements, accessibility needs, etc."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  >
                    {isSubmitting ? "Submitting…" : "Submit RSVP"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by TGROC Member Portal</p>
      </div>
    </div>
  );
}

function EventDetail({
  icon, label, children, fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
