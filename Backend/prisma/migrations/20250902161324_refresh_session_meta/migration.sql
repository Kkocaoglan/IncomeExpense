-- DropIndex
DROP INDEX "public"."RefreshToken_userId_idx";

-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_expiresAt_idx" ON "public"."EmailVerificationToken"("token", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_createdAt_idx" ON "public"."RefreshToken"("userId", "createdAt");
