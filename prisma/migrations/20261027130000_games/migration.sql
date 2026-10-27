CREATE TABLE "User" ("id" TEXT PRIMARY KEY NOT NULL,"email" TEXT NOT NULL,"displayName" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" TEXT NOT NULL DEFAULT 'MEMBER',"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Session" ("id" TEXT PRIMARY KEY NOT NULL,"userId" TEXT NOT NULL,"expiresAt" DATETIME NOT NULL,FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "RateLimitBucket" ("key" TEXT PRIMARY KEY NOT NULL,"windowStart" DATETIME NOT NULL,"count" INTEGER NOT NULL DEFAULT 0);
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");
CREATE TABLE "Game" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mode" TEXT NOT NULL CHECK ("mode" IN ('HUMAN','AI')),
  "xId" TEXT, "oId" TEXT,
  "board" TEXT NOT NULL DEFAULT '.........' CHECK (length("board") = 9),
  "turn" TEXT DEFAULT 'X',
  "status" TEXT NOT NULL DEFAULT 'WAITING',
  "winner" TEXT, "reason" TEXT, "inviteCode" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "finishedAt" DATETIME,
  FOREIGN KEY ("xId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY ("oId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Game_inviteCode_key" ON "Game"("inviteCode");
CREATE INDEX "Game_xId_updatedAt_idx" ON "Game"("xId","updatedAt");
CREATE INDEX "Game_oId_updatedAt_idx" ON "Game"("oId","updatedAt");
CREATE TABLE "GameMove" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gameId" TEXT NOT NULL,
  "ply" INTEGER NOT NULL CHECK ("ply" BETWEEN 1 AND 9),
  "mark" TEXT NOT NULL CHECK ("mark" IN ('X','O')),
  "cell" INTEGER NOT NULL CHECK ("cell" BETWEEN 0 AND 8),
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GameMove_gameId_ply_key" ON "GameMove"("gameId","ply");
CREATE UNIQUE INDEX "GameMove_gameId_cell_key" ON "GameMove"("gameId","cell");
