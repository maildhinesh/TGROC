import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

// POST /api/events/[id]/rsvp-reminder — send RSVP reminder to members who haven't responded
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, name: true, eventDate: true, venue: true, status: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event must be published before sending reminders." }, { status: 400 });
  }

  // Find all active members who have NOT RSVPed to this event
  const alreadyRsvped = await prisma.eventRsvp.findMany({
    where: { eventId: id },
    select: { email: true },
  });
  const rsvpedEmails = new Set(alreadyRsvped.map((r) => r.email));

  const members = await prisma.user.findMany({
    where: { role: "MEMBER", status: "ACTIVE" },
    select: {
      email: true,
      name: true,
      profile: { select: { firstName: true, lastName: true } },
      notificationSettings: { select: { emailNotifications: true, eventReminders: true } },
    },
  });

  const recipients = members.filter((m) => {
    if (rsvpedEmails.has(m.email)) return false;
    const prefs = m.notificationSettings;
    return !prefs || (prefs.emailNotifications && prefs.eventReminders);
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "All active members have already responded." }, { status: 400 });
  }

  const appUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const eventUrl = `${appUrl}/events/${id}`;
  const eventDateStr = new Date(event.eventDate).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">RSVP Reminder</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;">${event.name}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi,</p>
    <p>We noticed you haven't responded to the RSVP for <strong>${event.name}</strong>. We'd love to know if you're joining us!</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:14px;color:#374151;">
        <strong>📅 Date:</strong> ${eventDateStr}
      </p>
      <p style="margin:0;font-size:14px;color:#374151;">
        <strong>📍 Venue:</strong> ${event.venue}
      </p>
    </div>

    <p>Please click the button below to let us know if you can make it.</p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${eventUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">
        RSVP Now →
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;margin-top:24px;">— TGROC Event Team</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi,

We noticed you haven't responded to the RSVP for "${event.name}". We'd love to know if you're joining us!

Date: ${eventDateStr}
Venue: ${event.venue}

Please visit the link below to let us know if you can make it:
${eventUrl}

— TGROC Event Team
  `.trim();

  const emails = recipients.map((r) => r.email);
  const emailResult = await sendEmail({
    to: emails,
    subject: `RSVP Reminder: ${event.name}`,
    html,
    text,
  });

  return NextResponse.json({
    recipientCount: emails.length,
    emailSent: emailResult.sent,
    emailError: emailResult.reason ?? null,
  });
}
