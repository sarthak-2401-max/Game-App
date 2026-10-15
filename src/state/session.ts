// In-room session: the engine state plus undo history, checkpoint, revives and the real-time
// countdown. Pure functions; the zustand store in useSession.ts just holds the current value.
import { ECONOMY } from '../config/economy';
import { POWERUP_TUNING, type PowerUpId } from '../config/powerups';
import { withEcho } from '../game/echo';
import { initialState, step } from '../game/engine';
import { activeChannels } from '../game/entities/channels';
import { isDoorClosed } from '../game/entities/lasers';
import type { Action, GameState, Room, StepEvent } from '../game/types';

export type SessionKind = 'campaign' | 'daily' | 'bonus' | 'interlude';

export interface Snapshot {
  state: GameState;
  history: GameState[];
  actions: Action[];
  timeLeftMs?: number;
}

export interface Session {
  kind: SessionKind;
  /** The room being played. In echo rooms this carries the current echo track. */
  room: Room;
  /** The room without any echo track (what a restart rebuilds from). */
  base: Room;
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
  /** Shield power-up armed: the next fatal action is cancelled instead. */
  shieldArmed: boolean;
  /** Power-ups spent in this room visit (kept across restarts, for analytics). */
  powerupsUsed: PowerUpId[];
  /** Actions of the current attempt (undo removes them). In echo rooms this is the next echo. */
  actions: Action[];
  /** Cells stood on during the current attempt, for room memory (routes taken). */
  visited: number[];
  /** Revives used during this whole visit (revivesUsed resets per attempt). */
  revivesTotal: number;
  /** Identifies one visit to a room (stays the same across restarts). */
  visit: number;
}

let visits = 0;

const MAX_HISTORY = 500;

export function newSession(room: Room, kind: SessionKind, day?: string, echoTrack?: readonly Action[]): Session {
  const played = withEcho(room, echoTrack);
  const base = withEcho(room, undefined);
  return {
    kind,
    room: played,
    base,
    day,
    state: initialState(played),
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
    shieldArmed: false,
    powerupsUsed: [],
    actions: [],
    visited: [room.start],
    revivesTotal: 0,
    visit: ++visits,
  };
}

/** Doors that opened or closed between two states (for sound and haptics; not a rule). */
export function doorChanges(room: Room, a: GameState, b: GameState): { opened: number[]; closed: number[] } {
  const opened: number[] = [];
  const closed: number[] = [];
  let ca = -1;
  let cb = -1;
  for (let i = 0; i < room.tiles.length; i++) {
    if (room.tiles[i].k !== 'door') continue;
    if (ca === -1) {
      ca = activeChannels(room, a);
      cb = activeChannels(room, b);
    }
    const wasClosed = isDoorClosed(room, a, i, ca);
    const isClosed = isDoorClosed(room, b, i, cb);
    if (wasClosed && !isClosed) opened.push(i);
    if (!wasClosed && isClosed) closed.push(i);
  }
  return { opened, closed };
}

export const isPlaying = (s: Session) => s.state.status === 'playing' && !s.timedOut;

export function act(s: Session, a: Action): Session {
  if (!isPlaying(s)) return s;
  const r = step(s.room, s.state, a);
  if (!r.valid) return { ...s, events: r.events, seq: s.seq + 1 };
  // Shield: a fatal action (other than running out of moves) is cancelled and the shield is spent.
  if (r.state.status === 'dead' && s.shieldArmed && r.state.death !== 'moves') {
    return {
      ...s,
      shieldArmed: false,
      events: [{ type: 'shielded', at: s.state.player, cause: r.state.death ?? 'spikes' }],
      seq: s.seq + 1,
    };
  }
  const doors = doorChanges(s.room, s.state, r.state);
  const events: StepEvent[] = doors.opened.length || doors.closed.length ? [...r.events, { type: 'doors', ...doors }] : r.events;
  let next: Session = {
    ...s,
    state: r.state,
    history: [...s.history, s.state].slice(-MAX_HISTORY),
    actions: [...s.actions, a].slice(-MAX_HISTORY),
    visited: s.visited.includes(r.state.player) ? s.visited : [...s.visited, r.state.player],
    events,
    seq: s.seq + 1,
  };
  if (r.events.some((e) => e.type === 'checkpoint') && r.state.status === 'playing') {
    next = { ...next, checkpoint: { state: r.state, history: next.history, actions: next.actions, timeLeftMs: s.timeLeftMs } };
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
    actions: s.actions.slice(0, -1),
    usedUndo: true,
    undoCount: s.undoCount + 1,
    timedOut: false,
    events: [],
    seq: s.seq + 1,
  };
}

/**
 * A fresh attempt. Temporary state (position, history, checkpoint, power-up effects, timer)
 * resets; visit counters carry over. In echo rooms the attempt just abandoned becomes the echo
 * (an empty attempt keeps the previous echo instead of erasing it).
 */
export function restart(s: Session): Session {
  const track = s.base.echo ? (s.actions.length ? s.actions : s.room.echoTrack) : undefined;
  const fresh = newSession(s.base, s.kind, s.day, track);
  return {
    ...fresh,
    attempt: s.attempt + 1,
    failedAttempts: s.failedAttempts,
    usedUndo: s.usedUndo,
    undoCount: s.undoCount,
    hintsUsed: s.hintsUsed,
    powerupsUsed: s.powerupsUsed,
    revivesTotal: s.revivesTotal,
    visit: s.visit,
    seq: s.seq + 1,
  };
}

export function restoreCheckpoint(s: Session): Session {
  if (!s.checkpoint) return restart(s);
  return {
    ...s,
    state: s.checkpoint.state,
    history: s.checkpoint.history,
    actions: s.checkpoint.actions,
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
  const base = { ...s, revivesUsed: s.revivesUsed + 1, revivesTotal: s.revivesTotal + 1, events: [], seq: s.seq + 1 };
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
  return { ...base, state: prev, history: s.history.slice(0, -1), actions: s.actions.slice(0, -1) };
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

// ---- Power-ups ----------------------------------------------------------------------------

export const roomHasClock = (room: Room) =>
  room.drones.length + room.platforms.length > 0 || room.tags.some((t) => t.startsWith('timed'));

/** Rooms where waiting a turn can matter (a clock, or an echo walking on its own). */
export const roomNeedsWait = (room: Room) => roomHasClock(room) || !!room.echo;

export type PowerUpBlock = 'not_playing' | 'already_active' | 'no_effect';

/** Why a power-up can't be used right now, or null if it can. */
export function powerUpBlocked(s: Session, id: PowerUpId): PowerUpBlock | null {
  if (!isPlaying(s)) return 'not_playing';
  switch (id) {
    case 'pathfinder':
      return (s.state.frozen ?? 0) > 0 ? 'already_active' : null;
    case 'shield':
      return s.shieldArmed ? 'already_active' : null;
    case 'overclock':
      return s.room.moveLimit === undefined && s.timeLeftMs === undefined ? 'no_effect' : null;
    case 'freeze':
      if (!roomHasClock(s.room)) return 'no_effect';
      return (s.state.frozen ?? 0) > 0 ? 'already_active' : null;
  }
}

/** Applies the in-room effect. Pathfinder has no state effect; the UI shows the route. */
export function applyPowerUp(s: Session, id: PowerUpId): Session {
  if (powerUpBlocked(s, id)) return s;
  const base = { ...s, powerupsUsed: [...s.powerupsUsed, id], seq: s.seq + 1, events: [] };
  switch (id) {
    case 'pathfinder':
      return base;
    case 'shield':
      return { ...base, shieldArmed: true };
    case 'overclock':
      return {
        ...base,
        state: s.room.moveLimit !== undefined ? { ...s.state, bonusMoves: s.state.bonusMoves + POWERUP_TUNING.overclockMoves } : s.state,
        timeLeftMs: s.timeLeftMs !== undefined ? s.timeLeftMs + POWERUP_TUNING.overclockSeconds * 1000 : undefined,
      };
    case 'freeze':
      return { ...base, state: { ...s.state, frozen: POWERUP_TUNING.freezeTurns } };
  }
}
