import { expect, test } from "vitest";
import { applyMove, evaluateBoard, decodeBoard } from "@/server/games/rules";
import { chooseAiMove } from "@/server/games/ai";
test.each(["XXX......", "...XXX...", "......XXX", "X..X..X..", ".X..X..X.", "..X..X..X", "X...X...X", "..X.X.X.."])("detects a winning line in %s", (board) => {
  expect(evaluateBoard(decodeBoard(board)).winner).toBe("X");
});
test("draws are terminal, moves are immutable and invalid cells cannot be played", () => {
  const cells = decodeBoard("XOXXOOOX.");
  expect(applyMove(cells, "X", 8).draw).toBe(true);
  expect(cells[8]).toBeNull();
  expect(evaluateBoard(decodeBoard("XOXXOOOXX")).draw).toBe(true);
  for (const cell of [-1,9,1.5,0]) expect(() => applyMove(cells, "X", cell)).toThrow();
  expect(() => applyMove(decodeBoard("XXXOO...."), "O", 8)).toThrow();
});
test("computer takes a win, normally blocks, can make a legal mistake, and stops at terminal boards", () => {
  expect(chooseAiMove(decodeBoard("OO.XX.X.."), () => .99)).toBe(2);
  expect(chooseAiMove(decodeBoard("XX..O...."), () => .1)).toBe(2);
  const imperfect = chooseAiMove(decodeBoard("XX..O...."), () => .99);
  expect(imperfect).not.toBe(2); expect(imperfect).not.toBeNull();
  expect(decodeBoard("XX..O....")[imperfect!]).toBeNull();
  expect(chooseAiMove(decodeBoard("XOXXOOOXX"))).toBeNull();
  expect(chooseAiMove(decodeBoard("XXXOO...."))).toBeNull();
});
test("computer can win against weak play and lose when it makes mistakes", () => {
  function play(random: () => number) {
    let cells = decodeBoard(".........");
    for (let turn = 0; turn < 9; turn++) {
      const human = cells.findIndex((c) => c === null);
      const x = applyMove(cells, "X", human); cells = x.cells;
      if (x.winner || x.draw) return x.winner;
      const o = applyMove(cells, "O", chooseAiMove(cells, random)!); cells = o.cells;
      if (o.winner || o.draw) return o.winner;
    }
  }
  expect(play(() => 0)).toBe("O");
  expect(play(() => .99)).toBe("X");
});
