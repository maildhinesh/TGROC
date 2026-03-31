"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, MapPin, Users, CheckCircle, Music, DollarSign } from "lucide-react";

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  quantityNeeded: number;
}

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
  items: EventItem[];
  _count: { rsvps: number };
}

export default function EvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();

  const [event, setEvent] = useState<Event | null>(null);
  const [pricing, setPricing] = useState<EventPricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attending, setAttending] = useState("YES");
  const [adultCount, setAdultCount] = useState(1);
  const [kidCount, setKidCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // itemId -> quantity selected by this RSVP
  const [itemSelections, setItemSelections] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`),
      fetch(`/api/events/${id}/pricing`),
    ])
      .then(async ([evRes, pricingRes]) => {
        if (!evRes.ok) { setNotFound(true); setIsLoading(false); return; }
        const evData = await evRes.json();
        const pricingData = pricingRes.ok ? await pricingRes.json() : {};
        setEvent(evData.event);
        setPricing(pricingData.pricing ?? null);
        setIsLoading(false);
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
        adultCount: attending === "YES" ? adultCount : 0,
        kidCount: attending === "YES" ? kidCount : 0,
        notes: notes || undefined,
        items: attending === "YES"
          ? Object.entries(itemSelections).map(([itemId, quantity]) => ({ itemId, quantity }))
          : undefined,
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
        TGROC — Tamils of Greater Rochester
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

          {/* Poster */}
          {event.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.posterUrl}
              alt={`${event.name} poster`}
              className="w-full object-cover max-h-80"
            />
          )}

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
              {pricing && (
                <EventDetail icon={<DollarSign className="w-5 h-5 text-indigo-500" />} label="Entry Fee" fullWidth>
                  {pricing.isFree ? (
                    <p className="font-semibold text-green-700 text-sm">Free admission</p>
                  ) : (
                    <div className="space-y-1">
                      {pricing.feeType === "FAMILY" && (
                        <>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Family</p>
                          {pricing.memberFamilyFee !== null && (
                            <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.memberFamilyFee).toFixed(2)}</span> <span className="text-gray-500">/ member family</span></p>
                          )}
                          {pricing.nonMemberFamilyFee !== null && (
                            <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.nonMemberFamilyFee).toFixed(2)}</span> <span className="text-gray-500">/ non-member family</span></p>
                          )}
                          {(pricing.memberAdultFee !== null || pricing.nonMemberAdultFee !== null) && (
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Individual</p>
                          )}
                        </>
                      )}
                      {pricing.memberAdultFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.memberAdultFee).toFixed(2)}</span> <span className="text-gray-500">{pricing.feeType === "FAMILY" ? "/ individual member" : "/ member adult (15+)"}</span></p>
                      )}
                      {pricing.nonMemberAdultFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.nonMemberAdultFee).toFixed(2)}</span> <span className="text-gray-500">{pricing.feeType === "FAMILY" ? "/ individual non-member" : "/ non-member adult (15+)"}</span></p>
                      )}
                      {pricing.memberKidFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.memberKidFee).toFixed(2)}</span> <span className="text-gray-500">/ member child (under 15)</span></p>
                      )}
                      {pricing.nonMemberKidFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.nonMemberKidFee).toFixed(2)}</span> <span className="text-gray-500">/ non-member child (under 15)</span></p>
                      )}
                      {(pricing.studentMemberFee !== null || pricing.studentNonMemberFee !== null) && (
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Student</p>
                      )}
                      {pricing.studentMemberFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.studentMemberFee).toFixed(2)}</span> <span className="text-gray-500">/ student member</span></p>
                      )}
                      {pricing.studentNonMemberFee !== null && (
                        <p className="text-sm"><span className="font-semibold text-gray-900">${Number(pricing.studentNonMemberFee).toFixed(2)}</span> <span className="text-gray-500">/ student non-member</span></p>
                      )}
                      {pricing.notes && <p className="text-xs text-gray-400 mt-1">{pricing.notes}</p>}
                    </div>
                  )}
                </EventDetail>
              )}
            </div>
          </div>

          {/* Performance registration callout */}
          {event.performanceRegOpen && (
            (() => {
              const isDeadlinePassed = event.performanceRegDeadline
                ? new Date() > new Date(event.performanceRegDeadline)
                : false;
              if (isDeadlinePassed) return null;
              return (
                <div className="mx-6 mb-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Want to perform?</p>
                      <p className="text-xs text-purple-600">
                        {event.performanceRegDeadline
                          ? `Register by ${new Date(event.performanceRegDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "Performance registration is open"}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/events/${id}/perform`}
                    className="shrink-0 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Register
                  </a>
                </div>
              );
            })()
          )}

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
                    <div className="grid grid-cols-3 gap-3">
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
                          Adults (15+) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={adultCount}
                          onChange={(e) => setAdultCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kids (under 15)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={kidCount}
                          onChange={(e) => setKidCount(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Items to bring — shown when attending YES and event has items */}
                  {attending === "YES" && event.items && event.items.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Items to bring
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="space-y-2">
                        {event.items.map((item) => {
                          const selected = itemSelections[item.id] !== undefined;
                          const qty = itemSelections[item.id] ?? 1;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                selected ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`item-${item.id}`}
                                checked={selected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setItemSelections((prev) => ({ ...prev, [item.id]: 1 }));
                                  } else {
                                    setItemSelections((prev) => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
                              />
                              <label htmlFor={`item-${item.id}`} className="flex-1 min-w-0 cursor-pointer">
                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                {item.description && (
                                  <span className="text-xs text-gray-400 ml-2">{item.description}</span>
                                )}
                                <span className="text-xs text-gray-300 ml-2">need {item.quantityNeeded}</span>
                              </label>
                              {selected && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setItemSelections((prev) => ({ ...prev, [item.id]: Math.max(1, qty - 1) }))}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-base font-bold leading-none"
                                  >
                                    −
                                  </button>
                                  <span className="w-8 text-center text-sm font-semibold text-gray-900">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => setItemSelections((prev) => ({ ...prev, [item.id]: qty + 1 }))}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-base font-bold leading-none"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
