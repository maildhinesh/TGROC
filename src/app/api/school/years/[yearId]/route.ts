import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { forbidden, getSchoolAccessState, getSchoolSession, hasSchoolRole, SCHOOL_ADMIN_ROLE, unauthorized } from "@/lib/school-auth";

const updateYearSchema = z.object({
  label: z.string().min(4).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "CLOSED"]).optional(),
  startsOn: z.string().date().optional(),
  endsOn: z.string().date().optional(),
  enrollmentOpenOn: z.string().date().nullable().optional(),
  enrollmentCloseOn: z.string().date().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ yearId: string }> }) {
  const session = await getSchoolSession();
  if (!session) return unauthorized();

  const accessState = await getSchoolAccessState(session.user.id);
  if (!accessState) return unauthorized();

  if (!hasSchoolRole(accessState, SCHOOL_ADMIN_ROLE)) return forbidden();

  const { yearId } = await params;

  const body = await req.json();
  const parsed = updateYearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { label, status, startsOn, endsOn, enrollmentOpenOn, enrollmentCloseOn } = parsed.data;

  // Build partial update object — only include fields that were sent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { lastUpdatedById: session.user.id };
  if (label !== undefined) data.label = label;
  if (status !== undefined) data.status = status;
  if (startsOn !== undefined) data.startsOn = new Date(startsOn);
  if (endsOn !== undefined) data.endsOn = new Date(endsOn);
  if (enrollmentOpenOn !== undefined) data.enrollmentOpenOn = enrollmentOpenOn ? new Date(enrollmentOpenOn) : null;
  if (enrollmentCloseOn !== undefined) data.enrollmentCloseOn = enrollmentCloseOn ? new Date(enrollmentCloseOn) : null;

  try {
    const year = await prisma.schoolYear.update({
      where: { id: yearId },
      data,
      select: {
        id: true,
        label: true,
        startsOn: true,
        endsOn: true,
        enrollmentOpenOn: true,
        enrollmentCloseOn: true,
        status: true,
        lastUpdatedAt: true,
        _count: { select: { enrollments: true, classes: true } },
      },
    });
    return NextResponse.json({ year });
  } catch {
    return NextResponse.json({ error: "School year not found" }, { status: 404 });
  }
}
