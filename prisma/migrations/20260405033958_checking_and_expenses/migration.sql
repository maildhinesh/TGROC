-- DropForeignKey
ALTER TABLE "event_checkins" DROP CONSTRAINT "event_checkins_checkedInById_fkey";

-- DropForeignKey
ALTER TABLE "event_expenses" DROP CONSTRAINT "event_expenses_createdById_fkey";

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
