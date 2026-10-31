-- One database-wide revision, updated atomically with ranking-affecting writes.
-- Profiles are fetched afresh; unrelated moves, sessions and quotas do not invalidate ranks.
CREATE TABLE "StatisticsRevision" (
    "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
    "revision" BIGINT NOT NULL DEFAULT 0
);
INSERT INTO "StatisticsRevision" ("id", "revision") VALUES (1, 0);

CREATE TRIGGER "statistics_game_insert" AFTER INSERT ON "Game"
WHEN NEW.mode = 'HUMAN' AND NEW.status = 'FINISHED'
 AND NEW.reason IN ('LINE', 'FULL_BOARD', 'RESIGNED')
BEGIN
    UPDATE "StatisticsRevision" SET "revision" = "revision" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER "statistics_game_delete" AFTER DELETE ON "Game"
WHEN OLD.mode = 'HUMAN' AND OLD.status = 'FINISHED'
 AND OLD.reason IN ('LINE', 'FULL_BOARD', 'RESIGNED')
BEGIN
    UPDATE "StatisticsRevision" SET "revision" = "revision" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER "statistics_game_update"
AFTER UPDATE OF mode, status, reason, winner, "xId", "oId" ON "Game"
WHEN (
 (OLD.mode = 'HUMAN' AND OLD.status = 'FINISHED' AND OLD.reason IN ('LINE', 'FULL_BOARD', 'RESIGNED'))
 OR (NEW.mode = 'HUMAN' AND NEW.status = 'FINISHED' AND NEW.reason IN ('LINE', 'FULL_BOARD', 'RESIGNED'))
) AND (
 OLD.mode IS NOT NEW.mode OR OLD.status IS NOT NEW.status OR OLD.reason IS NOT NEW.reason
 OR OLD.winner IS NOT NEW.winner OR OLD."xId" IS NOT NEW."xId" OR OLD."oId" IS NOT NEW."oId"
)
BEGIN
    UPDATE "StatisticsRevision" SET "revision" = "revision" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER "statistics_user_delete" AFTER DELETE ON "User"
BEGIN
    UPDATE "StatisticsRevision" SET "revision" = "revision" + 1 WHERE "id" = 1;
END;

CREATE TRIGGER "statistics_user_order" AFTER UPDATE OF id, "createdAt" ON "User"
WHEN OLD.id IS NOT NEW.id OR OLD."createdAt" IS NOT NEW."createdAt"
BEGIN
    UPDATE "StatisticsRevision" SET "revision" = "revision" + 1 WHERE "id" = 1;
END;
