CREATE TABLE IF NOT EXISTS "VideoJobRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "state" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "leaseToken" TEXT,
  "leaseUntil" DATETIME,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRunAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "VideoJobRecord_status_nextRunAt_leaseUntil_idx"
  ON "VideoJobRecord"("status", "nextRunAt", "leaseUntil");
CREATE TABLE IF NOT EXISTS "NarrationAsset" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "data" BLOB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
