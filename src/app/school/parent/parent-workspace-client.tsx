"use client";

import { useMemo, useState } from "react";
import { Badge, Card, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export type ParentStudent = {
  id: string;
  parentUserId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchoolYearOption = {
  id: string;
  label: string;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
};

export type ParentEnrollment = {
  id: string;
  schoolYearId: string;
  studentProfileId: string;
  parentUserId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  withdrawnAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  schoolYear: { id: string; label: string; status: "PLANNED" | "ACTIVE" | "CLOSED" };
  studentProfile: { id: string; firstName: string; lastName: string };
  medicalInfo: null | {
    id: string;
    insuranceProviderName: string;
    insurancePolicyNumber: string;
    insuranceGroupNumber: string | null;
    insurancePhone: string | null;
    policyHolderName: string | null;
    pediatricianName: string;
    pediatricianPhone: string;
    pediatricianAddress: string | null;
    medicalNotes: string | null;
    updatedAt: string;
  };
  waivers: null | {
    id: string;
    medicalWaiverAccepted: boolean;
    medicalWaiverAcceptedAt: string | null;
    medicalWaiverVersion: number;
    mediaWaiverAccepted: boolean;
    mediaWaiverAcceptedAt: string | null;
    mediaWaiverVersion: number;
    acceptedByUserId: string;
    updatedAt: string;
  };
};

type Props = {
  initialStudents: ParentStudent[];
  initialYears: SchoolYearOption[];
  initialEnrollments: ParentEnrollment[];
  isEnrollmentEnabled: boolean;
};

type EnrollmentFormState = {
  schoolYearId: string;
  studentProfileId: string;
  insuranceProviderName: string;
  insurancePolicyNumber: string;
  insuranceGroupNumber: string;
  insurancePhone: string;
  policyHolderName: string;
  pediatricianName: string;
  pediatricianPhone: string;
  pediatricianAddress: string;
  medicalNotes: string;
  medicalWaiverVersion: string;
  mediaWaiverVersion: string;
};

function defaultEnrollmentForm(students: ParentStudent[], years: SchoolYearOption[]): EnrollmentFormState {
  return {
    schoolYearId: years[0]?.id ?? "",
    studentProfileId: students[0]?.id ?? "",
    insuranceProviderName: "",
    insurancePolicyNumber: "",
    insuranceGroupNumber: "",
    insurancePhone: "",
    policyHolderName: "",
    pediatricianName: "",
    pediatricianPhone: "",
    pediatricianAddress: "",
    medicalNotes: "",
    medicalWaiverVersion: "1",
    mediaWaiverVersion: "1",
  };
}

function getBadgeVariant(status: ParentEnrollment["status"]): "default" | "warning" | "danger" | "success" | "info" {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") return "info";
  if (status === "WITHDRAWN") return "default";
  return "warning";
}

export default function ParentWorkspaceClient({ initialStudents, initialYears, initialEnrollments, isEnrollmentEnabled }: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [years] = useState(initialYears);
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });

  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentFormState>(
    defaultEnrollmentForm(initialStudents, initialYears)
  );

  const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);

  const editingEnrollment = useMemo(
    () => enrollments.find((enrollment) => enrollment.id === editingEnrollmentId) ?? null,
    [editingEnrollmentId, enrollments]
  );

  async function refreshEnrollments() {
    const res = await fetch("/api/school/enrollments", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to refresh enrollments");
    }
    const data = (await res.json()) as { enrollments: ParentEnrollment[] };
    setEnrollments(data.enrollments);
  }

  async function refreshStudents() {
    const res = await fetch("/api/school/parent/students", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to refresh students");
    }
    const data = (await res.json()) as { students: ParentStudent[] };
    setStudents(data.students);
  }

  async function onCreateStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("create-student");
    setFeedback("");
    try {
      const res = await fetch("/api/school/parent/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: studentForm.firstName,
          lastName: studentForm.lastName,
          dateOfBirth: studentForm.dateOfBirth,
          gender: studentForm.gender || null,
          emergencyContactName: studentForm.emergencyContactName || null,
          emergencyContactPhone: studentForm.emergencyContactPhone || null,
          notes: studentForm.notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create student");
      }

      await refreshStudents();
      setStudentForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        notes: "",
      });
      setFeedback("Student profile created.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to create student");
    } finally {
      setLoading(null);
    }
  }

  async function onCreateEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("create-enrollment");
    setFeedback("");
    try {
      const res = await fetch("/api/school/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolYearId: enrollmentForm.schoolYearId,
          studentProfileId: enrollmentForm.studentProfileId,
          medicalInfo: {
            insuranceProviderName: enrollmentForm.insuranceProviderName,
            insurancePolicyNumber: enrollmentForm.insurancePolicyNumber,
            insuranceGroupNumber: enrollmentForm.insuranceGroupNumber || null,
            insurancePhone: enrollmentForm.insurancePhone || null,
            policyHolderName: enrollmentForm.policyHolderName || null,
            pediatricianName: enrollmentForm.pediatricianName,
            pediatricianPhone: enrollmentForm.pediatricianPhone,
            pediatricianAddress: enrollmentForm.pediatricianAddress || null,
            medicalNotes: enrollmentForm.medicalNotes || null,
          },
          waivers: {
            medicalWaiverAccepted: true,
            medicalWaiverVersion: Number(enrollmentForm.medicalWaiverVersion),
            mediaWaiverAccepted: true,
            mediaWaiverVersion: Number(enrollmentForm.mediaWaiverVersion),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create enrollment");
      }

      await refreshEnrollments();
      setEnrollmentForm(defaultEnrollmentForm(students, years));
      setFeedback("Enrollment draft created.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to create enrollment");
    } finally {
      setLoading(null);
    }
  }

  async function onSubmitEnrollment(enrollmentId: string) {
    setLoading(`submit-${enrollmentId}`);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/enrollments/${enrollmentId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit enrollment");
      }
      await refreshEnrollments();
      setFeedback("Enrollment submitted for review.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to submit enrollment");
    } finally {
      setLoading(null);
    }
  }

  async function onWithdrawEnrollment(enrollmentId: string) {
    setLoading(`withdraw-${enrollmentId}`);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/enrollments/${enrollmentId}/withdraw`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to withdraw enrollment");
      }
      await refreshEnrollments();
      setFeedback("Enrollment withdrawn.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to withdraw enrollment");
    } finally {
      setLoading(null);
    }
  }

  async function onUpdateEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEnrollment) {
      return;
    }

    setLoading(`update-${editingEnrollment.id}`);
    setFeedback("");
    try {
      const res = await fetch(`/api/school/enrollments/${editingEnrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicalInfo: {
            insuranceProviderName: enrollmentForm.insuranceProviderName,
            insurancePolicyNumber: enrollmentForm.insurancePolicyNumber,
            insuranceGroupNumber: enrollmentForm.insuranceGroupNumber || null,
            insurancePhone: enrollmentForm.insurancePhone || null,
            policyHolderName: enrollmentForm.policyHolderName || null,
            pediatricianName: enrollmentForm.pediatricianName,
            pediatricianPhone: enrollmentForm.pediatricianPhone,
            pediatricianAddress: enrollmentForm.pediatricianAddress || null,
            medicalNotes: enrollmentForm.medicalNotes || null,
          },
          waivers: {
            medicalWaiverAccepted: true,
            medicalWaiverVersion: Number(enrollmentForm.medicalWaiverVersion),
            mediaWaiverAccepted: true,
            mediaWaiverVersion: Number(enrollmentForm.mediaWaiverVersion),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update enrollment");
      }

      await refreshEnrollments();
      setEditingEnrollmentId(null);
      setEnrollmentForm(defaultEnrollmentForm(students, years));
      setFeedback("Enrollment draft updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to update enrollment");
    } finally {
      setLoading(null);
    }
  }

  function beginEdit(enrollment: ParentEnrollment) {
    setEditingEnrollmentId(enrollment.id);
    setEnrollmentForm({
      schoolYearId: enrollment.schoolYearId,
      studentProfileId: enrollment.studentProfileId,
      insuranceProviderName: enrollment.medicalInfo?.insuranceProviderName ?? "",
      insurancePolicyNumber: enrollment.medicalInfo?.insurancePolicyNumber ?? "",
      insuranceGroupNumber: enrollment.medicalInfo?.insuranceGroupNumber ?? "",
      insurancePhone: enrollment.medicalInfo?.insurancePhone ?? "",
      policyHolderName: enrollment.medicalInfo?.policyHolderName ?? "",
      pediatricianName: enrollment.medicalInfo?.pediatricianName ?? "",
      pediatricianPhone: enrollment.medicalInfo?.pediatricianPhone ?? "",
      pediatricianAddress: enrollment.medicalInfo?.pediatricianAddress ?? "",
      medicalNotes: enrollment.medicalInfo?.medicalNotes ?? "",
      medicalWaiverVersion: String(enrollment.waivers?.medicalWaiverVersion ?? 1),
      mediaWaiverVersion: String(enrollment.waivers?.mediaWaiverVersion ?? 1),
    });
  }

  const studentOptions = students.map((student) => ({
    value: student.id,
    label: `${student.firstName} ${student.lastName}`,
  }));

  const yearOptions = years.map((year) => ({
    value: year.id,
    label: `${year.label} (${year.status})`,
  }));

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{feedback}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Student Profiles" description="Create and maintain student profiles for enrollment.">
          <form className="space-y-3" onSubmit={onCreateStudent}>
            <Input
              label="First name"
              required
              value={studentForm.firstName}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
            <Input
              label="Last name"
              required
              value={studentForm.lastName}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
            <Input
              label="Date of birth"
              type="date"
              required
              value={studentForm.dateOfBirth}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            />
            <Input
              label="Gender"
              value={studentForm.gender}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, gender: event.target.value }))}
            />
            <Input
              label="Emergency contact name"
              value={studentForm.emergencyContactName}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, emergencyContactName: event.target.value }))}
            />
            <Input
              label="Emergency contact phone"
              value={studentForm.emergencyContactPhone}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, emergencyContactPhone: event.target.value }))}
            />
            <Input
              label="Notes"
              value={studentForm.notes}
              onChange={(event) => setStudentForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              disabled={loading === "create-student"}
            >
              {loading === "create-student" ? "Saving..." : "Create Student"}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {students.map((student) => (
              <div key={student.id} className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-gray-600">DOB {formatDate(student.dateOfBirth)}</p>
              </div>
            ))}
          </div>
        </Card>

        {isEnrollmentEnabled ? (
          <Card title={editingEnrollment ? "Edit Enrollment Draft" : "Create Enrollment Draft"} description="Draft and update enrollment medical/waiver details.">
          <form className="space-y-3" onSubmit={editingEnrollment ? onUpdateEnrollment : onCreateEnrollment}>
            <Select
              label="School year"
              required
              value={enrollmentForm.schoolYearId}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, schoolYearId: event.target.value }))}
              options={yearOptions}
            />
            <Select
              label="Student"
              required
              value={enrollmentForm.studentProfileId}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, studentProfileId: event.target.value }))}
              options={studentOptions}
            />
            <Input
              label="Insurance provider"
              required
              value={enrollmentForm.insuranceProviderName}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, insuranceProviderName: event.target.value }))}
            />
            <Input
              label="Insurance policy number"
              required
              value={enrollmentForm.insurancePolicyNumber}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, insurancePolicyNumber: event.target.value }))}
            />
            <Input
              label="Pediatrician name"
              required
              value={enrollmentForm.pediatricianName}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, pediatricianName: event.target.value }))}
            />
            <Input
              label="Pediatrician phone"
              required
              value={enrollmentForm.pediatricianPhone}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, pediatricianPhone: event.target.value }))}
            />
            <Input
              label="Medical waiver version"
              type="number"
              required
              value={enrollmentForm.medicalWaiverVersion}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, medicalWaiverVersion: event.target.value }))}
            />
            <Input
              label="Media waiver version"
              type="number"
              required
              value={enrollmentForm.mediaWaiverVersion}
              onChange={(event) => setEnrollmentForm((prev) => ({ ...prev, mediaWaiverVersion: event.target.value }))}
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              disabled={loading === "create-enrollment" || loading === `update-${editingEnrollment?.id ?? ""}`}
            >
              {editingEnrollment
                ? loading === `update-${editingEnrollment.id}`
                  ? "Updating..."
                  : "Update Draft"
                : loading === "create-enrollment"
                  ? "Creating..."
                  : "Create Draft"}
            </button>
            {editingEnrollment ? (
              <button
                type="button"
                className="ml-2 rounded-lg border border-gray-300 px-4 py-2 text-sm"
                onClick={() => {
                  setEditingEnrollmentId(null);
                  setEnrollmentForm(defaultEnrollmentForm(students, years));
                }}
              >
                Cancel Edit
              </button>
            ) : null}
          </form>
        </Card>
        ) : (
          <Card title="Student Enrollment" description="Enrollment is not currently available.">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p>Student enrollment for Tamil School is not currently open. Please check back later or contact the school administrator.</p>
            </div>
          </Card>
        )}
      </div>

      {isEnrollmentEnabled && (
        <Card title="My Enrollments" description="Submit drafts, edit rejected drafts, or withdraw active enrollments.">
        <div className="space-y-3">
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No enrollments yet.</p>
          ) : (
            enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {enrollment.studentProfile.firstName} {enrollment.studentProfile.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{enrollment.schoolYear.label}</p>
                    {enrollment.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-700">Reason: {enrollment.rejectionReason}</p>
                    ) : null}
                  </div>
                  <Badge variant={getBadgeVariant(enrollment.status)}>{enrollment.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(enrollment.status === "DRAFT" || enrollment.status === "REJECTED") ? (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                        onClick={() => beginEdit(enrollment)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={() => onSubmitEnrollment(enrollment.id)}
                        disabled={loading === `submit-${enrollment.id}`}
                      >
                        {loading === `submit-${enrollment.id}` ? "Submitting..." : "Submit"}
                      </button>
                    </>
                  ) : null}

                  {enrollment.status !== "WITHDRAWN" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => onWithdrawEnrollment(enrollment.id)}
                      disabled={loading === `withdraw-${enrollment.id}`}
                    >
                      {loading === `withdraw-${enrollment.id}` ? "Withdrawing..." : "Withdraw"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      )}
    </div>
  );
}
