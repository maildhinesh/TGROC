-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('HALL_RENT', 'FOOD', 'SUPPLIES', 'CLEANING', 'MISCELLANEOUS');

-- CreateTable: EventCheckIn
CREATE TABLE "event_checkins" (
    "id"              TEXT NOT NULL,
    "eventId"         TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "email"           TEXT NOT NULL,
    "phone"           TEXT,
    "adultCount"      INTEGER NOT NULL DEFAULT 1,
    "kidCount"        INTEGER NOT NULL DEFAULT 0,
    "amountPaid"      DECIMAL(10,2),
    "paymentNote"     TEXT,
    "checkedInById"   TEXT NOT NULL,
    "checkedInAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventExpense
CREATE TABLE "event_expenses" (
    "id"          TEXT NOT NULL,
    "eventId"     TEXT NOT NULL,
    "category"    "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount"      DECIMAL(10,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_checkins_eventId_email_key" ON "event_checkins"("eventId", "email");

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_checkedInById_fkey"
    FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;
