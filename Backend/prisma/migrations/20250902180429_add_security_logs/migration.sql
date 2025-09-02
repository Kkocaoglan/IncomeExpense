-- CreateTable
CREATE TABLE "public"."SecurityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SecurityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityLog_timestamp_idx" ON "public"."SecurityLog"("timestamp");

-- CreateIndex
CREATE INDEX "SecurityLog_level_idx" ON "public"."SecurityLog"("level");

-- CreateIndex
CREATE INDEX "SecurityLog_type_idx" ON "public"."SecurityLog"("type");

-- CreateIndex
CREATE INDEX "SecurityLog_userId_idx" ON "public"."SecurityLog"("userId");
