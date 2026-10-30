ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;
CREATE TABLE "EmailChallenge" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT, "email" TEXT NOT NULL,
 "displayName" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "locale" TEXT NOT NULL,
 "generation" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" DATETIME NOT NULL,
 "pendingUntil" DATETIME NOT NULL, "resendAt" DATETIME NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EmailChallenge_email_idx" ON "EmailChallenge"("email");
CREATE INDEX "EmailChallenge_userId_idx" ON "EmailChallenge"("userId");
CREATE INDEX "EmailChallenge_pendingUntil_idx" ON "EmailChallenge"("pendingUntil");
