import { Children, isValidElement } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { GameDTO, GameView } from "@/shared/games";

// Run the component's hooks with an in-memory browser boundary. No DOM or real network is
// needed to exercise incoming state and its reconnect timers.
const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  effects: [] as Array<() => void | (() => void)>,
  next: 0,
  request: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = hooks.next++;
    hooks.states[index] = initial;
    return [
      initial,
      (value: unknown) => {
        hooks.states[index] = typeof value === "function" ? value(hooks.states[index]) : value;
      },
    ];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/frontend/lib/api", async (original) => ({
  ...(await original<typeof import("@/frontend/lib/api")>()),
  request: hooks.request,
  useMutation: () => ({
    pending: false,
    error: null,
    run: async (action: () => Promise<unknown>) => action(),
    clear: vi.fn(),
  }),
}));
import { LiveGame } from "@/frontend/features/games/components/LiveGame";
import { RequestError } from "@/frontend/lib/api";

class Stream extends EventTarget {
  static instances: Stream[] = [];
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    super();
    Stream.instances.push(this);
  }
  state(game: GameDTO) {
    this.dispatchEvent(new MessageEvent("state", { data: JSON.stringify(game) }));
  }
}
const original: GameDTO = {
  id: "game",
  tournament: null,
  mode: "HUMAN",
  cells: [null, null, null, null, null, null, null, null, null],
  playerMetadataVersion: 2,
  players: {
    X: { displayName: "Original", kind: "HUMAN" },
    O: { displayName: "Other", kind: "HUMAN" },
  },
  status: "ACTIVE",
  turn: "X",
  winner: null,
  reason: null,
  winningLine: null,
  version: 2,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  finishedAt: null,
};
const view = (game = original): GameView => ({ game, viewerMark: "X", inviteCode: null });
let cleanup: Array<() => void> = [];
let rendered: ReturnType<typeof LiveGame>;
let browser: EventTarget & { location: { replace: ReturnType<typeof vi.fn> } };
let network: { onLine: boolean };
beforeEach(() => {
  vi.useFakeTimers();
  hooks.states = [];
  hooks.effects = [];
  hooks.next = 0;
  hooks.request.mockReset();
  hooks.request.mockResolvedValue(view());
  Stream.instances = [];
  browser = Object.assign(new EventTarget(), { location: { replace: vi.fn() } });
  network = { onLine: true };
  vi.stubGlobal("window", browser);
  vi.stubGlobal("navigator", network);
  vi.stubGlobal("EventSource", Stream);
  rendered = LiveGame({ initial: view(), locale: "en" });
  cleanup = hooks.effects
    .map((effect) => effect())
    .filter((fn): fn is () => void => typeof fn === "function");
});
afterEach(() => {
  for (const fn of cleanup) fn();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const latest = () => Stream.instances.at(-1)!;
const game = () => hooks.states[0] as GameDTO;

test("same-version incoming state refreshes players while older snapshots cannot roll back the board", () => {
  const updated = {
    ...original,
    playerMetadataVersion: 3,
    players: { ...original.players, X: { displayName: "Renamed", kind: "HUMAN" as const } },
  };
  latest().state(updated);
  expect(game().players.X?.displayName).toBe("Renamed");
  const moved: GameDTO = {
    ...updated,
    version: 3,
    cells: ["X", null, null, null, null, null, null, null, null],
    turn: "O",
  };
  latest().state(moved);
  latest().state(original);
  expect(game()).toEqual(moved);
  // A same-board response with a newer metadata revision refreshes identity only.
  latest().state({ ...original, version: 3, playerMetadataVersion: 4 });
  expect(game().players.X?.displayName).toBe("Original");
  expect(game().cells).toEqual(moved.cells);
  expect(game().turn).toBe("O");
});

test("successful recovery GET refreshes same-version names", async () => {
  hooks.request.mockResolvedValue(
    view({
      ...original,
      playerMetadataVersion: 3,
      players: { ...original.players, X: { displayName: "Fresh GET", kind: "HUMAN" } },
    }),
  );
  latest().onerror!();
  await vi.advanceTimersByTimeAsync(2000);
  expect(game().players.X?.displayName).toBe("Fresh GET");
});

test("rejected streams back off through 2, 4, 8 and 10 seconds despite successful GETs; healthy state resets delay", async () => {
  for (const delay of [2000, 4000, 8000, 10000, 10000]) {
    const count = Stream.instances.length;
    latest().onerror!();
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(Stream.instances).toHaveLength(count);
    await vi.advanceTimersByTimeAsync(1);
    expect(Stream.instances).toHaveLength(count + 1);
  }
  latest().state(original);
  expect(hooks.states[3]).toBe(true);
  const count = Stream.instances.length;
  latest().onerror!();
  await vi.advanceTimersByTimeAsync(2000);
  expect(Stream.instances).toHaveLength(count + 1);
});

test("offline recovery waits for network and access loss stops further reads", async () => {
  network.onLine = false;
  browser.dispatchEvent(new Event("offline"));
  await vi.advanceTimersByTimeAsync(20000);
  expect(hooks.request).not.toHaveBeenCalled();
  network.onLine = true;
  hooks.request.mockRejectedValue(new RequestError("UNAUTHENTICATED"));
  browser.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(2000);
  expect(browser.location.replace).toHaveBeenCalledWith("/en/login");
  await vi.advanceTimersByTimeAsync(20000);
  expect(hooks.request).toHaveBeenCalledTimes(1);
});

test("a delayed equal-board GET cannot overwrite newer SSE identity metadata", async () => {
  let reply!: (value: GameView) => void;
  hooks.request.mockImplementationOnce(
    () =>
      new Promise<GameView>((resolve) => {
        reply = resolve;
      }),
  );
  const feedback = Children.toArray(rendered.props.children).find(
    (child) => isValidElement<{ onRefresh?: () => void }>(child) && child.props.onRefresh,
  );
  if (!isValidElement<{ onRefresh: () => void }>(feedback)) throw new Error("Missing sync action");
  feedback.props.onRefresh();
  const renamed: GameDTO = {
    ...original,
    playerMetadataVersion: 3,
    players: { ...original.players, X: { displayName: "Current name", kind: "HUMAN" } },
  };
  latest().state(renamed);
  expect(game().players.X?.displayName).toBe("Current name");
  reply(view(original));
  await vi.advanceTimersByTimeAsync(0);
  expect(game().players.X?.displayName).toBe("Current name");
  expect(game().playerMetadataVersion).toBe(3);
  // Repeated copies of an already-seen metadata revision cannot change identity either.
  latest().state({ ...original, playerMetadataVersion: 3 });
  expect(game().players.X?.displayName).toBe("Current name");
});

test("a newer board may reset its metadata revision after a seat disappears", () => {
  latest().state({ ...original, playerMetadataVersion: 9 });
  const deleted: GameDTO = {
    ...original,
    version: 3,
    playerMetadataVersion: 1,
    players: { X: { displayName: "Deleted player", kind: "DELETED" }, O: original.players.O },
    status: "FINISHED",
    turn: null,
    reason: "ACCOUNT_DELETED",
  };
  latest().state(deleted);
  expect(game()).toEqual(deleted);
  latest().state({ ...original, playerMetadataVersion: 10 });
  expect(game()).toEqual(deleted);
});

test("a delayed move response cannot replace a same-board newer SSE name revision", async () => {
  let reply!: (value: GameDTO) => void;
  hooks.request.mockImplementationOnce(
    () =>
      new Promise<GameDTO>((resolve) => {
        reply = resolve;
      }),
  );
  const board = Children.toArray(rendered.props.children).find(
    (child) => isValidElement<{ onMove?: (cell: number) => void }>(child) && child.props.onMove,
  );
  if (!isValidElement<{ onMove: (cell: number) => void }>(board))
    throw new Error("Missing move action");
  board.props.onMove(0);
  expect(hooks.request).toHaveBeenCalledWith("/api/games/game/moves", "POST", {
    cell: 0,
    expectedVersion: 2,
  });
  const committed: GameDTO = {
    ...original,
    version: 3,
    cells: ["X", null, null, null, null, null, null, null, null],
    turn: "O",
  };
  latest().state({
    ...committed,
    playerMetadataVersion: 3,
    players: { ...committed.players, X: { displayName: "Renamed after move", kind: "HUMAN" } },
  });
  reply(committed);
  await vi.advanceTimersByTimeAsync(0);
  expect(game().players.X?.displayName).toBe("Renamed after move");
  expect(game().playerMetadataVersion).toBe(3);
  expect(game().version).toBe(3);
  expect(game().cells).toEqual(committed.cells);
});
