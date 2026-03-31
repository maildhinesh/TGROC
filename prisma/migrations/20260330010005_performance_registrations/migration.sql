-- CreateEnum
CREATE TYPE "PerformanceType" AS ENUM ('SINGING', 'DANCE', 'SKIT', 'POEM_RECITAL', 'QUIZ', 'STANDUP');

-- CreateEnum
CREATE TYPE "MicType" AS ENUM ('STANDING', 'HANDHELD');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "performanceRegDeadline" TIMESTAMP(3),
ADD COLUMN     "performanceRegOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "performance_registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "performanceType" "PerformanceType" NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "programName" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "coordinatorName" TEXT NOT NULL,
    "coordinatorEmail" TEXT NOT NULL,
    "coordinatorPhone" TEXT NOT NULL,
    "participantCount" INTEGER,
    "songList" TEXT,
    "micCount" INTEGER,
    "micType" "MicType",
    "additionalDetails" TEXT,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_registrations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "performance_registrations" ADD CONSTRAINT "performance_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
