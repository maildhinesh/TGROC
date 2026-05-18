import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  forbidden,
  getSchoolAccessState,
  getSchoolSession,
  isSchoolAdmin,
  isSchoolTeacher,
  unauthorized,
} from "@/lib/school-auth";
import { campusClassroomSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSchoolSession();
  if (!session) {
    return unauthorized();
  }

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) {
    return unauthorized();
  }

  if (!isSchoolAdmin(accessState) && !isSchoolTeacher(accessState)) {
    return forbidden();
  }

  const classrooms = await prisma.campusClassroom.findMany({
    orderBy: [{ roomCode: "asc" }],
  });

  return NextResponse.json({ classrooms });
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

  if (!isSchoolAdmin(accessState)) {
    return forbidden();
  }

  const body = await req.json();
  const parsed = campusClassroomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const classroom = await prisma.campusClassroom.create({
    data: {
      roomCode: parsed.data.roomCode,
      roomName: parsed.data.roomName,
      capacity: parsed.data.capacity ?? null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ classroom }, { status: 201 });
}
