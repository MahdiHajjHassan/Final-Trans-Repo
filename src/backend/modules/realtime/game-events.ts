import { DomainError } from "../../common/errors";

// The in-memory notice board for this one Node process. Listeners are grouped by game ID.
export function createGameEvents() {
  const listeners = new Map<string, Set<(version: number) => void>>();
  const accounts = new Map<string, number>();
  return {
    // Follow one game. The returned function removes this listener when its stream closes.
    subscribe(id: string, listener: (version: number) => void) {
      const set = listeners.get(id) ?? new Set();
      set.add(listener);
      listeners.set(id, set);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(id);
      };
    },

    // Tell the streams which saved version changed; each stream reads the board from the
    // service.
    publish(id: string, version: number) {
      for (const listener of listeners.get(id) ?? []) listener(version);
    },

    // Allow at most five open streams per account. The returned cleanup releases one slot
    // once.
    acquire(accountId: string) {
      const count = accounts.get(accountId) ?? 0;
      if (count >= 5) throw new DomainError("RATE_LIMITED", undefined, 15);
      accounts.set(accountId, count + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const next = (accounts.get(accountId) ?? 1) - 1;
        if (next <= 0) accounts.delete(accountId);
        else accounts.set(accountId, next);
      };
    },
  };
}

// All streams in this Node process share the same listeners.
const shared = globalThis as typeof globalThis & {
  ticTacToeEvents?: ReturnType<typeof createGameEvents>;
};
export const gameEvents = (shared.ticTacToeEvents ??= createGameEvents());
