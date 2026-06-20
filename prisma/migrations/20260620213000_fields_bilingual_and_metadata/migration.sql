-- AlterTable
ALTER TABLE "fields" ADD COLUMN     "addressRu" TEXT,
ADD COLUMN     "addressTm" TEXT,
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "bodyRu" TEXT,
ADD COLUMN     "bodyTm" TEXT,
ADD COLUMN     "contacts" JSONB,
ADD COLUMN     "externalId" INTEGER,
ADD COLUMN     "hours" JSONB,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "nameRu" TEXT,
ADD COLUMN     "nameTm" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fields_externalId_key" ON "fields"("externalId");

