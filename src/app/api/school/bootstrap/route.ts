import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SCHOOL_ROLES = ["SCHOOL_PARENT", "SCHOOL_TEACHER", "SCHOOL_ADMIN"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolRoles = (session.user.schoolRoles ?? []).filter((role) =>
    SCHOOL_ROLES.includes(role as (typeof SCHOOL_ROLES)[number])
  );

  const isSchoolUser = schoolRoles.length > 0;

  return NextResponse.json({
    school: {
      isSchoolUser,
      schoolRoles,
      isSchoolParent: schoolRoles.includes("SCHOOL_PARENT"),
      isSchoolTeacher: schoolRoles.includes("SCHOOL_TEACHER"),
      isSchoolAdmin: schoolRoles.includes("SCHOOL_ADMIN"),
    },
    membership: {
      role: session.user.role,
      status: session.user.status,
      membershipType: session.user.membershipType,
    },
  });
}
