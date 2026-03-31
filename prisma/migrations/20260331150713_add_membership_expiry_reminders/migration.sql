-- CreateEnum
CREATE TYPE "MembershipReminderType" AS ENUM ('DAYS_10', 'DAYS_5', 'DAYS_1', 'EXPIRED');

-- CreateTable
CREATE TABLE "membership_expiry_reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderType" "MembershipReminderType" NOT NULL,
    "expiryDate" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailError" TEXT,

    CONSTRAINT "membership_expiry_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_expiry_reminders_userId_reminderType_expiryDate_key" ON "membership_expiry_reminders"("userId", "reminderType", "expiryDate");

-- AddForeignKey
ALTER TABLE "membership_expiry_reminders" ADD CONSTRAINT "membership_expiry_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
