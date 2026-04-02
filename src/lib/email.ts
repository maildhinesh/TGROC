import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(host, port, user ? "user set" : "no user", pass ? "pass set" : "no pass");
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "TGROC <noreply@tgroc.org>";

// ---------------------------------------------------------------------------
// Generic send helper
// ---------------------------------------------------------------------------

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    return { sent: false, reason: "Email server not configured (EMAIL_HOST, EMAIL_USER, EMAIL_PASS missing)." };
  }
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      bcc: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.log("Email Sent To:", opts.to);
    return { sent: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("Email Failed To:", opts.to, "Reason:", msg);
    return { sent: false, reason: msg };
  }
}

// ---------------------------------------------------------------------------
// Welcome email — sent to a new user created by an admin
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  password: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { to, firstName, password } = opts;
  const appUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const loginUrl = `${appUrl}/auth/login`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to TGROC!</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;">Your member account is ready</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi ${firstName},</p>
    <p>An account has been created for you on the <strong>TGROC Member Portal</strong>. You can log in using the credentials below.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Email:</strong> ${to}</p>
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Password:</strong> <span style="font-family:monospace;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${password}</span></p>
    </div>
    <p style="color:#dc2626;font-size:13px;">&#9888; Please change your password after logging in for the first time.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">
        Log In to Member Portal &#8594;
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">If you have any questions, please contact a TGROC officer.</p>
    <p style="color:#6b7280;font-size:13px;">&#8212; TGROC Event Team</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${firstName},

An account has been created for you on the TGROC Member Portal.

Email: ${to}
Password: ${password}

Please change your password after logging in for the first time.

Log in here: ${loginUrl}

If you have any questions, please contact a TGROC officer.

— TGROC Event Team
  `.trim();

  return sendEmail({
    to: [to],
    subject: "Welcome to TGROC — Your Account Details",
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// Event published — announce to all active members
// ---------------------------------------------------------------------------

export async function sendEventAnnouncementEmails(opts: {
  eventId: string;
  eventName: string;
  eventDate: Date;
  venue: string;
  posterUrl?: string | null;
  recipients: string[]; // email addresses
}): Promise<{ sent: boolean; reason?: string }> {
  const { eventId, eventName, eventDate, venue, posterUrl, recipients } = opts;

  if (recipients.length === 0) return { sent: true };

  const appUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const eventUrl = `${appUrl}/events/${eventId}`;
  const eventDateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const posterRow = posterUrl
    ? `<tr><td style="padding:0 24px 20px;">
        <img src="${posterUrl}" alt="${eventName}" style="max-width:100%;border-radius:6px;display:block;" />
      </td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">New Event Announced!</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;">TGROC Member Portal</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    ${posterRow ? `<table width="100%" cellpadding="0" cellspacing="0">${posterRow}</table>` : ""}
    <h2 style="color:#1e3a5f;font-size:20px;margin:0 0 16px;">${eventName}</h2>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:14px;color:#374151;">
        <strong>&#128197; Date:</strong> ${eventDateStr}
      </p>
      <p style="margin:0;font-size:14px;color:#374151;">
        <strong>&#128205; Venue:</strong> ${venue}
      </p>
    </div>
    <p>We're excited to invite you to this upcoming TGROC event! Please click the button below to view the full details and RSVP.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${eventUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">
        View Event &amp; RSVP &#8594;
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-top:24px;">&#8212; TGROC Event Team</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
New TGROC Event: ${eventName}

Date: ${eventDateStr}
Venue: ${venue}

We're excited to invite you to this upcoming TGROC event!

View details and RSVP here: ${eventUrl}

&#8212; TGROC Event Team
  `.trim();

  // Send in batches of 50 to stay within SMTP limits
  const BATCH = 50;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const result = await sendEmail({ to: batch, subject: `New Event: ${eventName}`, html, text });
    if (!result.sent) return result;
  }
  return { sent: true };
}


