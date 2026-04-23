import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RowError = { row: number; error: string };
type ParsedCsvRow = {
  row: number;
  name: string;
  email: string;
  phone: string | null;
  attending: "YES" | "NO" | "MAYBE";
  partySize: number;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let curr = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(curr.trim());
      curr = "";
      continue;
    }

    curr += ch;
  }

  out.push(curr.trim());
  return out;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseStatus(value: string): "YES" | "NO" | "MAYBE" | null {
  const status = value.toLowerCase().trim().replace(/[_\s-]+/g, "");

  if (["yes", "y", "going", "attending", "accepted"].includes(status)) return "YES";
  if (["no", "n", "declined", "notgoing", "cantmakeit"].includes(status)) return "NO";
  if (["maybe", "m", "tentative"].includes(status)) return "MAYBE";

  return null;
}

function parseCsv(text: string): { rows: ParsedCsvRow[]; rowErrors: RowError[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      rowErrors: [{ row: 1, error: "CSV must include a header and at least one data row." }],
    };
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);

  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");
  const statusIdx = header.indexOf("status") >= 0 ? header.indexOf("status") : header.indexOf("rsvpstatus");
  const partyIdx = header.indexOf("numberinparty");

  const missingHeaders: string[] = [];
  if (nameIdx < 0) missingHeaders.push("Name");
  if (emailIdx < 0) missingHeaders.push("Email");
  if (statusIdx < 0) missingHeaders.push("Status / RSVP Status");
  if (partyIdx < 0) missingHeaders.push("Number in party");

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      rowErrors: [{ row: 1, error: `Missing required header(s): ${missingHeaders.join(", ")}` }],
    };
  }

  const rows: ParsedCsvRow[] = [];
  const rowErrors: RowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cols = splitCsvLine(lines[i]);

    const name = (cols[nameIdx] ?? "").trim();
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] ?? "").trim() : "";
    const statusRaw = (cols[statusIdx] ?? "").trim();
    const partyRaw = (cols[partyIdx] ?? "").trim();

    if (!name) {
      rowErrors.push({ row: rowNumber, error: "Name is required." });
      continue;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rowErrors.push({ row: rowNumber, error: "Valid email is required." });
      continue;
    }

    const attending = parseStatus(statusRaw);
    if (!attending) {
      rowErrors.push({ row: rowNumber, error: "Status must be Yes, No, or Maybe." });
      continue;
    }

    const partySize = Number.parseInt(partyRaw, 10);
    if (!Number.isInteger(partySize) || partySize < 0) {
      rowErrors.push({ row: rowNumber, error: "Number in party must be a non-negative integer." });
      continue;
    }

    if (attending === "YES" && partySize < 1) {
      rowErrors.push({ row: rowNumber, error: "For status YES, number in party must be at least 1." });
      continue;
    }

    rows.push({
      row: rowNumber,
      name,
      email,
      phone: phoneRaw || null,
      attending,
      partySize,
    });
  }

  return { rows, rowErrors };
}

// POST /api/events/[id]/rsvp/import — import attendees CSV (Admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  const { rows, rowErrors } = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found in CSV.", rowErrors },
      { status: 400 }
    );
  }

  const uniqueByEmail = new Map<string, ParsedCsvRow>();
  for (const row of rows) uniqueByEmail.set(row.email, row);
  const dedupedRows = Array.from(uniqueByEmail.values());

  const emails = dedupedRows.map((r) => r.email);

  const [existingRsvps, users] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: { eventId: id, email: { in: emails } },
      select: { email: true },
    }),
    prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, role: true },
    }),
  ]);

  const existingEmails = new Set(existingRsvps.map((r) => r.email.toLowerCase()));
  const userIdByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

  const upserts = dedupedRows.map((row) => {
    const isAttending = row.attending === "YES";
    return prisma.eventRsvp.upsert({
      where: { eventId_email: { eventId: id, email: row.email } },
      update: {
        name: row.name,
        phone: row.phone,
        attending: row.attending,
        adultCount: isAttending ? row.partySize : 0,
        kidCount: 0,
        vegetarianCount: 0,
        nonVegetarianCount: 0,
      },
      create: {
        eventId: id,
        userId: userIdByEmail.get(row.email) ?? null,
        name: row.name,
        email: row.email,
        phone: row.phone,
        attending: row.attending,
        adultCount: isAttending ? row.partySize : 0,
        kidCount: 0,
        vegetarianCount: 0,
        nonVegetarianCount: 0,
      },
    });
  });

  await prisma.$transaction(upserts);

  const updated = dedupedRows.filter((r) => existingEmails.has(r.email)).length;
  const created = dedupedRows.length - updated;

  return NextResponse.json({
    imported: dedupedRows.length,
    created,
    updated,
    rowErrors,
  });
}
