import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SchoolRole } from "@/types/next-auth";

export const SCHOOL_PARENT_ROLE: SchoolRole = "SCHOOL_PARENT";
export const SCHOOL_TEACHER_ROLE: SchoolRole = "SCHOOL_TEACHER";
export const SCHOOL_ADMIN_ROLE: SchoolRole = "SCHOOL_ADMIN";

export type SchoolAccessState = {
  id: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  membershipType: "INDIVIDUAL" | "FAMILY" | "STUDENT_INDIVIDUAL" | "STUDENT_FAMILY" | null;
  membershipExpiry: Date | null;
  schoolRoles: SchoolRole[];
};

export async function getSchoolSession() {
  return getServerSession(authOptions);
}

export async function getSchoolAccessState(userId: string): Promise<SchoolAccessState | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      membershipType: true,
      membershipExpiry: true,
      schoolRoleAssignments: {
        where: { isActive: true },
        select: { role: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    status: user.status,
    membershipType: user.membershipType,
    membershipExpiry: user.membershipExpiry,
    schoolRoles: user.schoolRoleAssignments.map((assignment) => assignment.role),
  };
}

export function hasSchoolRole(state: SchoolAccessState, role: SchoolRole) {
  return state.schoolRoles.includes(role);
}

export function hasAnySchoolRole(state: SchoolAccessState) {
  return state.schoolRoles.length > 0;
}

export function hasPaidMemberEligibility(state: SchoolAccessState) {
  if (state.status !== "ACTIVE") {
    return false;
  }

  if (!state.membershipExpiry) {
    return false;
  }

  return state.membershipExpiry >= startOfToday();
}

export function isEligibleSchoolParent(state: SchoolAccessState) {
  return hasSchoolRole(state, SCHOOL_PARENT_ROLE) && hasPaidMemberEligibility(state);
}

export function isSchoolAdmin(state: SchoolAccessState) {
  return hasSchoolRole(state, SCHOOL_ADMIN_ROLE);
}

export function isSchoolTeacher(state: SchoolAccessState) {
  return hasSchoolRole(state, SCHOOL_TEACHER_ROLE);
}

export function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
