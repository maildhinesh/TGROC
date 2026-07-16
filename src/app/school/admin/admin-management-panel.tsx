"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type PendingEnrollment = {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  updatedAt: string;
  schoolYear: { label: string };
  studentProfile: { firstName: string; lastName: string };
  parent: { name: string | null; email: string };
};

type YearOption = {
  id: string;
  label: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
};

type TeacherOption = {
  id: string;
  name: string | null;
  email: string;
};

type SchoolClassOption = {
  id: string;
  classCode: string;
  className: string;
  levelOrGrade: string;
  schoolYearId: string;
  schoolYearLabel: string;
  teacherAssignments: Array<{ teacherUserId: string; teacherName: string | null; teacherEmail: string }>;
  studentAssignments: Array<{ studentProfileId: string; studentName: string }>;
};

type ApprovedStudentOption = {
  id: string;
  fullName: string;
};

type Props = {
  initialPendingEnrollments: PendingEnrollment[];
  yearOptions: YearOption[];
  initialTeachers: TeacherOption[];
  initialClasses: SchoolClassOption[];
};

const badgeVariant: Record<PendingEnrollment["status"], "default" | "warning" | "danger" | "success" | "info"> = {
  DRAFT: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  APPROVED: "success",
  REJECTED: "danger",
  WITHDRAWN: "default",
};

export function AdminManagementPanel({ initialPendingEnrollments, yearOptions, initialTeachers, initialClasses }: Props) {
  const [pendingEnrollments, setPendingEnrollments] = useState(initialPendingEnrollments);
  const [teachers] = useState(initialTeachers);
  const [classes, setClasses] = useState(initialClasses);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [isLoadingApprovedStudents, setIsLoadingApprovedStudents] = useState(false);
  const [isAssigningStudents, setIsAssigningStudents] = useState(false);

  const [classroomForm, setClassroomForm] = useState({
    schoolYearId: yearOptions.find((y) => y.status !== "CLOSED")?.id ?? yearOptions[0]?.id ?? "",
    classCode: "",
    className: "",
    levelOrGrade: "",
    maxCapacity: "",
  });
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);

  const [teacherAssignmentForm, setTeacherAssignmentForm] = useState({
    classId: initialClasses[0]?.id ?? "",
    teacherUserId: initialTeachers[0]?.id ?? "",
  });

  const [studentAssignmentForm, setStudentAssignmentForm] = useState({
    classId: initialClasses[0]?.id ?? "",
    selectedStudentIds: [] as string[],
  });
  const [approvedStudents, setApprovedStudents] = useState<ApprovedStudentOption[]>([]);

  const selectedClassForTeacher = classes.find((c) => c.id === teacherAssignmentForm.classId) ?? null;
  const selectedClassForStudents = classes.find((c) => c.id === studentAssignmentForm.classId) ?? null;

  useEffect(() => {
    if (!studentAssignmentForm.classId) {
      return;
    }
    void loadApprovedStudentsForSelectedClass(studentAssignmentForm.classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentAssignmentForm.classId]);

  async function reviewEnrollment(enrollmentId: string, decision: "APPROVED" | "REJECTED") {
    setActionLoadingId(enrollmentId);
    setFeedback(null);
    try {
      let rejectionReason: string | null = null;
      if (decision === "REJECTED") {
        const reason = window.prompt("Please enter a rejection reason:");
        if (!reason || !reason.trim()) {
          setActionLoadingId(null);
          setFeedback({ type: "error", text: "Rejection reason is required." });
          return;
        }
        rejectionReason = reason.trim();
      }

      const res = await fetch(`/api/school/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to review enrollment");
      }

      setPendingEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
      setFeedback({
        type: "success",
        text: decision === "APPROVED" ? "Enrollment approved." : "Enrollment rejected.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to review enrollment",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function createClassroom(event: React.FormEvent) {
    event.preventDefault();
    setIsCreatingClassroom(true);
    setFeedback(null);

    try {
      const payload = {
        schoolYearId: classroomForm.schoolYearId,
        classCode: classroomForm.classCode,
        className: classroomForm.className,
        levelOrGrade: classroomForm.levelOrGrade,
        maxCapacity: classroomForm.maxCapacity ? Number(classroomForm.maxCapacity) : null,
      };

      const res = await fetch(`/api/school/years/${classroomForm.schoolYearId}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create classroom");
      }

      const createdClass = data.class as {
        id: string;
        classCode: string;
        className: string;
        levelOrGrade: string;
        schoolYearId: string;
      };
      const year = yearOptions.find((y) => y.id === classroomForm.schoolYearId);
      if (year) {
        const newClass: SchoolClassOption = {
          id: createdClass.id,
          classCode: createdClass.classCode,
          className: createdClass.className,
          levelOrGrade: createdClass.levelOrGrade,
          schoolYearId: createdClass.schoolYearId,
          schoolYearLabel: year.label,
          teacherAssignments: [],
          studentAssignments: [],
        };
        setClasses((prev) => [newClass, ...prev]);
        setTeacherAssignmentForm((prev) => ({ ...prev, classId: prev.classId || newClass.id }));
        setStudentAssignmentForm((prev) => ({ ...prev, classId: prev.classId || newClass.id }));
      }

      setClassroomForm((prev) => ({ ...prev, classCode: "", className: "", levelOrGrade: "", maxCapacity: "" }));
      setFeedback({ type: "success", text: "Classroom created successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create classroom",
      });
    } finally {
      setIsCreatingClassroom(false);
    }
  }

  async function assignTeacherToClass(event: React.FormEvent) {
    event.preventDefault();
    if (!teacherAssignmentForm.classId || !teacherAssignmentForm.teacherUserId) {
      setFeedback({ type: "error", text: "Select both class and teacher." });
      return;
    }

    setIsAssigningTeacher(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/school/classes/${teacherAssignmentForm.classId}/teachers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherUserIds: [teacherAssignmentForm.teacherUserId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to assign teacher");
      }

      const assignments = (data.assignments ?? []) as Array<{
        teacherUserId: string;
        teacher: { name: string | null; email: string };
      }>;

      setClasses((prev) =>
        prev.map((c) =>
          c.id === teacherAssignmentForm.classId
            ? {
                ...c,
                teacherAssignments: assignments.map((a) => ({
                  teacherUserId: a.teacherUserId,
                  teacherName: a.teacher.name,
                  teacherEmail: a.teacher.email,
                })),
              }
            : c
        )
      );
      setFeedback({ type: "success", text: "Teacher assignment updated." });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Failed to assign teacher" });
    } finally {
      setIsAssigningTeacher(false);
    }
  }

  async function loadApprovedStudentsForSelectedClass(classId: string) {
    const selectedClass = classes.find((c) => c.id === classId);
    if (!selectedClass) {
      setApprovedStudents([]);
      return;
    }

    setIsLoadingApprovedStudents(true);
    try {
      const params = new URLSearchParams({
        schoolYearId: selectedClass.schoolYearId,
        status: "APPROVED",
      });
      const res = await fetch(`/api/school/enrollments?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load approved students");
      }

      const enrollments = (data.enrollments ?? []) as Array<{
        studentProfile: { id: string; firstName: string; lastName: string };
      }>;
      const deduped = new Map<string, ApprovedStudentOption>();
      enrollments.forEach((enrollment) => {
        deduped.set(enrollment.studentProfile.id, {
          id: enrollment.studentProfile.id,
          fullName: `${enrollment.studentProfile.firstName} ${enrollment.studentProfile.lastName}`,
        });
      });
      const approved = Array.from(deduped.values());
      setApprovedStudents(approved);

      const alreadyAssigned = selectedClass.studentAssignments.map((a) => a.studentProfileId);
      setStudentAssignmentForm((prev) => ({ ...prev, selectedStudentIds: alreadyAssigned }));
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load approved students",
      });
    } finally {
      setIsLoadingApprovedStudents(false);
    }
  }

  async function assignStudentsToClass(event: React.FormEvent) {
    event.preventDefault();
    if (!studentAssignmentForm.classId) {
      setFeedback({ type: "error", text: "Select a class first." });
      return;
    }

    setIsAssigningStudents(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/school/classes/${studentAssignmentForm.classId}/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentProfileIds: studentAssignmentForm.selectedStudentIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to assign students");
      }

      const assignments = (data.assignments ?? []) as Array<{
        studentProfileId: string;
        studentProfile: { firstName: string; lastName: string };
      }>;
      setClasses((prev) =>
        prev.map((c) =>
          c.id === studentAssignmentForm.classId
            ? {
                ...c,
                studentAssignments: assignments.map((a) => ({
                  studentProfileId: a.studentProfileId,
                  studentName: `${a.studentProfile.firstName} ${a.studentProfile.lastName}`,
                })),
              }
            : c
        )
      );

      setFeedback({ type: "success", text: "Student assignments updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to assign students",
      });
    } finally {
      setIsAssigningStudents(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-lg p-3 text-sm ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <Card title="Create Classroom" description="Quickly add a new classroom to a school year.">
        {yearOptions.length === 0 ? (
          <p className="text-sm text-gray-500">Create a school year first to add classrooms.</p>
        ) : (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void createClassroom(event)}>
            <Select
              label="School year"
              required
              value={classroomForm.schoolYearId}
              onChange={(event) =>
                setClassroomForm((prev) => ({
                  ...prev,
                  schoolYearId: event.target.value,
                }))
              }
              options={yearOptions.map((year) => ({
                value: year.id,
                label: `${year.label} (${year.status})`,
              }))}
            />
            <Input
              label="Class code"
              required
              value={classroomForm.classCode}
              onChange={(event) =>
                setClassroomForm((prev) => ({
                  ...prev,
                  classCode: event.target.value,
                }))
              }
              placeholder="e.g. TAMIL-1"
            />
            <Input
              label="Class name"
              required
              value={classroomForm.className}
              onChange={(event) =>
                setClassroomForm((prev) => ({
                  ...prev,
                  className: event.target.value,
                }))
              }
              placeholder="e.g. Beginners Tamil"
            />
            <Input
              label="Level / Grade"
              required
              value={classroomForm.levelOrGrade}
              onChange={(event) =>
                setClassroomForm((prev) => ({
                  ...prev,
                  levelOrGrade: event.target.value,
                }))
              }
              placeholder="e.g. Grade 1"
            />
            <Input
              label="Max capacity (optional)"
              type="number"
              min={1}
              value={classroomForm.maxCapacity}
              onChange={(event) =>
                setClassroomForm((prev) => ({
                  ...prev,
                  maxCapacity: event.target.value,
                }))
              }
            />
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isCreatingClassroom}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isCreatingClassroom ? "Creating..." : "Create Classroom"}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Current Teachers" description="Active teachers currently available for classroom assignment.">
        {teachers.length === 0 ? (
          <p className="text-sm text-gray-500">No active teachers found.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="rounded-lg border border-gray-200 p-3">
                <p className="font-medium text-gray-900">{teacher.name ?? "Unnamed teacher"}</p>
                <p className="text-xs text-gray-500">{teacher.email}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Assign Teacher to Classroom" description="Choose a class and assign the active teacher.">
        {classes.length === 0 || teachers.length === 0 ? (
          <p className="text-sm text-gray-500">Create classes and ensure active teachers are available first.</p>
        ) : (
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void assignTeacherToClass(event)}>
            <Select
              label="Classroom"
              required
              value={teacherAssignmentForm.classId}
              onChange={(event) =>
                setTeacherAssignmentForm((prev) => ({
                  ...prev,
                  classId: event.target.value,
                }))
              }
              options={classes.map((cls) => ({
                value: cls.id,
                label: `${cls.classCode} - ${cls.className} (${cls.schoolYearLabel})`,
              }))}
            />
            <Select
              label="Teacher"
              required
              value={teacherAssignmentForm.teacherUserId}
              onChange={(event) =>
                setTeacherAssignmentForm((prev) => ({
                  ...prev,
                  teacherUserId: event.target.value,
                }))
              }
              options={teachers.map((teacher) => ({
                value: teacher.id,
                label: `${teacher.name ?? "Unnamed teacher"} (${teacher.email})`,
              }))}
            />
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={isAssigningTeacher}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isAssigningTeacher ? "Assigning..." : "Assign Teacher"}
              </button>
            </div>
          </form>
        )}

        {selectedClassForTeacher && (
          <div className="mt-4 rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current assigned teacher</p>
            {selectedClassForTeacher.teacherAssignments.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">No teacher assigned.</p>
            ) : (
              selectedClassForTeacher.teacherAssignments.map((assignment) => (
                <p key={assignment.teacherUserId} className="mt-1 text-sm text-gray-800">
                  {assignment.teacherName ?? "Unnamed teacher"} · {assignment.teacherEmail}
                </p>
              ))
            )}
          </div>
        )}
      </Card>

      <Card title="Assign Students to Classroom" description="Assign approved students to a class for that school year.">
        {classes.length === 0 ? (
          <p className="text-sm text-gray-500">Create a class first to assign students.</p>
        ) : (
          <form className="space-y-3" onSubmit={(event) => void assignStudentsToClass(event)}>
            <Select
              label="Classroom"
              required
              value={studentAssignmentForm.classId}
              onChange={(event) => {
                const classId = event.target.value;
                setStudentAssignmentForm((prev) => ({ ...prev, classId, selectedStudentIds: [] }));
                void loadApprovedStudentsForSelectedClass(classId);
              }}
              options={classes.map((cls) => ({
                value: cls.id,
                label: `${cls.classCode} - ${cls.className} (${cls.schoolYearLabel})`,
              }))}
            />

            {isLoadingApprovedStudents ? (
              <p className="text-sm text-gray-500">Loading approved students...</p>
            ) : approvedStudents.length === 0 ? (
              <p className="text-sm text-gray-500">
                No approved students found for this class year. Select a class to load approved students.
              </p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {approvedStudents.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={studentAssignmentForm.selectedStudentIds.includes(student.id)}
                      onChange={(event) => {
                        setStudentAssignmentForm((prev) => ({
                          ...prev,
                          selectedStudentIds: event.target.checked
                            ? [...prev.selectedStudentIds, student.id]
                            : prev.selectedStudentIds.filter((id) => id !== student.id),
                        }));
                      }}
                    />
                    <span>{student.fullName}</span>
                  </label>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isAssigningStudents}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isAssigningStudents ? "Saving..." : "Save Student Assignments"}
            </button>
          </form>
        )}

        {selectedClassForStudents && (
          <div className="mt-4 rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current students in class</p>
            {selectedClassForStudents.studentAssignments.length === 0 ? (
              <p className="mt-1 text-sm text-gray-500">No students currently assigned.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedClassForStudents.studentAssignments.map((assignment) => (
                  <span key={assignment.studentProfileId} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {assignment.studentName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Enrollment Review Queue" description="Approve or reject student enrollment submissions.">
        <div className="space-y-3">
          {pendingEnrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No enrollments need review right now.</p>
          ) : (
            pendingEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {enrollment.studentProfile.firstName} {enrollment.studentProfile.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {enrollment.schoolYear.label} · {enrollment.parent.name ?? enrollment.parent.email}
                    </p>
                  </div>
                  <Badge variant={badgeVariant[enrollment.status]}>{enrollment.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-xs text-gray-400">Updated {formatDate(enrollment.updatedAt)}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoadingId === enrollment.id}
                    onClick={() => void reviewEnrollment(enrollment.id, "APPROVED")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === enrollment.id}
                    onClick={() => void reviewEnrollment(enrollment.id, "REJECTED")}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
