-- CreateEnum
CREATE TYPE "EventFeeType" AS ENUM ('FAMILY', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "event_pricing" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "feeType" "EventFeeType",
    "memberFamilyFee" DECIMAL(10,2),
    "nonMemberFamilyFee" DECIMAL(10,2),
    "memberAdultFee" DECIMAL(10,2),
    "nonMemberAdultFee" DECIMAL(10,2),
    "memberKidFee" DECIMAL(10,2),
    "nonMemberKidFee" DECIMAL(10,2),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "event_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_fee_reminders" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentById" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "message" TEXT,

    CONSTRAINT "event_fee_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_pricing_eventId_key" ON "event_pricing"("eventId");

-- AddForeignKey
ALTER TABLE "event_pricing" ADD CONSTRAINT "event_pricing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pricing" ADD CONSTRAINT "event_pricing_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_fee_reminders" ADD CONSTRAINT "event_fee_reminders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_fee_reminders" ADD CONSTRAINT "event_fee_reminders_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
