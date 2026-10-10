ALTER TABLE "VideoJobRecord" ADD COLUMN "dispatchAcknowledgedAt" DATETIME;
CREATE TABLE "GenerationQuotaDay" (
  "day" TEXT NOT NULL PRIMARY KEY,
  "used" INTEGER NOT NULL DEFAULT 0
);
