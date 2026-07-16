import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isEligibleSchoolParent, unauthorized } from "@/lib/school-auth";

export async function GET() {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!isEligibleSchoolParent(accessState)) {
    return forbidden("An active paid parent membership is required");
  }

  const students = await prisma.studentProfile.findMany({
    where: { parentUserId: session.user.id },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return NextResponse.json({ students });
}
