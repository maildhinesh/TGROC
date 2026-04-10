-- AlterTable
ALTER TABLE "event_rsvps" ADD COLUMN "vegetarianCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "event_rsvps" ADD COLUMN "nonVegetarianCount" INTEGER NOT NULL DEFAULT 0;
