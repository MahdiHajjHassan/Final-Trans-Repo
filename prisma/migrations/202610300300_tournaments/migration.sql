CREATE TABLE "Tournament" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "hostId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "joinCode" TEXT NOT NULL UNIQUE,
 "status" TEXT NOT NULL DEFAULT 'LOBBY' CHECK("status" IN ('LOBBY','RUNNING','FINISHED','CANCELLED')),
 "version" INTEGER NOT NULL DEFAULT 1,
 "championSlot" INTEGER CHECK("championSlot" BETWEEN 1 AND 4),
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "finishedAt" DATETIME
);
CREATE INDEX "Tournament_hostId_createdAt_idx" ON "Tournament"("hostId","createdAt");
CREATE TABLE "TournamentEntry" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "slot" INTEGER NOT NULL CHECK("slot" BETWEEN 1 AND 4),
 "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_slot_key" ON "TournamentEntry"("tournamentId","slot");
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId","userId");
CREATE INDEX "TournamentEntry_userId_idx" ON "TournamentEntry"("userId");
CREATE TABLE "TournamentMatch" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "tournamentId" TEXT NOT NULL REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "slot" TEXT NOT NULL CHECK("slot" IN ('SF1','SF2','FINAL')),
 "entryAId" TEXT REFERENCES "TournamentEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "entryBId" TEXT REFERENCES "TournamentEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "winnerEntryId" TEXT REFERENCES "TournamentEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK("status" IN ('PENDING','ACTIVE','FINISHED','CANCELLED')),
 "attempt" INTEGER NOT NULL DEFAULT 0,
 "version" INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX "TournamentMatch_tournamentId_slot_key" ON "TournamentMatch"("tournamentId","slot");
ALTER TABLE "Game" ADD COLUMN "tournamentMatchId" TEXT REFERENCES "TournamentMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD COLUMN "tournamentAttempt" INTEGER;
CREATE UNIQUE INDEX "Game_tournamentMatchId_tournamentAttempt_key" ON "Game"("tournamentMatchId","tournamentAttempt");
