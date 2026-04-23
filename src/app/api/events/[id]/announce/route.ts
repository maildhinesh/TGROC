import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEventAnnouncementEmails } from "@/lib/email";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];

// POST /api/events/[id]/announce — send evite announcement emails to all active members
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, name: true, eventDate: true, venue: true, posterUrl: true, status: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event must be published before sending the evite." }, { status: 400 });
  }

  const members = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      email: true,
      notificationSettings: { select: { emailNotifications: true, eventReminders: true } },
    },
  });

  const recipients = members
    .filter((m) => {
      const prefs = m.notificationSettings;
      return !prefs || (prefs.emailNotifications && prefs.eventReminders);
    })
    .map((m) => m.email as string);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No active members with email notifications enabled." }, { status: 400 });
  }

  const result = await sendEventAnnouncementEmails({
    eventId: id,
    eventName: event.name,
    eventDate: event.eventDate,
    venue: event.venue,
    posterUrl: event.posterUrl,
    recipients,
  });

  return NextResponse.json({
    recipientCount: recipients.length,
    emailSent: result.sent,
    emailError: result.reason ?? null,
  });
}
