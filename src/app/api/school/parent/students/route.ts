import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, isEligibleSchoolParent, unauthorized } from "@/lib/school-auth";
import { studentProfileSchema } from "@/lib/validations";

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

export async function POST(req: Request) {
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
  const parsed = studentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const student = await prisma.studentProfile.create({
    data: {
      parentUserId: session.user.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      gender: parsed.data.gender ?? null,
      emergencyContactName: parsed.data.emergencyContactName ?? null,
      emergencyContactPhone: parsed.data.emergencyContactPhone ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ student }, { status: 201 });
}
