import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

const reminderSchema = z.object({
  message: z.string().optional(),
});

// GET /api/events/[id]/fee-reminder — list past reminders
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reminders = await prisma.eventFeeReminder.findMany({
    where: { eventId: id },
    orderBy: { sentAt: "desc" },
    include: {
      sentBy: {
        select: { profile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  return NextResponse.json({ reminders });
}

// POST /api/events/[id]/fee-reminder — send fee payment reminder to all YES RSVPs
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const result = reminderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Fetch event + pricing
  const event = await prisma.event.findUnique({
    where: { id },
    include: { pricing: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Only remind if event has fees set
  if (!event.pricing || event.pricing.isFree) {
    return NextResponse.json({ error: "This event has no entry fees configured." }, { status: 400 });
  }

  // Get RSVPs with attending = YES
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: id, attending: "YES" },
    select: { name: true, email: true, adultCount: true, kidCount: true },
  });

  if (rsvps.length === 0) {
    return NextResponse.json({ error: "No confirmed RSVPs to remind." }, { status: 400 });
  }

  const pricing = event.pricing;
  const isFamilyFee = pricing.feeType === "FAMILY";

  // Build fee breakdown for the email
  const familyLines: string[] = [];
  const individualLines: string[] = [];

  if (isFamilyFee) {
    if (pricing.memberFamilyFee !== null)
      familyLines.push(`Member family: $${Number(pricing.memberFamilyFee).toFixed(2)}`);
    if (pricing.nonMemberFamilyFee !== null)
      familyLines.push(`Non-member family: $${Number(pricing.nonMemberFamilyFee).toFixed(2)}`);
  }
  if (pricing.memberAdultFee !== null)
    individualLines.push(`Member adult (15+): $${Number(pricing.memberAdultFee).toFixed(2)}`);
  if (pricing.nonMemberAdultFee !== null)
    individualLines.push(`Non-member adult (15+): $${Number(pricing.nonMemberAdultFee).toFixed(2)}`);
  if (pricing.memberKidFee !== null)
    individualLines.push(`Member child (under 15): $${Number(pricing.memberKidFee).toFixed(2)}`);
  if (pricing.nonMemberKidFee !== null)
    individualLines.push(`Non-member child (under 15): $${Number(pricing.nonMemberKidFee).toFixed(2)}`);

  const studentLines: string[] = [];
  if (pricing.studentMemberFee !== null)
    studentLines.push(`Student member: $${Number(pricing.studentMemberFee).toFixed(2)}`);
  if (pricing.studentNonMemberFee !== null)
    studentLines.push(`Student non-member: $${Number(pricing.studentNonMemberFee).toFixed(2)}`);

  const feeLines = [...familyLines, ...individualLines, ...studentLines];

  const eventDateStr = new Date(event.eventDate).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const customMessage = result.data.message?.trim() ?? "";

  const buildHtml = (rsvpName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Entry Fee Reminder</h1>
    <p style="color:#c7d2fe;margin:8px 0 0;">${event.name}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi ${rsvpName},</p>
    <p>This is a friendly reminder that <strong>${event.name}</strong> on <strong>${eventDateStr}</strong> at <em>${event.venue}</em> has an entry fee.</p>

    <div style="background:#f5f3ff;border:1px solid #ede9fe;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 8px;color:#4f46e5;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">Entry Fee Structure</h3>
      ${isFamilyFee && familyLines.length > 0 ? `<p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Family</p>${familyLines.map((l) => `<p style="margin:2px 0;font-size:15px;">${l}</p>`).join("")}` : ""}
      ${individualLines.length > 0 ? `${isFamilyFee ? '<p style="margin:8px 0 4px;font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Individual</p>' : ""} ${individualLines.map((l) => `<p style="margin:2px 0;font-size:15px;">${l}</p>`).join("")}` : ""}
      ${studentLines.length > 0 ? `<p style="margin:8px 0 4px;font-size:11px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Student</p>${studentLines.map((l) => `<p style="margin:2px 0;font-size:15px;">${l}</p>`).join("")}` : ""}
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Adults are 15+ years, kids are under 15.</p>
    </div>

    ${customMessage ? `<p style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;">${customMessage}</p>` : ""}

    ${pricing.notes ? `<p style="color:#6b7280;font-size:13px;">${pricing.notes}</p>` : ""}

    <p>Please arrange payment at the venue or as instructed by the organizers. If you have any questions, reply to this email or contact a TGROC officer.</p>

    <p style="color:#6b7280;font-size:13px;margin-top:24px;">— TGROC Event Team</p>
  </div>
</body>
</html>
  `.trim();

  const buildText = (rsvpName: string) => `
Hi ${rsvpName},

This is a friendly reminder that "${event.name}" on ${eventDateStr} at ${event.venue} has an entry fee.

Entry Fee Structure:
${isFamilyFee && familyLines.length > 0 ? `FAMILY:\n${familyLines.join("\n")}` : ""}
${individualLines.length > 0 ? `${isFamilyFee ? "\nINDIVIDUAL:\n" : ""}${individualLines.join("\n")}` : ""}
${studentLines.length > 0 ? `\nSTUDENT:\n${studentLines.join("\n")}` : ""}
Adults are 15+ years, kids are under 15.

${customMessage ? `\nNote: ${customMessage}\n` : ""}
${pricing.notes ? `\n${pricing.notes}\n` : ""}

Please arrange payment at the venue or as instructed by the organizers.

— TGROC Event Team
  `.trim();

  // Send individual emails (BCC per person to avoid exposure of all recipients)
  const emails = rsvps.map((r) => r.email);
  const subject = `Entry Fee Reminder: ${event.name}`;

  // Use BCC for bulk — build a generic email
  const emailResult = await sendEmail({
    to: emails,
    subject,
    html: buildHtml("valued member"),
    text: buildText("valued member"),
  });

  // Record the reminder regardless of whether email was sent
  const reminder = await prisma.eventFeeReminder.create({
    data: {
      eventId: id,
      sentById: session.user.id,
      recipientCount: emails.length,
      message: customMessage || null,
    },
  });

  return NextResponse.json({
    reminder,
    emailSent: emailResult.sent,
    recipientCount: emails.length,
    emailError: emailResult.reason ?? null,
  });
}
