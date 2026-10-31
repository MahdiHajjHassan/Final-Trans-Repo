-- Names are projected into existing games without changing their board versions.
ALTER TABLE "User" ADD COLUMN "profileVersion" INTEGER NOT NULL DEFAULT 1;

-- Keep revisions correct for self-service, administrator and direct SQLite name updates.
CREATE TRIGGER "User_displayName_profileVersion"
AFTER UPDATE OF "displayName" ON "User"
WHEN OLD."displayName" IS NOT NEW."displayName"
BEGIN
  UPDATE "User" SET "profileVersion" = OLD."profileVersion" + 1 WHERE "id" = NEW."id";
END;
