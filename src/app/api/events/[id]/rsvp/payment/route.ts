import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const FEE_PAID_MARKER = "[FEE_PAID]";
const AMOUNT_PAID_MARKER_PREFIX = "[AMOUNT_PAID:";

function getAmountPaidFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[AMOUNT_PAID:([0-9]+(?:\.[0-9]{1,2})?)\]/);
  return match?.[1] ?? null;
}

function stripPaymentMarkers(notes: string): string {
  return notes
    .replace(FEE_PAID_MARKER, "")
    .replace(/\[AMOUNT_PAID:[0-9]+(?:\.[0-9]{1,2})?\]/g, "")
    .trim();
}

const payloadSchema = z.object({
  email: z.string().email("Valid email is required"),
  feePaid: z.boolean(),
  amountPaid: z.number().min(0).nullable().optional(),
});

// PATCH /api/events/[id]/rsvp/payment — admin-only mark fee paid/unpaid per attendee
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = payloadSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  const { email, feePaid, amountPaid } = result.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_email: { eventId: id, email: normalizedEmail } },
    select: { id: true, notes: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Cannot mark payment before RSVP is submitted." }, { status: 400 });
  }

  const baseNotes = stripPaymentMarkers(existing.notes ?? "");
  const previousAmount = getAmountPaidFromNotes(existing.notes);
  const normalizedAmount = feePaid
    ? (amountPaid ?? (previousAmount ? parseFloat(previousAmount) : 0))
    : null;

  const markers: string[] = [];
  if (feePaid) {
    markers.push(FEE_PAID_MARKER);
    markers.push(`${AMOUNT_PAID_MARKER_PREFIX}${normalizedAmount!.toFixed(2)}]`);
  }

  const nextNotes = [
    ...markers,
    baseNotes,
  ].filter(Boolean).join("\n");

  await prisma.eventRsvp.update({
    where: { id: existing.id },
    data: { notes: nextNotes || null },
  });

  return NextResponse.json({
    email: normalizedEmail,
    feePaid,
    amountPaid: normalizedAmount,
  });
}
