"use client";

import { useState, useEffect, use } from "react";
import { Calendar, MapPin, Music, Mic, Users, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

const PERFORMANCE_TYPES = [
  { value: "SINGING", label: "Singing", emoji: "🎤" },
  { value: "DANCE", label: "Dance", emoji: "💃" },
  { value: "SKIT", label: "Skit", emoji: "🎭" },
  { value: "POEM_RECITAL", label: "Poem Recital", emoji: "📜" },
  { value: "QUIZ", label: "Quiz", emoji: "🧠" },
  { value: "STANDUP", label: "Standup Comedy", emoji: "😄" },
] as const;

type PerformanceTypeValue = (typeof PERFORMANCE_TYPES)[number]["value"];

interface EventInfo {
  id: string;
  name: string;
  eventDate: string;
  venue: string;
  posterUrl: string | null;
  status: string;
  performanceRegOpen: boolean;
  performanceRegDeadline: string | null;
}

interface FormData {
  performanceType: PerformanceTypeValue | "";
  isGroup: boolean;
  programName: string;
  duration: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  participantCount: string;
  songList: string;
  micCount: string;
  micType: "STANDING" | "HANDHELD" | "";
  additionalDetails: string;
}

const initialForm: FormData = {
  performanceType: "",
  isGroup: false,
  programName: "",
  duration: "",
  coordinatorName: "",
  coordinatorEmail: "",
  coordinatorPhone: "",
  participantCount: "",
  songList: "",
  micCount: "",
  micType: "",
  additionalDetails: "",
};

export default function PerformancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [regClosed, setRegClosed] = useState(false);

  // Form state
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Steps: "form" | "terms" | "success"
  const [step, setStep] = useState<"form" | "terms" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setIsLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const ev: EventInfo = data.event;
        setEvent(ev);
        if (!ev.performanceRegOpen) {
          setRegClosed(true);
        } else if (ev.performanceRegDeadline && new Date() > new Date(ev.performanceRegDeadline)) {
          setRegClosed(true);
        }
        setIsLoading(false);
      })
      .catch(() => { setNotFound(true); setIsLoading(false); });
  }, [id]);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const needsMics = form.performanceType !== "" && form.performanceType !== "DANCE";
  const showSongs = form.performanceType === "SINGING" || form.performanceType === "DANCE";

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.performanceType) errs.performanceType = "Please select a performance type";
    if (!form.programName.trim()) errs.programName = "Program name is required";
    if (!form.duration.trim()) errs.duration = "Duration is required";
    if (!form.coordinatorName.trim()) errs.coordinatorName = "Coordinator name is required";
    if (!form.coordinatorEmail.trim()) errs.coordinatorEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.coordinatorEmail)) errs.coordinatorEmail = "Enter a valid email";
    if (!form.coordinatorPhone.trim()) errs.coordinatorPhone = "WhatsApp number is required";
    if (form.isGroup && !form.participantCount) errs.participantCount = "Enter number of participants for group";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) setStep("terms");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      performanceType: form.performanceType,
      isGroup: form.isGroup,
      programName: form.programName,
      duration: form.duration,
      coordinatorName: form.coordinatorName,
      coordinatorEmail: form.coordinatorEmail,
      coordinatorPhone: form.coordinatorPhone,
      participantCount: form.isGroup && form.participantCount ? parseInt(form.participantCount) : null,
      songList: form.songList || null,
      micCount: needsMics && form.micCount ? parseInt(form.micCount) : null,
      micType: needsMics && form.micCount && parseInt(form.micCount) > 0 ? (form.micType || null) : null,
      additionalDetails: form.additionalDetails || null,
      agreedToTerms: true,
    };

    const res = await fetch(`/api/events/${id}/performances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setSubmitError(json.error ?? "Submission failed. Please try again.");
      setStep("form");
    } else {
      setStep("success");
    }
  };

  const Field = ({ label, error, required, children }: {
    label: string; error?: string; required?: boolean; children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 border ${err ? "border-red-400" : "border-gray-300"} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-300">Event not found</p>
        </div>
      </div>
    );
  }

  // ── Registration closed ──
  if (regClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-9 h-9 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Closed</h2>
          <p className="text-gray-500 text-sm">
            {event.performanceRegDeadline && new Date() > new Date(event.performanceRegDeadline)
              ? "The deadline for performance registrations has passed."
              : "Performance registration is not currently open for this event."}
          </p>
          <p className="text-sm text-purple-700 font-medium mt-4">{event.name}</p>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.eventDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Top strip */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-2.5 text-sm font-medium tracking-wide">
        TGROC — Tamils of Greater Rochester
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-purple-100 mb-6">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🎭
            </div>
            <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-1">
              Performance Registration
            </p>
            <h1 className="text-2xl font-bold leading-tight">{event.name}</h1>
          </div>
          <div className="px-6 py-4 bg-purple-50/40 border-b border-purple-100 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              {eventDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-purple-400" />
              {event.venue}
            </span>
          </div>
          {event.performanceRegDeadline && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Registration deadline:{" "}
              <strong>
                {new Date(event.performanceRegDeadline).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </strong>
            </div>
          )}
        </div>

        {/* ── Step: Form ── */}
        {step === "form" && (
          <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              Your Performance Details
            </h2>

            {submitError && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="space-y-5">
              {/* Performance type */}
              <Field label="Type of Performance" error={errors.performanceType} required>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {PERFORMANCE_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      type="button"
                      onClick={() => set("performanceType", pt.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        form.performanceType === pt.value
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-500"
                      }`}
                    >
                      <span className="text-xl">{pt.emoji}</span>
                      {pt.label}
                    </button>
                  ))}
                </div>
                {errors.performanceType && (
                  <p className="mt-1 text-xs text-red-600">{errors.performanceType}</p>
                )}
              </Field>

              {/* Group or solo */}
              <Field label="Group or Solo?">
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {[
                    { value: false, label: "Solo", emoji: "🧑" },
                    { value: true, label: "Group", emoji: "👥" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => set("isGroup", opt.value)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.isGroup === opt.value
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-500"
                      }`}
                    >
                      <span>{opt.emoji}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Program name */}
              <Field label="Name of the Program" error={errors.programName} required>
                <input
                  type="text"
                  value={form.programName}
                  onChange={(e) => set("programName", e.target.value)}
                  className={inputCls(errors.programName)}
                  placeholder="e.g. Jai Ho medley"
                />
              </Field>

              {/* Duration */}
              <Field label="Duration of Performance" error={errors.duration} required>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  className={inputCls(errors.duration)}
                  placeholder="e.g. 5 minutes"
                />
              </Field>

              {/* Group participants */}
              {form.isGroup && (
                <Field label="Number of Participants" error={errors.participantCount} required>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={form.participantCount}
                    onChange={(e) => set("participantCount", e.target.value)}
                    className={inputCls(errors.participantCount)}
                    placeholder="e.g. 8"
                  />
                </Field>
              )}

              {/* Coordinator section */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-400" />
                  Performance Coordinator
                </p>
                <div className="space-y-3">
                  <Field label="Name" error={errors.coordinatorName} required>
                    <input
                      type="text"
                      value={form.coordinatorName}
                      onChange={(e) => set("coordinatorName", e.target.value)}
                      className={inputCls(errors.coordinatorName)}
                      placeholder="Full name"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" error={errors.coordinatorEmail} required>
                      <input
                        type="email"
                        value={form.coordinatorEmail}
                        onChange={(e) => set("coordinatorEmail", e.target.value)}
                        className={inputCls(errors.coordinatorEmail)}
                        placeholder="email@example.com"
                      />
                    </Field>
                    <Field label="WhatsApp Number" error={errors.coordinatorPhone} required>
                      <input
                        type="tel"
                        value={form.coordinatorPhone}
                        onChange={(e) => set("coordinatorPhone", e.target.value)}
                        className={inputCls(errors.coordinatorPhone)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Songs list — for Singing and Dance */}
              {showSongs && (
                <Field label={form.performanceType === "DANCE" ? "List of Songs / Music" : "List of Songs"}>
                  <textarea
                    rows={3}
                    value={form.songList}
                    onChange={(e) => set("songList", e.target.value)}
                    className={`${inputCls()} resize-none`}
                    placeholder="Enter song names, one per line (optional)"
                  />
                </Field>
              )}

              {/* Mics — not for Dance */}
              {needsMics && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-purple-400" />
                    Microphone Requirements
                  </p>
                  <div className="space-y-3">
                    <Field label="Number of Mics">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={form.micCount}
                        onChange={(e) => set("micCount", e.target.value)}
                        className={inputCls()}
                        placeholder="0"
                      />
                    </Field>
                    {form.micCount && parseInt(form.micCount) > 0 && (
                      <Field label="Type of Mic">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: "STANDING", label: "Standing", emoji: "🎙️" },
                            { value: "HANDHELD", label: "Handheld", emoji: "🎤" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => set("micType", opt.value)}
                              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                form.micType === opt.value
                                  ? "border-purple-500 bg-purple-50 text-purple-700"
                                  : "border-gray-200 hover:border-gray-300 text-gray-500"
                              }`}
                            >
                              <span>{opt.emoji}</span> {opt.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                    )}
                  </div>
                </div>
              )}

              {/* Additional details */}
              <Field label="Additional Details">
                <textarea
                  rows={3}
                  value={form.additionalDetails}
                  onChange={(e) => set("additionalDetails", e.target.value)}
                  className={`${inputCls()} resize-none`}
                  placeholder="Any special requirements, notes for the organizers, etc."
                />
              </Field>

              <button
                type="button"
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Review & Agree to Terms <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Terms ── */}
        {step === "terms" && (
          <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-8 py-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Terms &amp; Conditions</h2>
            <p className="text-sm text-gray-500 mb-5">
              Please read and acknowledge the terms before submitting your registration.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 leading-relaxed space-y-3 max-h-72 overflow-y-auto mb-6">
              <p className="font-semibold text-gray-900">Performance Registration — Terms &amp; Conditions</p>
              <p>
                By registering your performance for this TGROC event, you agree to the following:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>
                  All performances must be family-friendly and appropriate for audiences of all ages.
                </li>
                <li>
                  The performance coordinator is responsible for ensuring all participants are present and
                  ready at the designated call time before the event.
                </li>
                <li>
                  TGROC reserves the right to modify or cancel any performance slot based on time
                  constraints or event requirements.
                </li>
                <li>
                  Any music, audio, or video material used must comply with applicable copyright
                  regulations. TGROC is not liable for any copyright violations by performers.
                </li>
                <li>
                  The coordinator will be contacted for coordination and scheduling. Please ensure the
                  provided contact details are accurate.
                </li>
                <li>
                  Performance content must be non-religious and must not include any derogatory or discriminatory 
                  references on Caste, Religion, Language, Race, Gender, Sexual Orientation, Disability, Age or any other basis.
                </li>
                <li>
                  All performances MUST be in Tamil language. Exceptions may be considered only with 
                  prior board approval for valid reasons.
                </li>
                <li>
                  If multiple groups/individuals register the same or very similar performance 
                  content/music/song, preference will be given to first-come basis. TGROC reserves 
                  the right to request changes to ensure a diverse program lineup.
                </li>
                <li>
                  Photos and videos may be captured during events for documentation, promotional, 
                  and community engagement purposes.
                </li>
                <li>
                  Individuals may request removal of their invidual photos / videos by contacting 
                  TGROC. However, once photos/videos are published on public platforms, TGROC 
                  cannot guarantee complete removal from all sources.
                </li>
                <li>
                  Individuals who do not want their photos/videos to be taken or published are 
                  advised not to participate in any group photos/videos.
                </li>
                <li>
                  Participants and guests who take photos/videos during the event are expected to 
                  respect the privacy and preferences of others. All media shared must be respectful, appropriate and aligned with the organizational values of TGROC.
                </li>
                <li>
                  Use of Photos/Videos taken during TGROC events for personal, commercial, political 
                  or religious promotional purposes is strictly prohibited without explicit written 
                  permission from TGROC board.
                </li>
              </ol>
            </div>

            {/* Summary */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6 text-sm">
              <p className="font-semibold text-purple-900 mb-2">Your Submission Summary</p>
              <ul className="space-y-1 text-purple-800">
                <li><span className="text-gray-500">Type:</span> {PERFORMANCE_TYPES.find(p => p.value === form.performanceType)?.label}</li>
                <li><span className="text-gray-500">Format:</span> {form.isGroup ? "Group" : "Solo"}</li>
                <li><span className="text-gray-500">Program:</span> {form.programName}</li>
                <li><span className="text-gray-500">Duration:</span> {form.duration}</li>
                <li><span className="text-gray-500">Coordinator:</span> {form.coordinatorName} · {form.coordinatorEmail}</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>I Agree &amp; Submit Registration</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to edit
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="bg-white rounded-3xl shadow-xl border border-purple-100 px-8 py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Registration Submitted! 🎉
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Thank you for registering your performance. The TGROC team will be in touch with
              the coordinator ({form.coordinatorName}) to finalize scheduling details.
            </p>
            <div className="mt-6 p-4 bg-purple-50 rounded-xl text-left text-sm text-purple-800">
              <p className="font-semibold mb-1">{form.programName}</p>
              <p className="text-purple-600 text-xs">
                {PERFORMANCE_TYPES.find(p => p.value === form.performanceType)?.label} ·{" "}
                {form.isGroup ? `Group (${form.participantCount || "?"} participants)` : "Solo"} ·{" "}
                {form.duration}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
