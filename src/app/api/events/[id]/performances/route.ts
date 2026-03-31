import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const registrationSchema = z.object({
  performanceType: z.enum(["SINGING", "DANCE", "SKIT", "POEM_RECITAL", "QUIZ", "STANDUP"]),
  isGroup: z.boolean().default(false),
  programName: z.string().min(1, "Program name is required"),
  duration: z.string().min(1, "Duration is required"),
  coordinatorName: z.string().min(2, "Coordinator name is required"),
  coordinatorEmail: z.string().email("Valid email required"),
  coordinatorPhone: z.string().min(5, "WhatsApp number is required"),
  participantCount: z.number().int().min(1).max(500).optional().nullable(),
  songList: z.string().optional().nullable(),
  micCount: z.number().int().min(0).max(50).optional().nullable(),
  micType: z.enum(["STANDING", "HANDHELD"]).optional().nullable(),
  additionalDetails: z.string().optional().nullable(),
  agreedToTerms: z.boolean().refine((v) => v === true, { message: "You must agree to the terms and conditions" }),
});

// GET /api/events/[id]/performances — list registrations (Admin + Officer only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const registrations = await prisma.performanceRegistration.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ registrations });
}

// POST /api/events/[id]/performances — submit registration (public)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { status: true, performanceRegOpen: true, performanceRegDeadline: true },
  });

  if (!event || event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!event.performanceRegOpen) {
    return NextResponse.json({ error: "Performance registration is not open for this event" }, { status: 403 });
  }
  if (event.performanceRegDeadline && new Date() > event.performanceRegDeadline) {
    return NextResponse.json({ error: "Performance registration deadline has passed" }, { status: 403 });
  }

  const body = await req.json();
  const result = registrationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const data = result.data;
  const registration = await prisma.performanceRegistration.create({
    data: {
      eventId: id,
      performanceType: data.performanceType,
      isGroup: data.isGroup,
      programName: data.programName.trim(),
      duration: data.duration.trim(),
      coordinatorName: data.coordinatorName.trim(),
      coordinatorEmail: data.coordinatorEmail.trim().toLowerCase(),
      coordinatorPhone: data.coordinatorPhone.trim(),
      participantCount: data.isGroup ? (data.participantCount ?? null) : null,
      songList: data.songList?.trim() || null,
      micCount: data.performanceType !== "DANCE" ? (data.micCount ?? null) : null,
      micType: data.performanceType !== "DANCE" && data.micCount && data.micCount > 0
        ? (data.micType ?? null)
        : null,
      additionalDetails: data.additionalDetails?.trim() || null,
      agreedToTerms: true,
    },
  });

  return NextResponse.json({ registration }, { status: 201 });
}
