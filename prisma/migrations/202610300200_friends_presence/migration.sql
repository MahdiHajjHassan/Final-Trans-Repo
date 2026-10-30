ALTER TABLE "Session" ADD COLUMN "lastSeenAt" DATETIME;
CREATE TABLE "Friendship" (
"id" TEXT NOT NULL PRIMARY KEY,
"userAId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
"userBId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
"requestedById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
"status" TEXT NOT NULL DEFAULT 'PENDING' CHECK("status" IN ('PENDING','ACCEPTED')),
"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" DATETIME NOT NULL,
CHECK("userAId" < "userBId"),
CHECK("requestedById" IN ("userAId","userBId"))
);
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId","userBId");
CREATE INDEX "Friendship_userBId_status_idx" ON "Friendship"("userBId","status");
