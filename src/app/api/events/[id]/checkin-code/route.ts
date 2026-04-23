import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { generateCheckInCode } from "@/lib/checkin-code";

// POST /api/events/[id]/checkin-code — send RSVP-specific check-in QR codes
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, name: true, eventDate: true, venue: true, status: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Event must be published before sending check-in codes." }, { status: 400 });
  }

  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: id, attending: "YES" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (rsvps.length === 0) {
    return NextResponse.json({ error: "No confirmed attendees found." }, { status: 400 });
  }

  const eventDateStr = new Date(event.eventDate).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  let sentCount = 0;
  const failed: { email: string; reason: string }[] = [];

  for (const attendee of rsvps) {
    try {
      const code = generateCheckInCode({
        eventId: id,
        email: attendee.email,
        rsvpId: attendee.id,
      });

      const qrBuffer = await QRCode.toBuffer(code, {
        errorCorrectionLevel: "M",
        width: 320,
        margin: 1,
      });
      const qrCid = `checkin-${attendee.id}@tgroc`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Your TGROC Check-in Code</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;">${event.name}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi ${attendee.name},</p>
    <p>Please show this QR code at the check-in desk on event day.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Venue:</strong> ${event.venue}</p>
    </div>

    <div style="text-align:center;margin:20px 0;">
      <img src="cid:${qrCid}" alt="Check-in QR code" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;display:inline-block;" />
      <p style="margin-top:10px;color:#6b7280;font-size:12px;word-break:break-all;">${code}</p>
    </div>

    <p style="color:#6b7280;font-size:13px;margin-top:24px;">This code is unique to your RSVP for this event.</p>
    <p style="color:#6b7280;font-size:13px;">— TGROC Event Team</p>
  </div>
</body>
</html>
      `.trim();

      const text = `
Hi ${attendee.name},

Please show your check-in QR code at the desk for ${event.name}.

Date: ${eventDateStr}
Venue: ${event.venue}

Your check-in code:
${code}

This code is unique to your RSVP.

— TGROC Event Team
      `.trim();

      const result = await sendEmail({
        to: [attendee.email],
        subject: `Your Check-in Code: ${event.name}`,
        html,
        text,
        attachments: [
          {
            filename: `tgroc-checkin-${attendee.id}.png`,
            content: qrBuffer,
            contentType: "image/png",
            cid: qrCid,
          },
        ],
      });

      if (result.sent) {
        sentCount += 1;
      } else {
        failed.push({ email: attendee.email, reason: result.reason ?? "Unknown error" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      failed.push({ email: attendee.email, reason: msg });
    }
  }

  return NextResponse.json({
    recipientCount: rsvps.length,
    sentCount,
    failedCount: failed.length,
    failed,
  });
}
