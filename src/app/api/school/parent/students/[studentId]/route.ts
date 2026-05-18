import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isEligibleSchoolParent, unauthorized } from "@/lib/school-auth";
import { studentProfileSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
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

  const body = await req.json();
  const parsed = studentProfileSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId } = await params;
  const student = await prisma.studentProfile.findFirst({
    where: {
      id: studentId,
      parentUserId: session.user.id,
    },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const updatedStudent = await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
      gender: parsed.data.gender,
      emergencyContactName: parsed.data.emergencyContactName,
      emergencyContactPhone: parsed.data.emergencyContactPhone,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ student: updatedStudent });
}
