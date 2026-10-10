-- Dispatch acknowledgement and admission budget.
ALTER TABLE "VideoJobRecord" ADD COLUMN "dispatchAcknowledgedAt" TIMESTAMP(3);
CREATE TABLE "GenerationQuotaDay" (
  "day" TEXT NOT NULL PRIMARY KEY,
  "used" INTEGER NOT NULL DEFAULT 0
);
