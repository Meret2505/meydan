-- `surface` held a Russian display string ("Искусственная трава") as its
-- domain value; see lib/surface.ts for why that was a problem and how the
-- label is still served to older clients.
--
-- The CASE has no ELSE on purpose. An unexpected value yields NULL, the
-- NOT NULL column refuses it, and the migration aborts — which is what should
-- happen. Coercing unknown data to a default would quietly relabel somebody's
-- pitch. Checked before writing this: production holds 21 fields and 5
-- submissions, every one of them 'Искусственная трава'.
--
-- The enum spellings are listed too, because the code can ship before this
-- runs: a submission created in that window is validated by toSurface and
-- stored as 'ARTIFICIAL' in a column that is still text. Without those three
-- branches that row would be NULL here and the migration would refuse to run.

-- CreateEnum
CREATE TYPE "Surface" AS ENUM ('ARTIFICIAL', 'RUBBER', 'DIRT');

-- AlterTable
ALTER TABLE "fields"
  ALTER COLUMN "surface" TYPE "Surface"
  USING (
    CASE "surface"
      WHEN 'Искусственная трава' THEN 'ARTIFICIAL'
      WHEN 'Резиновое' THEN 'RUBBER'
      WHEN 'Грунт' THEN 'DIRT'
      WHEN 'ARTIFICIAL' THEN 'ARTIFICIAL'
      WHEN 'RUBBER' THEN 'RUBBER'
      WHEN 'DIRT' THEN 'DIRT'
    END
  )::"Surface";

-- AlterTable
ALTER TABLE "field_submissions"
  ALTER COLUMN "surface" TYPE "Surface"
  USING (
    CASE "surface"
      WHEN 'Искусственная трава' THEN 'ARTIFICIAL'
      WHEN 'Резиновое' THEN 'RUBBER'
      WHEN 'Грунт' THEN 'DIRT'
      WHEN 'ARTIFICIAL' THEN 'ARTIFICIAL'
      WHEN 'RUBBER' THEN 'RUBBER'
      WHEN 'DIRT' THEN 'DIRT'
    END
  )::"Surface";
