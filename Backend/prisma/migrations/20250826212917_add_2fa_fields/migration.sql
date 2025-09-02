-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "twoFAEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."TwoFABackup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFABackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFABackup_userId_idx" ON "public"."TwoFABackup"("userId");

-- AddForeignKey
ALTER TABLE "public"."TwoFABackup" ADD CONSTRAINT "TwoFABackup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
