// In-room session: the engine state plus undo history, checkpoint, revives and the real-time
// countdown. Pure functions; the zustand store in useSession.ts just holds the current value.
import { ECONOMY } from '../config/economy';
import { initialState, step } from '../game/engine';
import type { Action, GameState, Room, StepEvent } from '../game/types';

export type SessionKind = 'campaign' | 'daily' | 'bonus';

export interface Snapshot {
  state: GameState;
  history: GameState[];
  timeLeftMs?: number;
}

export interface Session {
  kind: SessionKind;
  room: Room;
  /** Local day for daily challenges. */
  day?: string;
  state: GameState;
  history: GameState[];
  checkpoint?: Snapshot;
  usedUndo: boolean;
  undoCount: number;
  attempt: number;
  failedAttempts: number;
  revivesUsed: number;
  hintsUsed: number;
  timeLeftMs?: number;
  timedOut: boolean;
  /** Events from the latest action, with a sequence number so the UI reacts once per action. */
  events: StepEvent[];
  seq: number;
}

const MAX_HISTORY = 500;

export function newSession(room: Room, kind: SessionKind, day?: string): Session {
  return {
    kind,
    room,
    day,
    state: initialState(room),
    history: [],
    usedUndo: false,
    undoCount: 0,
    attempt: 1,
    failedAttempts: 0,
    revivesUsed: 0,
    hintsUsed: 0,
    timeLeftMs: room.timeLimit ? room.timeLimit * 1000 : undefined,
    timedOut: false,
    events: [],
    seq: 0,
  };
}

export const isPlaying = (s: Session) => s.state.status === 'playing' && !s.timedOut;

export function act(s: Session, a: Action): Session {
  if (!isPlaying(s)) return s;
  const r = step(s.room, s.state, a);
  if (!r.valid) return { ...s, events: r.events, seq: s.seq + 1 };
  let next: Session = {
    ...s,
    state: r.state,
    history: [...s.history, s.state].slice(-MAX_HISTORY),
    events: r.events,
    seq: s.seq + 1,
  };
  if (r.events.some((e) => e.type === 'checkpoint') && r.state.status === 'playing') {
    next = { ...next, checkpoint: { state: r.state, history: next.history, timeLeftMs: s.timeLeftMs } };
  }
  if (r.state.status === 'dead') next = { ...next, failedAttempts: s.failedAttempts + 1 };
  return next;
}

export function undo(s: Session): Session {
  if (!s.history.length || s.state.status === 'won') return s;
  const prev = s.history[s.history.length - 1];
  return {
    ...s,
    state: prev,
    history: s.history.slice(0, -1),
    usedUndo: true,
    undoCount: s.undoCount + 1,
    timedOut: false,
    events: [],
    seq: s.seq + 1,
  };
}

export function restart(s: Session): Session {
  const fresh = newSession(s.room, s.kind, s.day);
  return {
    ...fresh,
    attempt: s.attempt + 1,
    failedAttempts: s.failedAttempts,
    usedUndo: s.usedUndo,
    undoCount: s.undoCount,
    hintsUsed: s.hintsUsed,
    seq: s.seq + 1,
  };
}

export function restoreCheckpoint(s: Session): Session {
  if (!s.checkpoint) return restart(s);
  return {
    ...s,
    state: s.checkpoint.state,
    history: s.checkpoint.history,
    timeLeftMs: s.checkpoint.timeLeftMs ?? s.timeLeftMs,
    timedOut: false,
    attempt: s.attempt + 1,
    revivesUsed: 0,
    events: [],
    seq: s.seq + 1,
  };
}

export function tickTimer(s: Session, elapsedMs: number): Session {
  if (s.timeLeftMs === undefined || !isPlaying(s)) return s;
  const left = Math.max(0, s.timeLeftMs - elapsedMs);
  if (left > 0) return { ...s, timeLeftMs: left };
  return { ...s, timeLeftMs: 0, timedOut: true, failedAttempts: s.failedAttempts + 1, events: [{ type: 'death', cause: 'timeout' }], seq: s.seq + 1 };
}

export type ReviveKind = 'rewind' | 'extraMoves' | 'extraTime';

/** What a revive would do for the current failure, or null if not eligible. */
export function reviveOffer(s: Session): ReviveKind | null {
  if (s.revivesUsed >= ECONOMY.ads.revivesPerAttempt) return null;
  if (s.timedOut) return 'extraTime';
  if (s.state.status !== 'dead') return null;
  if (s.state.death === 'moves') return 'extraMoves';
  return s.history.length ? 'rewind' : null;
}

export function applyRevive(s: Session): Session {
  const kind = reviveOffer(s);
  if (!kind) return s;
  const base = { ...s, revivesUsed: s.revivesUsed + 1, events: [], seq: s.seq + 1 };
  if (kind === 'extraTime') {
    return { ...base, timedOut: false, timeLeftMs: (s.timeLeftMs ?? 0) + ECONOMY.ads.reviveExtraSeconds * 1000 };
  }
  if (kind === 'extraMoves') {
    return {
      ...base,
      state: { ...s.state, status: 'playing', death: undefined, bonusMoves: s.state.bonusMoves + ECONOMY.ads.reviveExtraMoves },
    };
  }
  // Rewind the fatal move.
  const prev = s.history[s.history.length - 1];
  return { ...base, state: prev, history: s.history.slice(0, -1) };
}

export function describeRevive(kind: ReviveKind): string {
  switch (kind) {
    case 'rewind':
      return 'Rewind your last move and keep going.';
    case 'extraMoves':
      return `Get ${ECONOMY.ads.reviveExtraMoves} extra moves and keep going.`;
    case 'extraTime':
      return `Add ${ECONOMY.ads.reviveExtraSeconds} seconds to the clock and keep going.`;
  }
}
