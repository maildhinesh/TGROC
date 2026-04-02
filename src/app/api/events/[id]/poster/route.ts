import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink, access } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/** Returns true when CLOUDINARY env var is set to "Yes" (case-insensitive). */
function useCloudinary(): boolean {
  return process.env.CLOUDINARY?.toLowerCase() === "yes";
}

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

// ── Cloudinary helpers ────────────────────────────────────────────────────────

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/** Upload a buffer to Cloudinary and return the secure URL. */
async function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "tgroc/events", public_id: publicId, overwrite: true, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
}

/** Delete an asset from Cloudinary using its public_id. */
async function deleteFromCloudinary(publicId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

/**
 * Extract the Cloudinary public_id from a stored URL.
 * URL format: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/tgroc/events/<id>
 */
function publicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

// ── Local filesystem helpers ──────────────────────────────────────────────────

async function uploadToLocal(buffer: Buffer, eventId: string, ext: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "events");
  await mkdir(uploadsDir, { recursive: true });

  // Remove old poster with a different extension
  for (const oldExt of ["jpg", "png"]) {
    if (oldExt === ext) continue;
    const oldPath = path.join(uploadsDir, `${eventId}.${oldExt}`);
    try {
      await access(oldPath);
      await unlink(oldPath);
    } catch {
      // file doesn't exist, no action needed
    }
  }

  await writeFile(path.join(uploadsDir, `${eventId}.${ext}`), buffer);
  return `/uploads/events/${eventId}.${ext}`;
}

async function deleteFromLocal(posterUrl: string): Promise<void> {
  const filePath = path.join(process.cwd(), "public", posterUrl);
  try {
    await unlink(filePath);
  } catch {
    // file already removed from disk, continue
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

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

  let posterUrl: string;

  if (useCloudinary()) {
    posterUrl = await uploadToCloudinary(buffer, id);
  } else {
    posterUrl = await uploadToLocal(buffer, id, ext);
  }

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
    if (useCloudinary()) {
      const publicId = publicIdFromUrl(event.posterUrl);
      if (publicId) await deleteFromCloudinary(publicId);
    } else {
      await deleteFromLocal(event.posterUrl);
    }
    await prisma.event.update({ where: { id }, data: { posterUrl: null } });
  }

  return NextResponse.json({ message: "Poster removed" });
}
