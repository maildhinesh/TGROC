import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// GET /api/cron/membership-reminders
// Intended to be called once daily by a scheduler (Vercel Cron, GitHub Actions, etc.)
// Secured by the CRON_SECRET environment variable.
// ---------------------------------------------------------------------------

type ReminderType = "DAYS_10" | "DAYS_5" | "DAYS_1" | "EXPIRED";

interface ReminderResult {
  sent: number;
  skipped: number;
  failed: number;
}

// Return the start (00:00:00.000) and end (23:59:59.999) of a day
// that is `offsetDays` ahead of today (local server time).
function dayRange(offsetDays: number): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Normalise a Date to midnight so it can be used as the @db.Date key
function toMidnight(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: Record<ReminderType, ReminderResult> = {
    DAYS_10: { sent: 0, skipped: 0, failed: 0 },
    DAYS_5:  { sent: 0, skipped: 0, failed: 0 },
    DAYS_1:  { sent: 0, skipped: 0, failed: 0 },
    EXPIRED: { sent: 0, skipped: 0, failed: 0 },
  };

  // ── Upcoming-expiry reminders ─────────────────────────────────────────────
  const upcomingIntervals: Array<{ offsetDays: number; type: ReminderType }> = [
    { offsetDays: 10, type: "DAYS_10" },
    { offsetDays: 5,  type: "DAYS_5"  },
    { offsetDays: 1,  type: "DAYS_1"  },
  ];

  for (const { offsetDays, type } of upcomingIntervals) {
    const { start, end } = dayRange(offsetDays);

    const users = await prisma.user.findMany({
      where: {
        membershipExpiry: { gte: start, lte: end },
        status: "ACTIVE",
      },
      include: {
        profile: { select: { firstName: true, lastName: true } },
        notificationSettings: { select: { membershipAlerts: true, emailNotifications: true } },
      },
    });

    for (const user of users) {
      if (!user.membershipExpiry) { results[type].skipped++; continue; }

      // Respect notification preferences
      const prefs = user.notificationSettings;
      if (prefs && (!prefs.emailNotifications || !prefs.membershipAlerts)) {
        results[type].skipped++;
        continue;
      }

      const expiryKey = toMidnight(user.membershipExpiry);

      // Idempotency check — skip if already sent for this expiry cycle
      const existing = await prisma.membershipExpiryReminder.findUnique({
        where: {
          userId_reminderType_expiryDate: {
            userId: user.id,
            reminderType: type,
            expiryDate: expiryKey,
          },
        },
      });
      if (existing) { results[type].skipped++; continue; }

      const name = user.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : (user.name ?? user.email ?? "Member");
      const expiryFormatted = user.membershipExpiry.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const daysLabel = offsetDays === 1 ? "tomorrow" : `in ${offsetDays} days`;

      const { html, text } = buildUpcomingEmail({ name, expiryFormatted, daysLabel, offsetDays });
      const emailResult = await sendEmail({
        to: [user.email as string],
        subject: `Your TGROC membership expires ${daysLabel}`,
        html,
        text,
      });

      await prisma.membershipExpiryReminder.create({
        data: {
          userId: user.id,
          reminderType: type,
          expiryDate: expiryKey,
          emailSent: emailResult.sent,
          emailError: emailResult.reason ?? null,
        },
      });

      if (emailResult.sent) results[type].sent++;
      else results[type].failed++;
    }
  }

  // ── Expired-today reminder ────────────────────────────────────────────────
  const { start: todayStart, end: todayEnd } = dayRange(0);

  const expiredUsers = await prisma.user.findMany({
    where: {
      membershipExpiry: { gte: todayStart, lte: todayEnd },
      status: "ACTIVE",
    },
    include: {
      profile: { select: { firstName: true, lastName: true } },
      notificationSettings: { select: { membershipAlerts: true, emailNotifications: true } },
    },
  });

  for (const user of expiredUsers) {
    if (!user.membershipExpiry) { results.EXPIRED.skipped++; continue; }

    const prefs = user.notificationSettings;
    if (prefs && (!prefs.emailNotifications || !prefs.membershipAlerts)) {
      results.EXPIRED.skipped++;
      continue;
    }

    const expiryKey = toMidnight(user.membershipExpiry);

    const existing = await prisma.membershipExpiryReminder.findUnique({
      where: {
        userId_reminderType_expiryDate: {
          userId: user.id,
          reminderType: "EXPIRED",
          expiryDate: expiryKey,
        },
      },
    });
    if (existing) { results.EXPIRED.skipped++; continue; }

    const name = user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : (user.name ?? user.email ?? "Member");
    const expiryFormatted = user.membershipExpiry.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const { html, text } = buildExpiredEmail({ name, expiryFormatted });
    const emailResult = await sendEmail({
      to: [user.email as string],
      subject: "Your TGROC membership has expired",
      html,
      text,
    });

    await prisma.membershipExpiryReminder.create({
      data: {
        userId: user.id,
        reminderType: "EXPIRED",
        expiryDate: expiryKey,
        emailSent: emailResult.sent,
        emailError: emailResult.reason ?? null,
      },
    });

    if (emailResult.sent) results.EXPIRED.sent++;
    else results.EXPIRED.failed++;
  }

  return NextResponse.json({ ok: true, results });
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function buildUpcomingEmail(opts: {
  name: string;
  expiryFormatted: string;
  daysLabel: string;
  offsetDays: number;
}): { html: string; text: string } {
  const { name, expiryFormatted, daysLabel, offsetDays } = opts;
  const urgencyColour = offsetDays === 1 ? "#dc2626" : offsetDays === 5 ? "#d97706" : "#2563eb";
  const calloutBg     = offsetDays === 1 ? "#fef2f2" : offsetDays === 5 ? "#fffbeb" : "#eff6ff";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Membership Expiry Reminder</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">TGROC Member Portal</h1>
            <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">Tamils of Greater Rochester</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin:0 0 16px;">Dear ${name},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              This is a friendly reminder that your TGROC membership is expiring <strong>${daysLabel}</strong>,
              on <strong>${expiryFormatted}</strong>.
            </p>
            <!-- Callout box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:${calloutBg};border-left:4px solid ${urgencyColour};border-radius:4px;padding:16px 20px;">
                  <p style="margin:0;color:${urgencyColour};font-weight:bold;font-size:15px;">
                    Membership expires: ${expiryFormatted}
                  </p>
                  <p style="margin:6px 0 0;color:#374151;font-size:13px;">
                    Renew before the expiry date to preserve your member benefits without interruption.
                  </p>
                </td>
              </tr>
            </table>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              As an active member you enjoy discounted event entry fees, voting rights, and access to
              member-only resources. Don't let your membership lapse!
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px;">
              Please log in to the member portal to renew your membership or contact an office bearer
              if you have any questions.
            </p>
            <p style="color:#6b7280;font-size:13px;margin:0;">
              If you believe you received this email in error, please ignore it or contact us at
              <a href="mailto:info@tgroc.org" style="color:#2563eb;">info@tgroc.org</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Tamils of Greater Rochester. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Dear ${name},

Your TGROC membership is expiring ${daysLabel}, on ${expiryFormatted}.

Please renew before the expiry date to preserve your member benefits without interruption.

As an active member you enjoy discounted event entry fees, voting rights, and access to member-only resources.

Log in to the member portal to renew your membership or contact an office bearer if you have any questions.

-- TGROC Member Portal`;

  return { html, text };
}

function buildExpiredEmail(opts: { name: string; expiryFormatted: string }): { html: string; text: string } {
  const { name, expiryFormatted } = opts;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Membership Expired</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">TGROC Member Portal</h1>
            <p style="color:#93c5fd;margin:6px 0 0;font-size:13px;">Tamils of Greater Rochester</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#374151;font-size:16px;margin:0 0 16px;">Dear ${name},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Your TGROC membership <strong>expired on ${expiryFormatted}</strong>.
            </p>
            <!-- Callout box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;padding:16px 20px;">
                  <p style="margin:0;color:#dc2626;font-weight:bold;font-size:15px;">
                    Your membership has expired
                  </p>
                  <p style="margin:6px 0 0;color:#374151;font-size:13px;">
                    Your member privileges — including discounted event fees, voting rights, and
                    member-only access — have been suspended until you renew.
                  </p>
                </td>
              </tr>
            </table>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              We value your membership and would love to have you continue as part of the TGROC community.
              Please renew your membership through the member portal or reach out to an office bearer
              at your earliest convenience.
            </p>
            <p style="color:#6b7280;font-size:13px;margin:0;">
              If you have already renewed or believe this message is in error, please contact us at
              <a href="mailto:info@tgroc.org" style="color:#2563eb;">info@tgroc.org</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Tamils of Greater Rochester. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Dear ${name},

Your TGROC membership expired on ${expiryFormatted}.

Your member privileges — including discounted event fees, voting rights, and member-only access — have been suspended until you renew.

We value your membership and would love to have you continue as part of the TGROC community. Please renew your membership through the member portal or reach out to an office bearer at your earliest convenience.

If you have already renewed or believe this message is in error, please contact us at info@tgroc.org.

-- TGROC Member Portal`;

  return { html, text };
}
