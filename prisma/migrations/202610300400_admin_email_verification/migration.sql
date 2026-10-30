ALTER TABLE "EmailChallenge" ADD COLUMN "requestedRole" TEXT NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "EmailChallenge" ADD COLUMN "createdById" TEXT REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "EmailChallenge_createdById_idx" ON "EmailChallenge"("createdById");
