"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader, Card, Button, Input, Spinner } from "@/components/ui";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import Link from "next/link";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [currentPosterUrl, setCurrentPosterUrl] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [removePosterFlag, setRemovePosterFlag] = useState(false);
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
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterPreview(URL.createObjectURL(file));
    setRemovePosterFlag(false);
  };

  const clearNewPoster = () => {
    setPosterFile(null);
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterPreview(null);
    if (posterInputRef.current) posterInputRef.current.value = "";
  };

  const handleRemoveCurrentPoster = () => {
    setRemovePosterFlag(true);
    setCurrentPosterUrl(null);
    clearNewPoster();
  };

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then(({ event }) => {
        if (event) {
          const dt = new Date(event.eventDate);
          setName(event.name);
          setDescription(event.description ?? "");
          setEventDate(dt.toISOString().split("T")[0]);
          setEventTime(dt.toTimeString().slice(0, 5));
          setVenue(event.venue);
          setStatus(event.status);
          setCurrentPosterUrl(event.posterUrl ?? null);
        }
        setIsFetching(false);
      })
      .catch(() => setIsFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setServerError(null);

    const combinedDateTime = eventTime ? `${eventDate}T${eventTime}` : `${eventDate}T00:00`;

    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, eventDate: combinedDateTime, venue, status }),
    });

    const json = await res.json();

    if (!res.ok) {
      setIsLoading(false);
      setServerError(json.error ?? "Failed to update event.");
      return;
    }

    // Handle poster changes
    if (removePosterFlag && !posterFile) {
      await fetch(`/api/events/${id}/poster`, { method: "DELETE" });
    } else if (posterFile) {
      const fd = new FormData();
      fd.append("poster", posterFile);
      await fetch(`/api/events/${id}/poster`, { method: "POST", body: fd });
    }

    setIsLoading(false);
    router.push(`/events/manage/${id}`);
  };

  if (isFetching) {
    return <DashboardLayout><div className="flex justify-center py-20"><Spinner /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link href={`/events/manage/${id}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <PageHeader title="Edit Event" />
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
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                />
              </div>
              <Input
                label="Venue"
                required
                value={venue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVenue(e.target.value)}
              />
            </div>
          </Card>

          <Card title="Event Poster">
            <div className="space-y-3">
              {/* Show new preview if a file was selected */}
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
                    onClick={clearNewPoster}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white border border-gray-200 rounded-full p-1 shadow-sm transition-colors"
                    title="Cancel new poster"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ) : currentPosterUrl ? (
                /* Show existing poster from DB */
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPosterUrl}
                    alt="Current poster"
                    className="w-full max-w-xs rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCurrentPoster}
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
              {(currentPosterUrl || posterPreview) && (
                <button
                  type="button"
                  onClick={() => posterInputRef.current?.click()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Replace poster
                </button>
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
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href={`/events/manage/${id}`}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isLoading}>Save Changes</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
