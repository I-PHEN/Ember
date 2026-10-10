-- Initial Ember schema (must precede hosted dispatch migration).
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "messageId" TEXT,
    "script" TEXT NOT NULL,
    "timeline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPost" (
    "id" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "videoVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoJobRecord" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NarrationAsset" (
    "key" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrationAsset_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VideoVersion_messageId_key" ON "VideoVersion"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryPost_videoVersionId_key" ON "GalleryPost"("videoVersionId");

-- CreateIndex
CREATE INDEX "VideoJobRecord_status_nextRunAt_leaseUntil_idx" ON "VideoJobRecord"("status", "nextRunAt", "leaseUntil");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoVersion" ADD CONSTRAINT "VideoVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoVersion" ADD CONSTRAINT "VideoVersion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPost" ADD CONSTRAINT "GalleryPost_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPost" ADD CONSTRAINT "GalleryPost_videoVersionId_fkey" FOREIGN KEY ("videoVersionId") REFERENCES "VideoVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
