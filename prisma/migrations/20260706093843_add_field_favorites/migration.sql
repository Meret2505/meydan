-- CreateTable
CREATE TABLE "field_favorites" (
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_favorites_pkey" PRIMARY KEY ("userId","fieldId")
);

-- CreateIndex
CREATE INDEX "field_favorites_userId_idx" ON "field_favorites"("userId");

-- AddForeignKey
ALTER TABLE "field_favorites" ADD CONSTRAINT "field_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_favorites" ADD CONSTRAINT "field_favorites_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
