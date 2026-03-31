-- CreateTable
CREATE TABLE "event_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantityNeeded" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvp_items" (
    "id" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "event_rsvp_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvp_items_rsvpId_itemId_key" ON "event_rsvp_items"("rsvpId", "itemId");

-- AddForeignKey
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp_items" ADD CONSTRAINT "event_rsvp_items_rsvpId_fkey" FOREIGN KEY ("rsvpId") REFERENCES "event_rsvps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp_items" ADD CONSTRAINT "event_rsvp_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "event_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
