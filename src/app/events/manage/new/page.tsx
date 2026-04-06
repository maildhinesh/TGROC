"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input } from "@/components/ui";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import Link from "next/link";

export default function NewEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [timezone, setTimezone] = useState<"EDT" | "EST">(() => {
    // Auto-detect current Eastern timezone (EDT in summer, EST in winter)
    const tzName = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value ?? "EDT";
    return tzName as "EDT" | "EST";
  });
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setServerError("Only JPEG and PNG images are allowed for the poster.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Poster image must be 5 MB or smaller.");
      return;
    }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const removePoster = () => {
    setPosterFile(null);
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterPreview(null);
    if (posterInputRef.current) posterInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) { setServerError("Please select an event date."); return; }
    setIsLoading(true);
    setServerError(null);

    const offset = timezone === "EDT" ? "-04:00" : "-05:00";
    const combinedDateTime = eventTime
      ? `${eventDate}T${eventTime}:00${offset}`
      : `${eventDate}T00:00:00${offset}`;

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, eventDate: combinedDateTime, venue, status }),
    });

    const json = await res.json();

    if (!res.ok) {
      setIsLoading(false);
      setServerError(json.error ?? "Failed to create event.");
      return;
    }

    const eventId: string = json.event.id;

    if (posterFile) {
      const fd = new FormData();
      fd.append("poster", posterFile);
      await fetch(`/api/events/${eventId}/poster`, { method: "POST", body: fd });
    }

    setIsLoading(false);
    router.push(`/events/manage/${eventId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href="/events/manage" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <PageHeader title="Create Event" />
        </div>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card title="Event Details">
            <div className="space-y-4">
              <Input
                label="Event Name"
                required
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="e.g. Diwali Celebration 2026"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Brief description of the event..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Event Date"
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventDate(e.target.value)}
                />
                <Input
                  label="Event Time"
                  type="time"
                  value={eventTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventTime(e.target.value)}
                  hint="Optional"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value as "EDT" | "EST")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="EDT">EDT — Eastern Daylight (UTC−4)</option>
                    <option value="EST">EST — Eastern Standard (UTC−5)</option>
                  </select>
                </div>
              </div>
              <Input
                label="Venue"
                required
                value={venue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVenue(e.target.value)}
                placeholder="e.g. TGROC Community Hall, 123 Main St"
              />
            </div>
          </Card>

          <Card title="Event Poster">
            <div className="space-y-3">
              {posterPreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterPreview}
                    alt="Poster preview"
                    className="w-full max-w-xs rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removePoster}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white border border-gray-200 rounded-full p-1 shadow-sm transition-colors"
                    title="Remove poster"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-8 text-center transition-colors"
                >
                  <ImagePlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">Click to upload a poster</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG or PNG — max 5 MB</p>
                </button>
              )}
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handlePosterChange}
              />
              {!posterPreview && (
                <p className="text-xs text-gray-400">
                  A poster helps identify the event at a glance. You can also add or change it later.
                </p>
              )}
            </div>
          </Card>

          <Card title="Publishing">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="DRAFT">Draft — save for later, not yet visible</option>
                <option value="PUBLISHED">Published — evite is live and shareable</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Draft events are only visible to admins and officers.
              </p>
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href="/events/manage">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>Create Event</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
