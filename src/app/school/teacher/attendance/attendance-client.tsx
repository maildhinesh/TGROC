"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type ClassOption = {
  id: string;
  className: string;
  classCode: string;
  sessions: Array<{
    id: string;
    calendarDate: string;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  }>;
};

type AttendanceEntry = {
  studentProfileId: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
  note: string;
};

type Props = {
  classes: ClassOption[];
};

export default function AttendanceClient({ classes }: Props) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedSessionId, setSelectedSessionId] = useState(classes[0]?.sessions[0]?.id ?? "");
  const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
  const [roster, setRoster] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const sessionOptions = (selectedClass?.sessions ?? []).map((sessionItem) => ({
    value: sessionItem.id,
    label: `${formatDate(sessionItem.calendarDate)} (${sessionItem.status})`,
  }));

  async function loadSessionDetails(classId: string, sessionId: string) {
    if (!classId || !sessionId) {
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${classId}/sessions/${sessionId}/attendance`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load session attendance");
      }

      const nextRoster = (data.roster ?? []).map((item: { studentProfile: { id: string; firstName: string; lastName: string } }) => item.studentProfile);
      const existingEntries = (data.session?.attendanceEntries ?? []) as Array<{
        studentProfile: { id: string };
        status: AttendanceEntry["status"];
        note: string | null;
      }>;
      const map: Record<string, AttendanceEntry> = {};
      nextRoster.forEach((student: { id: string; firstName: string; lastName: string }) => {
        const matched = existingEntries.find((entry) => entry.studentProfile.id === student.id);
        map[student.id] = {
          studentProfileId: student.id,
          status: matched?.status ?? "PRESENT",
          note: matched?.note ?? "",
        };
      });

      setRoster(nextRoster);
      setEntries(map);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveAttendance() {
    if (!selectedClassId || !selectedSessionId) {
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${selectedClassId}/sessions/${selectedSessionId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: Object.values(entries) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save attendance");
      }
      setFeedback("Attendance saved.");
      await loadSessionDetails(selectedClassId, selectedSessionId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save attendance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Mark Attendance" description="Select a class/session, then update student attendance entries.">
      <div className="space-y-4">
        {feedback ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{feedback}</div> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Class"
            value={selectedClassId}
            options={classes.map((classItem) => ({
              value: classItem.id,
              label: `${classItem.className} (${classItem.classCode})`,
            }))}
            onChange={(event) => {
              const classId = event.target.value;
              setSelectedClassId(classId);
              const firstSessionId = classes.find((classItem) => classItem.id === classId)?.sessions[0]?.id ?? "";
              setSelectedSessionId(firstSessionId);
              setEntries({});
              setRoster([]);
              if (firstSessionId) {
                void loadSessionDetails(classId, firstSessionId);
              }
            }}
          />
          <Select
            label="Session"
            value={selectedSessionId}
            options={sessionOptions}
            onChange={(event) => {
              const sessionId = event.target.value;
              setSelectedSessionId(sessionId);
              void loadSessionDetails(selectedClassId, sessionId);
            }}
          />
        </div>

        {selectedSessionId ? (
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            onClick={() => void loadSessionDetails(selectedClassId, selectedSessionId)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load Session"}
          </button>
        ) : null}

        {roster.length > 0 ? (
          <div className="space-y-3">
            {roster.map((student) => (
              <div key={student.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                  </div>
                  <div className="w-44">
                    <Select
                      options={[
                        { value: "PRESENT", label: "Present" },
                        { value: "ABSENT", label: "Absent" },
                        { value: "EXCUSED", label: "Excused" },
                        { value: "LATE", label: "Late" },
                      ]}
                      value={entries[student.id]?.status ?? "PRESENT"}
                      onChange={(event) =>
                        setEntries((prev) => ({
                          ...prev,
                          [student.id]: {
                            studentProfileId: student.id,
                            status: event.target.value as AttendanceEntry["status"],
                            note: prev[student.id]?.note ?? "",
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <input
                  value={entries[student.id]?.note ?? ""}
                  onChange={(event) =>
                    setEntries((prev) => ({
                      ...prev,
                      [student.id]: {
                        studentProfileId: student.id,
                        status: prev[student.id]?.status ?? "PRESENT",
                        note: event.target.value,
                      },
                    }))
                  }
                  placeholder="Optional note"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              onClick={() => void onSaveAttendance()}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        ) : (
          <Badge variant="default">Choose a class session to begin.</Badge>
        )}
      </div>
    </Card>
  );
}
