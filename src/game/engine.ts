// The rules of One Room Left. Every function here is pure: given a room and a state,
// `step` returns the next state. The UI, the solver and the tests all use this one module,
// so the solver can never disagree with what the player experiences.
//
// Turn order for a single action:
//   1. Validate and resolve the player's move (walls, doors, locks, pushes, pits).
//   2. Apply terrain effects: crumbling floor collapses behind the player, teleporters,
//      item pickups, switches.
//   3. Advance the clock one turn: platforms carry the player, drones move.
//   4. Resolve hazards at the new turn: drones, spikes, lasers, falling.
//   5. Check the win condition (exit + all cores), then the move limit.

import { activeChannels } from './entities/channels';
import { hasPlatformAt, spikesRaised } from './entities/hazards';
import { isDoorClosed, laserCells } from './entities/lasers';
import { routeCellAt } from './entities/routes';
import { effectiveTile } from './entities/terrain';
import { neighbor } from './grid';
import type { Action, GameState, Room, StepEvent, StepResult } from './types';

export interface EngineOptions {
  /** Treat coins as required objectives (used to verify hidden collectibles are reachable). */
  requireCoins?: boolean;
}

export function initialState(room: Room): GameState {
  return {
    tick: 0,
    moves: 0,
    player: room.start,
    blocks: [...room.blocks].sort((a, b) => a - b),
    itemsTaken: 0,
    keys: { gold: 0, blue: 0 },
    switches: 0,
    mods: {},
    status: 'playing',
    bonusMoves: 0,
  };
}

export const itemTaken = (s: GameState, i: number) => (s.itemsTaken & (1 << i)) !== 0;

export function itemAt(room: Room, s: GameState, cell: number): number {
  for (let i = 0; i < room.items.length; i++) {
    if (room.items[i].cell === cell && !itemTaken(s, i)) return i;
  }
  return -1;
}

export function remainingCores(room: Room, s: GameState): number {
  let n = 0;
  room.items.forEach((it, i) => {
    if (it.kind === 'core' && !itemTaken(s, i)) n++;
  });
  return n;
}

function remainingCoins(room: Room, s: GameState): number {
  let n = 0;
  room.items.forEach((it, i) => {
    if (it.kind === 'coin' && !itemTaken(s, i)) n++;
  });
  return n;
}

export const movesAllowed = (room: Room, s: GameState) =>
  room.moveLimit === undefined ? Infinity : room.moveLimit + s.bonusMoves;

export function exitOpen(room: Room, s: GameState, opts: EngineOptions = {}): boolean {
  return remainingCores(room, s) === 0 && (!opts.requireCoins || remainingCoins(room, s) === 0);
}

/** Can the player stand on this cell right now (before the turn advances)? */
function playerCanEnter(room: Room, s: GameState, cell: number, channels: number): boolean {
  const t = effectiveTile(room, s, cell);
  switch (t.k) {
    case 'wall':
    case 'emitter':
      return false;
    case 'door':
      return !isDoorClosed(room, s, cell, channels);
    case 'lock':
      return s.keys[t.color] > 0;
    case 'pit':
      return hasPlatformAt(room, s.tick, cell);
    default:
      return true;
  }
}

/** Can a pushed block come to rest on (or fill) this cell? */
function blockCanEnter(room: Room, s: GameState, cell: number, channels: number): boolean {
  if (s.blocks.includes(cell) || itemAt(room, s, cell) !== -1) return false;
  const t = effectiveTile(room, s, cell);
  switch (t.k) {
    case 'floor':
    case 'plate':
    case 'crumble':
    case 'spikes':
    case 'checkpoint':
      return true;
    case 'door':
      return !isDoorClosed(room, s, cell, channels);
    case 'pit':
      return !hasPlatformAt(room, s.tick, cell);
    default:
      return false; // walls, emitters, locks, exits, switches, teleporters
  }
}

function partnerTeleporter(room: Room, cell: number): number {
  const t = room.tiles[cell];
  if (t.k !== 'tele') return -1;
  for (let i = 0; i < room.tiles.length; i++) {
    const o = room.tiles[i];
    if (i !== cell && o.k === 'tele' && o.pair === t.pair) return i;
  }
  return -1;
}

export function step(room: Room, prev: GameState, action: Action, opts: EngineOptions = {}): StepResult {
  if (prev.status !== 'playing') return { state: prev, valid: false, events: [] };
  const events: StepEvent[] = [];
  const channelsBefore = activeChannels(room, prev);
  const from = prev.player;
  let target = from;
  let blocks = prev.blocks;
  let mods = prev.mods;
  let keys = prev.keys;

  // 1. Resolve the player's move.
  if (action !== 'wait') {
    target = neighbor(room.width, room.height, from, action);
    if (target === -1 || !playerCanEnter(room, prev, target, channelsBefore)) {
      return { state: prev, valid: false, events: [{ type: 'bump', at: target === -1 ? from : target }] };
    }
    if (prev.blocks.includes(target)) {
      const beyond = neighbor(room.width, room.height, target, action);
      if (beyond === -1 || !blockCanEnter(room, prev, beyond, channelsBefore)) {
        return { state: prev, valid: false, events: [{ type: 'bump', at: target }] };
      }
      const rest = prev.blocks.filter((b) => b !== target);
      if (effectiveTile(room, prev, beyond).k === 'pit') {
        mods = { ...mods, [beyond]: 'floor' };
        blocks = rest;
        events.push({ type: 'push', from: target, to: beyond }, { type: 'fill', at: beyond });
      } else {
        blocks = [...rest, beyond].sort((a, b) => a - b);
        events.push({ type: 'push', from: target, to: beyond });
      }
    }
    const tt = effectiveTile(room, prev, target);
    if (tt.k === 'lock') {
      keys = { ...keys, [tt.color]: keys[tt.color] - 1 };
      mods = { ...mods, [target]: 'floor' };
      events.push({ type: 'unlock', at: target });
    }
    events.push({ type: 'move', from, to: target });
  }

  // 2. Terrain effects of moving.
  let player = target;
  let itemsTaken = prev.itemsTaken;
  let switches = prev.switches;
  if (action !== 'wait') {
    if (effectiveTile(room, prev, from).k === 'crumble') {
      mods = { ...mods, [from]: 'pit' };
      events.push({ type: 'crumble', at: from });
    }
    const t = effectiveTile(room, prev, target);
    if (t.k === 'tele') {
      const dest = partnerTeleporter(room, target);
      if (dest !== -1 && !blocks.includes(dest)) {
        player = dest;
        events.push({ type: 'teleport', from: target, to: dest });
      }
    }
    if (t.k === 'switch') {
      switches ^= 1 << t.ch;
      events.push({ type: 'switch', at: target, ch: t.ch, on: (switches & (1 << t.ch)) !== 0 });
    }
    if (t.k === 'checkpoint') events.push({ type: 'checkpoint', at: target });
    const it = itemAt(room, { ...prev, itemsTaken }, player);
    if (it !== -1) {
      itemsTaken |= 1 << it;
      const item = room.items[it];
      if (item.kind === 'key' && item.color) keys = { ...keys, [item.color]: keys[item.color] + 1 };
      events.push({ type: 'pickup', item: it, kind: item.kind });
    }
  }

  // 3. Advance the clock.
  const tick = prev.tick + 1;
  const moved = player;
  const onPit = effectiveTile(room, { ...prev, mods }, player).k === 'pit';
  for (const p of room.platforms) {
    if (onPit && routeCellAt(p, prev.tick) === player) {
      const to = routeCellAt(p, tick);
      if (to !== player) events.push({ type: 'carried', from: player, to });
      player = to;
      break;
    }
  }

  let next: GameState = {
    tick,
    moves: prev.moves + 1,
    player,
    blocks,
    itemsTaken,
    keys,
    switches,
    mods,
    status: 'playing',
    bonusMoves: prev.bonusMoves,
  };

  // 4. Hazards at the new turn.
  const die = (cause: GameState['death'] & string): StepResult => {
    events.push({ type: 'death', cause });
    return { state: { ...next, status: 'dead', death: cause }, valid: true, events };
  };
  for (const d of room.drones) {
    const before = routeCellAt(d, prev.tick);
    const after = routeCellAt(d, tick);
    if (after === player) return die('drone');
    // Swapping places with a drone also counts as a collision.
    if (before === moved && after === from && moved !== from) return die('drone');
  }
  const channels = activeChannels(room, next);
  const tile = effectiveTile(room, next, player);
  if (tile.k === 'pit' && !hasPlatformAt(room, tick, player)) return die('fall');
  if (spikesRaised(tile, tick, channels)) return die('spikes');
  if (laserCells(room, next, channels).has(player)) return die('laser');

  // 5. Win, then move limit.
  if (tile.k === 'exit') {
    if (exitOpen(room, next, opts)) {
      events.push({ type: 'win' });
      next = { ...next, status: 'won' };
      return { state: next, valid: true, events };
    }
    events.push({ type: 'exitSealed', at: player });
  }
  if (next.moves >= movesAllowed(room, next)) return die('moves');
  return { state: next, valid: true, events };
}

/** Replays a list of actions from the initial state. Invalid actions are skipped. */
export function replay(room: Room, actions: Action[], opts: EngineOptions = {}): GameState {
  let s = initialState(room);
  for (const a of actions) s = step(room, s, a, opts).state;
  return s;
}

/** Stable key used by the solver and to match states against stored solutions. */
export function stateKey(s: GameState, tickPeriod: number): string {
  const mods = Object.keys(s.mods)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => `${k}${s.mods[k] === 'pit' ? 'p' : 'f'}`)
    .join(',');
  return `${s.player}|${s.blocks.join(',')}|${s.itemsTaken}|${s.keys.gold}.${s.keys.blue}|${s.switches}|${mods}|${tickPeriod > 1 ? s.tick % tickPeriod : 0}`;
}
