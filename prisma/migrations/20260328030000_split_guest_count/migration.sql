-- AlterTable: split guestCount into adultCount + kidCount on event_rsvps
ALTER TABLE "event_rsvps" ADD COLUMN "adultCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "event_rsvps" ADD COLUMN "kidCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_rsvps" DROP COLUMN "guestCount";
