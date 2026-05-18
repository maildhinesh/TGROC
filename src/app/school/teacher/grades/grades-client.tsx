"use client";

import { useState } from "react";
import { Badge, Card, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type ClassOption = {
  id: string;
  className: string;
  classCode: string;
  rosterSize: number;
  gradeItems: Array<{
    id: string;
    title: string;
    maxScore: number;
    assignedOn: string;
    gradedCount: number;
  }>;
};

type GradeForm = {
  title: string;
  maxScore: string;
  assignedOn: string;
  dueOn: string;
};

type StudentGradeInput = {
  studentProfileId: string;
  score: string;
  letterGrade: string;
  comment: string;
};

type Props = {
  classes: ClassOption[];
};

export default function GradesClient({ classes }: Props) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [selectedGradeItemId, setSelectedGradeItemId] = useState(classes[0]?.gradeItems[0]?.id ?? "");
  const [gradeItems, setGradeItems] = useState<ClassOption["gradeItems"]>(classes[0]?.gradeItems ?? []);
  const [gradeForm, setGradeForm] = useState<GradeForm>({
    title: "",
    maxScore: "100",
    assignedOn: new Date().toISOString().slice(0, 10),
    dueOn: "",
  });
  const [entries, setEntries] = useState<Record<string, StudentGradeInput>>({});
  const [roster, setRoster] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  async function refreshGradeItems(classId: string) {
    const res = await fetch(`/api/school/classes/${classId}/grade-items`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load grade items");
    }

    const mapped = (data.gradeItems ?? []).map((item: { id: string; title: string; maxScore: string | number; assignedOn: string; _count: { studentGrades: number } }) => ({
      id: item.id,
      title: item.title,
      maxScore: Number(item.maxScore),
      assignedOn: item.assignedOn,
      gradedCount: item._count.studentGrades,
    }));
    setGradeItems(mapped);
    if (!mapped.find((item: { id: string }) => item.id === selectedGradeItemId)) {
      setSelectedGradeItemId(mapped[0]?.id ?? "");
    }
  }

  async function loadGrades(classId: string, gradeItemId: string) {
    if (!classId || !gradeItemId) {
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${classId}/grade-items/${gradeItemId}/grades`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load grades");
      }

      const nextRoster = (data.roster ?? []).map((item: { studentProfile: { id: string; firstName: string; lastName: string } }) => item.studentProfile);
      const existing = (data.gradeItem?.studentGrades ?? []) as Array<{
        studentProfile: { id: string };
        score: string | number;
        letterGrade: string | null;
        comment: string | null;
      }>;
      const map: Record<string, StudentGradeInput> = {};
      nextRoster.forEach((student: { id: string; firstName: string; lastName: string }) => {
        const matched = existing.find((entry) => entry.studentProfile.id === student.id);
        map[student.id] = {
          studentProfileId: student.id,
          score: matched ? String(matched.score) : "0",
          letterGrade: matched?.letterGrade ?? "",
          comment: matched?.comment ?? "",
        };
      });
      setRoster(nextRoster);
      setEntries(map);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateGradeItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) {
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${selectedClassId}/grade-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: gradeForm.title,
          maxScore: Number(gradeForm.maxScore),
          assignedOn: new Date(gradeForm.assignedOn).toISOString(),
          dueOn: gradeForm.dueOn ? new Date(gradeForm.dueOn).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create grade item");
      }
      await refreshGradeItems(selectedClassId);
      setGradeForm({
        title: "",
        maxScore: "100",
        assignedOn: new Date().toISOString().slice(0, 10),
        dueOn: "",
      });
      setFeedback("Grade item created.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to create grade item");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveGrades() {
    if (!selectedClassId || !selectedGradeItemId) {
      return;
    }

    setLoading(true);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/classes/${selectedClassId}/grade-items/${selectedGradeItemId}/grades`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: Object.values(entries).map((entry) => ({
            studentProfileId: entry.studentProfileId,
            score: Number(entry.score),
            letterGrade: entry.letterGrade || null,
            comment: entry.comment || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save grades");
      }
      setFeedback("Grades saved.");
      await loadGrades(selectedClassId, selectedGradeItemId);
      await refreshGradeItems(selectedClassId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save grades");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Grade Item and Score Entry" description="Create grade items and record scores for enrolled students.">
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
            const classData = classes.find((classItem) => classItem.id === classId);
            const nextItems = classData?.gradeItems ?? [];
            setGradeItems(nextItems);
            setSelectedGradeItemId(nextItems[0]?.id ?? "");
            setRoster([]);
            setEntries({});
          }}
        />

        <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateGradeItem}>
          <Input
            label="Grade item title"
            required
            value={gradeForm.title}
            onChange={(event) => setGradeForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <Input
            label="Max score"
            type="number"
            required
            value={gradeForm.maxScore}
            onChange={(event) => setGradeForm((prev) => ({ ...prev, maxScore: event.target.value }))}
          />
          <Input
            label="Assigned on"
            type="date"
            required
            value={gradeForm.assignedOn}
            onChange={(event) => setGradeForm((prev) => ({ ...prev, assignedOn: event.target.value }))}
          />
          <Input
            label="Due on"
            type="date"
            value={gradeForm.dueOn}
            onChange={(event) => setGradeForm((prev) => ({ ...prev, dueOn: event.target.value }))}
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? "Saving..." : "Create Grade Item"}
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {gradeItems.length === 0 ? (
            <Badge variant="default">No grade items available yet.</Badge>
          ) : (
            gradeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedGradeItemId(item.id);
                  void loadGrades(selectedClassId, item.id);
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedGradeItemId === item.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-600">
                  Max {item.maxScore} · Assigned {formatDate(item.assignedOn)} · {item.gradedCount} graded
                </p>
              </button>
            ))
          )}
        </div>

        {roster.length > 0 ? (
          <div className="space-y-3">
            {roster.map((student) => (
              <div key={student.id} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <Input
                    label="Score"
                    type="number"
                    value={entries[student.id]?.score ?? "0"}
                    onChange={(event) =>
                      setEntries((prev) => ({
                        ...prev,
                        [student.id]: {
                          studentProfileId: student.id,
                          score: event.target.value,
                          letterGrade: prev[student.id]?.letterGrade ?? "",
                          comment: prev[student.id]?.comment ?? "",
                        },
                      }))
                    }
                  />
                  <Input
                    label="Letter"
                    value={entries[student.id]?.letterGrade ?? ""}
                    onChange={(event) =>
                      setEntries((prev) => ({
                        ...prev,
                        [student.id]: {
                          studentProfileId: student.id,
                          score: prev[student.id]?.score ?? "0",
                          letterGrade: event.target.value,
                          comment: prev[student.id]?.comment ?? "",
                        },
                      }))
                    }
                  />
                  <Input
                    label="Comment"
                    value={entries[student.id]?.comment ?? ""}
                    onChange={(event) =>
                      setEntries((prev) => ({
                        ...prev,
                        [student.id]: {
                          studentProfileId: student.id,
                          score: prev[student.id]?.score ?? "0",
                          letterGrade: prev[student.id]?.letterGrade ?? "",
                          comment: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              onClick={() => void onSaveGrades()}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Grades"}
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
