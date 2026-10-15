// Holds the active room session. Game rules live in ../game and ./session; this store only
// sequences them and records attempts/failures in the save.
import { create } from 'zustand';
import type { Action, Room } from '../game/types';
import { analytics } from '../services/analytics/analytics';
import { useApp } from './useApp';
import { recordAttempt, recordFailure } from './progression';
import { consumePowerUp } from './powerups';
import { memoryView, noteDeathMemory, noteHintMemory, noteReviveMemory } from './memory';
import { resolveRoom } from '../game/observer/observer';
import type { PowerUpId } from '../config/powerups';
import * as S from './session';

interface SessionState {
  session: S.Session | null;
  paused: boolean;
  start(room: Room, kind: S.SessionKind, day?: string): void;
  act(a: Action): void;
  undo(): void;
  restart(): void;
  fromCheckpoint(): void;
  tick(ms: number): void;
  revive(): void;
  setPaused(p: boolean): void;
  noteHint(): void;
  /** Spends one power-up from the inventory and applies it. */
  spendPowerUp(id: PowerUpId): S.PowerUpBlock | 'none_left' | null;
  clear(): void;
}

const props = (s: S.Session) => ({
  room_id: s.room.id,
  chapter: s.room.chapter,
  kind: s.kind,
  attempt: s.attempt,
});

function afterChange(prev: S.Session, next: S.Session) {
  const failedNow = (next.state.status === 'dead' && prev.state.status !== 'dead') || (next.timedOut && !prev.timedOut);
  if (failedNow) {
    useApp.getState().update((sv) => noteDeathMemory(recordFailure(sv, next.room), next.room));
    analytics.track('level_failed', { ...props(next), cause: next.timedOut ? 'timeout' : next.state.death, moves: next.state.moves });
  }
}

/** Time to first interaction and to first escape, measured once per install. */
function noteFirstSession(won: boolean) {
  const app = useApp.getState();
  const st = app.save.stats;
  const ms = Date.now() - app.openedAt;
  if (st.firstMoveMs === undefined) {
    app.update((sv) => ({ ...sv, stats: { ...sv.stats, firstMoveMs: ms } }));
    analytics.track('first_interaction', { ms });
  }
  if (won && st.firstWinMs === undefined) {
    app.update((sv) => ({ ...sv, stats: { ...sv.stats, firstWinMs: ms } }));
    analytics.track('first_completion', { ms });
  }
}

export const useSession = create<SessionState>((set, get) => ({
  session: null,
  paused: false,

  start(room, kind, day) {
    // Campaign rooms can have room-memory variants (each one solver-verified).
    const played = kind === 'campaign' ? resolveRoom(room, memoryView(useApp.getState().save)) : room;
    const session = S.newSession(played, kind, day);
    set({ session, paused: false });
    useApp.getState().update((sv) => recordAttempt(sv, room));
    analytics.track(kind === 'daily' ? 'daily_challenge_started' : 'level_started', props(session));
    if (kind === 'campaign' && room.index === 1 && !useApp.getState().save.tutorialCompleted) {
      analytics.track('tutorial_started', {});
    }
  },

  act(a) {
    const s = get().session;
    if (!s || get().paused) return;
    const next = S.act(s, a);
    set({ session: next });
    if (next.state !== s.state) noteFirstSession(next.state.status === 'won');
    afterChange(s, next);
  },

  undo() {
    const s = get().session;
    if (!s || !S.isPlaying(s)) return; // no undo after a failure; use Retry or a revive
    const next = S.undo(s);
    if (next !== s) {
      set({ session: next });
      useApp.getState().update((sv) => ({ ...sv, stats: { ...sv.stats, undos: sv.stats.undos + 1 } }));
      analytics.track('undo_used', props(next));
    }
  },

  restart() {
    const s = get().session;
    if (!s) return;
    const next = S.restart(s);
    set({ session: next, paused: false });
    useApp.getState().update((sv) => recordAttempt(sv, s.room));
    analytics.track('level_restarted', props(next));
  },

  fromCheckpoint() {
    const s = get().session;
    if (!s) return;
    set({ session: S.restoreCheckpoint(s), paused: false });
    analytics.track('level_restarted', { ...props(s), from: 'checkpoint' });
  },

  tick(ms) {
    const s = get().session;
    if (!s || get().paused) return;
    const next = S.tickTimer(s, ms);
    if (next !== s) {
      set({ session: next });
      afterChange(s, next);
    }
  },

  revive() {
    const s = get().session;
    if (!s) return;
    const next = S.applyRevive(s);
    if (next === s) return;
    set({ session: next });
    useApp.getState().update((sv) => noteReviveMemory(sv, s.room));
  },

  setPaused(p) {
    set({ paused: p });
  },

  noteHint() {
    const s = get().session;
    if (!s) return;
    set({ session: { ...s, hintsUsed: s.hintsUsed + 1 } });
    useApp.getState().update((sv) => noteHintMemory({ ...sv, stats: { ...sv.stats, hintsUsed: sv.stats.hintsUsed + 1 } }, s.room));
  },

  spendPowerUp(id) {
    const s = get().session;
    if (!s) return 'not_playing';
    const blocked = S.powerUpBlocked(s, id);
    if (blocked) return blocked;
    const app = useApp.getState();
    const spent = consumePowerUp(app.save, id);
    if (!spent) return 'none_left';
    app.update(() => spent);
    set({ session: S.applyPowerUp(s, id) });
    if (id === 'pathfinder') app.update((sv) => noteHintMemory(sv, s.room));
    analytics.track('powerup_used', { ...props(s), powerup: id });
    return null;
  },

  clear() {
    set({ session: null, paused: false });
  },
}));
