import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink, access } from "fs/promises";
import path from "path";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function getExtFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return null;
}

function validateMagicBytes(buf: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  return false;
}

// POST /api/events/[id]/poster — upload or replace event poster
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify event exists
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, posterUrl: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("poster");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 400 });
  }

  const mime = file.type;
  const ext = getExtFromMime(mime);
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG and PNG images are allowed." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!validateMagicBytes(buffer, mime)) {
    return NextResponse.json({ error: "File content does not match its declared type." }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "events");
  await mkdir(uploadsDir, { recursive: true });

  // Remove old poster file if it exists with a different extension
  for (const oldExt of ["jpg", "png"]) {
    if (oldExt === ext) continue;
    const oldPath = path.join(uploadsDir, `${id}.${oldExt}`);
    try {
      await access(oldPath);
      await unlink(oldPath);
    } catch {
      // file doesn't exist, no action needed
    }
  }

  const filePath = path.join(uploadsDir, `${id}.${ext}`);
  await writeFile(filePath, buffer);

  const posterUrl = `/uploads/events/${id}.${ext}`;
  await prisma.event.update({ where: { id }, data: { posterUrl } });

  return NextResponse.json({ posterUrl });
}

// DELETE /api/events/[id]/poster — remove event poster
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id }, select: { posterUrl: true } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (event.posterUrl) {
    const filePath = path.join(process.cwd(), "public", event.posterUrl);
    try {
      await unlink(filePath);
    } catch {
      // file already removed from disk, continue
    }
    await prisma.event.update({ where: { id }, data: { posterUrl: null } });
  }

  return NextResponse.json({ message: "Poster removed" });
}
