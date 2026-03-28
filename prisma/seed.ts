/**
 * Seed the database with an initial admin user.
 * Run with: npx tsx prisma/seed.ts
 *
 * Default credentials:
 *   Email: admin@tgroc.org
 *   Password: Admin@1234
 *
 * CHANGE THE PASSWORD IMMEDIATELY after first login.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@tgroc.org";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("⚠️  Admin user already exists. Skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("Admin@1234", 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "TGROC Admin",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      profile: {
        create: {
          firstName: "TGROC",
          lastName: "Admin",
        },
      },
      contactInfo: { create: {} },
      notificationSettings: { create: {} },
    },
  });

  console.log("✅ Admin user created:");
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: Admin@1234  ← CHANGE THIS!`);
  console.log(`   ID:       ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
