-- Player-submitted fields, held for admin review before becoming a real
-- `fields` row (see the FieldSubmission model comment in schema.prisma for why
-- this is a separate table rather than a status column on `fields`).
--
-- Purely additive: adds one boolean column to `users` (defaulted `false`, so
-- every existing account is a non-admin until set by hand), two enum members
-- to `notifications`' NotificationType (appended, so no existing row is
-- affected), and one new table with two nullable FKs back into `users` and
-- one nullable FK into `fields`. Nothing here changes the shape or contents
-- of any existing row.
--
-- After applying, grant yourself admin manually:
--   UPDATE users SET "isAdmin" = true WHERE phone = '+99364380429';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FIELD_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'FIELD_REJECTED';

-- CreateEnum
CREATE TYPE "FieldSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "field_submissions" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "phone" TEXT,
    "description" TEXT,
    "photos" TEXT[],
    "status" "FieldSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "fieldId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_submissions_status_createdAt_idx" ON "field_submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "field_submissions_submittedById_idx" ON "field_submissions"("submittedById");

-- AddForeignKey
ALTER TABLE "field_submissions" ADD CONSTRAINT "field_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_submissions" ADD CONSTRAINT "field_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_submissions" ADD CONSTRAINT "field_submissions_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
