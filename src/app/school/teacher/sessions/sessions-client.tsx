"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type ClassOption = {
  id: string;
  className: string;
  classCode: string;
};

type ClassroomOption = {
  id: string;
  roomCode: string;
  roomName: string;
  isActive: boolean;
};

type SessionItem = {
  id: string;
  calendarDate: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  classroom: {
    id: string;
    roomCode: string;
    roomName: string;
  };
  attendanceCount: number;
};

type Props = {
  classes: ClassOption[];
  classrooms: ClassroomOption[];
};

export default function SessionsClient({ classes, classrooms }: Props) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    calendarDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "11:00",
    classroomId: classrooms.find((room) => room.isActive)?.id ?? classrooms[0]?.id ?? "",
    status: "SCHEDULED",
  });

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const [editForm, setEditForm] = useState({
    calendarDate: "",
    startTime: "",
    endTime: "",
    classroomId: "",
    status: "SCHEDULED",
  });

  async function loadSessions(classId: string) {
    if (!classId) {
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${classId}/sessions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load sessions");
      }
      const mapped: SessionItem[] = (data.sessions ?? []).map((sessionItem: {
        id: string;
        calendarDate: string;
        startTime: string;
        endTime: string;
        status: SessionItem["status"];
        classroom: { id: string; roomCode: string; roomName: string };
        _count: { attendanceEntries: number };
      }) => ({
        id: sessionItem.id,
        calendarDate: sessionItem.calendarDate,
        startTime: sessionItem.startTime,
        endTime: sessionItem.endTime,
        status: sessionItem.status,
        classroom: sessionItem.classroom,
        attendanceCount: sessionItem._count.attendanceEntries,
      }));
      setSessions(mapped);
      setSelectedSessionId(mapped[0]?.id ?? "");
      if (mapped[0]) {
        setEditForm({
          calendarDate: mapped[0].calendarDate.slice(0, 10),
          startTime: mapped[0].startTime.slice(11, 16),
          endTime: mapped[0].endTime.slice(11, 16),
          classroomId: mapped[0].classroom.id,
          status: mapped[0].status,
        });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  function toIso(dateValue: string, timeValue: string) {
    return new Date(`${dateValue}T${timeValue}:00`).toISOString();
  }

  async function onCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) {
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${selectedClassId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarDate: new Date(createForm.calendarDate).toISOString(),
          startTime: toIso(createForm.calendarDate, createForm.startTime),
          endTime: toIso(createForm.calendarDate, createForm.endTime),
          classroomId: createForm.classroomId,
          status: createForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create session");
      }
      setFeedback("Session created.");
      await loadSessions(selectedClassId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  async function onUpdateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId || !selectedSessionId) {
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${selectedClassId}/sessions/${selectedSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarDate: new Date(editForm.calendarDate).toISOString(),
          startTime: toIso(editForm.calendarDate, editForm.startTime),
          endTime: toIso(editForm.calendarDate, editForm.endTime),
          classroomId: editForm.classroomId,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update session");
      }
      setFeedback("Session updated.");
      await loadSessions(selectedClassId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to update session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Session Scheduling" description="Create and update class session schedules and room assignments.">
      <div className="space-y-4">
        {feedback ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{feedback}</div> : null}

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
            setSessions([]);
            setSelectedSessionId("");
            void loadSessions(classId);
          }}
        />

        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateSession}>
          <Input
            label="Calendar date"
            type="date"
            required
            value={createForm.calendarDate}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, calendarDate: event.target.value }))}
          />
          <Select
            label="Classroom"
            value={createForm.classroomId}
            options={classrooms.filter((room) => room.isActive).map((room) => ({
              value: room.id,
              label: `${room.roomCode} - ${room.roomName}`,
            }))}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, classroomId: event.target.value }))}
          />
          <Input
            label="Start time"
            type="time"
            required
            value={createForm.startTime}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
          <Input
            label="End time"
            type="time"
            required
            value={createForm.endTime}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white" disabled={loading}>
              {loading ? "Saving..." : "Create Session"}
            </button>
          </div>
        </form>

        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          onClick={() => void loadSessions(selectedClassId)}
          disabled={loading || !selectedClassId}
        >
          {loading ? "Loading..." : "Load Sessions"}
        </button>

        <div className="space-y-2">
          {sessions.map((sessionItem) => (
            <button
              key={sessionItem.id}
              type="button"
              className={`w-full rounded-lg border p-3 text-left ${selectedSessionId === sessionItem.id ? "border-cyan-300 bg-cyan-50" : "border-gray-200"}`}
              onClick={() => {
                setSelectedSessionId(sessionItem.id);
                setEditForm({
                  calendarDate: sessionItem.calendarDate.slice(0, 10),
                  startTime: sessionItem.startTime.slice(11, 16),
                  endTime: sessionItem.endTime.slice(11, 16),
                  classroomId: sessionItem.classroom.id,
                  status: sessionItem.status,
                });
              }}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{formatDate(sessionItem.calendarDate)}</p>
                <Badge variant={sessionItem.status === "SCHEDULED" ? "info" : sessionItem.status === "COMPLETED" ? "success" : "danger"}>{sessionItem.status}</Badge>
              </div>
              <p className="text-xs text-gray-600">{sessionItem.classroom.roomCode} · {sessionItem.classroom.roomName}</p>
              <p className="mt-1 text-xs text-gray-500">Attendance entries: {sessionItem.attendanceCount}</p>
            </button>
          ))}
        </div>

        {selectedSession ? (
          <form className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-2" onSubmit={onUpdateSession}>
            <Input
              label="Calendar date"
              type="date"
              required
              value={editForm.calendarDate}
              onChange={(event) => setEditForm((prev) => ({ ...prev, calendarDate: event.target.value }))}
            />
            <Select
              label="Status"
              value={editForm.status}
              options={[
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
            />
            <Input
              label="Start time"
              type="time"
              required
              value={editForm.startTime}
              onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
            />
            <Input
              label="End time"
              type="time"
              required
              value={editForm.endTime}
              onChange={(event) => setEditForm((prev) => ({ ...prev, endTime: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Select
                label="Classroom"
                value={editForm.classroomId}
                options={classrooms.filter((room) => room.isActive).map((room) => ({
                  value: room.id,
                  label: `${room.roomCode} - ${room.roomName}`,
                }))}
                onChange={(event) => setEditForm((prev) => ({ ...prev, classroomId: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white" disabled={loading}>
                {loading ? "Saving..." : "Update Session"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
