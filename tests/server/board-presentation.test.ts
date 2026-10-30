import { describe, expect, test } from "vitest";
import { winningLineGeometry } from "../../src/frontend/features/games/lib/board-presentation";

describe("winning line presentation", () => {
  test.each([
    [[0, 1, 2], { x1: 50, y1: 50, x2: 250, y2: 50 }],
    [[3, 4, 5], { x1: 50, y1: 150, x2: 250, y2: 150 }],
    [[6, 7, 8], { x1: 50, y1: 250, x2: 250, y2: 250 }],
    [[0, 3, 6], { x1: 50, y1: 50, x2: 50, y2: 250 }],
    [[1, 4, 7], { x1: 150, y1: 50, x2: 150, y2: 250 }],
    [[2, 5, 8], { x1: 250, y1: 50, x2: 250, y2: 250 }],
    [[0, 4, 8], { x1: 50, y1: 50, x2: 250, y2: 250 }],
    [[2, 4, 6], { x1: 250, y1: 50, x2: 50, y2: 250 }],
  ])("connects winning cells %j through their centers", (line, expected) => {
    expect(winningLineGeometry(line as number[])).toEqual(expected);
  });

  test("normalizes unordered winning cells without mutating the snapshot", () => {
    const snapshot = [8, 0, 4];
    expect(winningLineGeometry(snapshot)).toEqual({ x1: 50, y1: 50, x2: 250, y2: 250 });
    expect(snapshot).toEqual([8, 0, 4]);
  });

  test.each([
    null,
    [],
    [0, 1],
    [0, 1, 2, 3],
    [0, 0, 0],
    [0, 1, 3],
    [-1, 4, 8],
    [0, 4, 9],
    [0, 4.5, 8],
  ])("does not draw a misleading overlay for absent or invalid line %j", (line) => {
    expect(winningLineGeometry(line)).toBeNull();
  });
});
