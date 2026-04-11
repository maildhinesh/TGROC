import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const MGMT_ROLES = ["ADMIN", "OFFICE_BEARER"];
const MAX_SIZE = 5 * 1024 * 1024;

function useCloudinary() {
  return process.env.CLOUDINARY?.toLowerCase() === "yes";
}

function getExtFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return null;
}

function validateMagicBytes(buf: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return false;
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function uploadToCloudinary(buffer: Buffer, id: string): Promise<string> {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "tgroc/coupons", public_id: id, overwrite: true, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
}

async function uploadToLocal(buffer: Buffer, id: string, ext: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "coupons");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${id}.${ext}`), buffer);
  return `/uploads/coupons/${id}.${ext}`;
}

// POST /api/coupons/[id]/logo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 5 MB." }, { status: 400 });
  }

  const mime = file.type;
  const ext = getExtFromMime(mime);
  if (!ext) return NextResponse.json({ error: "Only JPEG and PNG images are allowed." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(buffer, mime)) {
    return NextResponse.json({ error: "File content does not match its declared type." }, { status: 400 });
  }

  const logoUrl = useCloudinary()
    ? await uploadToCloudinary(buffer, id)
    : await uploadToLocal(buffer, id, ext);

  await prisma.coupon.update({ where: { id }, data: { logoUrl } });
  return NextResponse.json({ logoUrl });
}

// DELETE /api/coupons/[id]/logo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !MGMT_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.coupon.update({ where: { id }, data: { logoUrl: null } });
  return NextResponse.json({ success: true });
}
