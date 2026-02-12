-- CreateTable
CREATE TABLE "public"."PendingEventTypeHost" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "groupId" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingEventTypeHost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingEventTypeHost_email_idx" ON "public"."PendingEventTypeHost"("email");

-- CreateIndex
CREATE INDEX "PendingEventTypeHost_eventTypeId_idx" ON "public"."PendingEventTypeHost"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingEventTypeHost_eventTypeId_email_key" ON "public"."PendingEventTypeHost"("eventTypeId", "email");

-- AddForeignKey
ALTER TABLE "public"."PendingEventTypeHost" ADD CONSTRAINT "PendingEventTypeHost_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "public"."EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
