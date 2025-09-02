-- DropIndex
DROP INDEX "public"."Receipt_userId_date_idx";

-- DropIndex
DROP INDEX "public"."Transaction_category_idx";

-- DropIndex
DROP INDEX "public"."Transaction_type_idx";

-- CreateIndex
CREATE INDEX "Investment_userId_date_idx" ON "public"."Investment"("userId", "date");

-- CreateIndex
CREATE INDEX "Receipt_userId_createdAt_idx" ON "public"."Receipt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "public"."Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_category_idx" ON "public"."Transaction"("userId", "category");
