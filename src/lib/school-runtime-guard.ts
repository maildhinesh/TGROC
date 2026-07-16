import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const REQUIRED_SCHOOL_DELEGATES = [
  "schoolEnrollmentSettings",
  "schoolYear",
  "schoolEnrollment",
  "studentProfile",
  "familyMember",
  "schoolClass",
  "classTeacherAssignment",
  "classStudentAssignment",
  "campusClassroom",
  "classSession",
  "studentAttendance",
  "gradeItem",
  "studentGrade",
] as const;

function hasDelegate(modelName: string) {
  const prismaAny = prisma as unknown as Record<string, unknown>;
  return typeof prismaAny[modelName] === "object" && prismaAny[modelName] !== null;
}

export function isSchoolRuntimeReady() {
  return REQUIRED_SCHOOL_DELEGATES.every((modelName) => hasDelegate(modelName));
}

export function ensureSchoolRuntimeApiReady() {
  if (isSchoolRuntimeReady()) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "School features are temporarily unavailable because the Prisma client is out of date. Regenerate Prisma client and redeploy.",
      code: "SCHOOL_RUNTIME_NOT_READY",
    },
    { status: 503 }
  );
}
