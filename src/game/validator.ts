// Level validation. Structural checks are cheap and run at load time in the app (invalid rooms
// are reported instead of crashing). Solvability checks drive the real engine through the
// solver and run in tests and in `npm run levels:report`.

import { initialState, remainingCores } from './engine';
import { routeCellAt } from './entities/routes';
import { solve, type SolveResult } from './solver/solver';
import type { Room } from './types';

export const GRID_LIMITS = { minW: 3, maxW: 9, minH: 3, maxH: 12 };
/** Real-time budget per turn used to check that countdowns are fair. */
export const SECONDS_PER_TURN = 0.9;
export const TIMER_GRACE_SECONDS = 6;

export interface ValidationIssue {
  room: string;
  message: string;
}

const PASSABLE_FOR_ITEMS = new Set(['floor', 'checkpoint', 'plate', 'crumble']);

export function validateStructure(room: Room): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ room: room.id, message });
  const { width: w, height: h, tiles } = room;

  if (w < GRID_LIMITS.minW || w > GRID_LIMITS.maxW) err(`width ${w} outside ${GRID_LIMITS.minW}-${GRID_LIMITS.maxW}`);
  if (h < GRID_LIMITS.minH || h > GRID_LIMITS.maxH) err(`height ${h} outside ${GRID_LIMITS.minH}-${GRID_LIMITS.maxH}`);
  if (tiles.length !== w * h) err(`tile count ${tiles.length} != ${w * h}`);
  if (!tiles.some((t) => t.k === 'exit')) err('no exit');
  const startTile = tiles[room.start];
  if (!startTile || !['floor', 'checkpoint'].includes(startTile.k)) err('player must start on floor');

  const occupied = new Map<number, string>();
  const claim = (cell: number, what: string) => {
    const prev = occupied.get(cell);
    if (prev) err(`${what} overlaps ${prev} at cell ${cell}`);
    occupied.set(cell, what);
  };
  claim(room.start, 'player');
  for (const b of room.blocks) {
    if (!['floor', 'plate', 'checkpoint', 'crumble'].includes(tiles[b]?.k)) err(`block on ${tiles[b]?.k} at ${b}`);
    claim(b, 'block');
  }
  room.items.forEach((it) => {
    if (!PASSABLE_FOR_ITEMS.has(tiles[it.cell]?.k)) err(`${it.kind} on ${tiles[it.cell]?.k} at ${it.cell}`);
    claim(it.cell, it.kind);
  });
  if (room.items.length > 30) err('too many items (max 30)');

  const pairs = new Map<number, number>();
  const channelsUsed = new Set<number>();
  const channelsDriven = new Set<number>();
  tiles.forEach((t) => {
    if (t.k === 'tele') pairs.set(t.pair, (pairs.get(t.pair) ?? 0) + 1);
    if (t.k === 'switch' || t.k === 'plate') channelsDriven.add(t.ch);
    if (t.k === 'door') channelsUsed.add(t.ch);
    if (t.k === 'spikes' && t.mode.kind === 'channel') channelsUsed.add(t.mode.ch);
    if (t.k === 'emitter' && t.ch !== undefined) channelsUsed.add(t.ch);
    if (t.k === 'spikes' && t.mode.kind === 'timed') {
      const tm = t.mode.timing;
      if (tm.period < 2 || tm.on < 1 || tm.on >= tm.period) err('timed spikes need 0 < on < period');
    }
  });
  pairs.forEach((n, p) => n !== 2 && err(`teleporter pair ${p} has ${n} ends (needs 2)`));
  channelsUsed.forEach((c) => !channelsDriven.has(c) && err(`channel ${c} has no switch or plate`));
  channelsDriven.forEach((c) => !channelsUsed.has(c) && err(`channel ${c} controls nothing`));

  const keys = { gold: 0, blue: 0 };
  const locks = { gold: 0, blue: 0 };
  room.items.forEach((it) => it.kind === 'key' && it.color && keys[it.color]++);
  tiles.forEach((t) => t.k === 'lock' && locks[t.color]++);
  (['gold', 'blue'] as const).forEach((c) => {
    if (locks[c] > 0 && keys[c] === 0) err(`${c} lock with no ${c} key`);
    if (keys[c] > 0 && locks[c] === 0) err(`${c} key with no ${c} lock`);
  });

  room.drones.forEach((d, n) => {
    d.cells.forEach((c) => tiles[c]?.k === 'wall' && err(`drone ${n} path crosses a wall`));
    if (routeCellAt(d, 0) === room.start) err(`drone ${n} starts on the player`);
  });
  room.platforms.forEach((p, n) => {
    p.cells.forEach((c) => tiles[c]?.k !== 'pit' && err(`platform ${n} path must stay over pits`));
  });
  if (room.moveLimit !== undefined && room.moveLimit < 1) err('move limit must be positive');
  if (room.timeLimit !== undefined && room.timeLimit < 10) err('time limit too short');
  const s0 = initialState(room);
  if (remainingCores(room, s0) === 0 && room.items.some((i) => i.kind === 'core')) err('core accounting');
  return issues;
}

export interface SolvabilityReport {
  issues: ValidationIssue[];
  result: SolveResult;
  coinsResult?: SolveResult;
}

export function validateSolvable(room: Room, maxNodes = 2_000_000): SolvabilityReport {
  const issues: ValidationIssue[] = [];
  const err = (message: string) => issues.push({ room: room.id, message });
  const result = solve(room, { maxNodes });
  if (result.truncated) err(`solver hit node cap (${maxNodes}) without an answer`);
  else if (!result.solvable) err('no solution exists under the game rules');
  const n = result.solution.length;
  if (result.solvable && room.moveLimit !== undefined && n > room.moveLimit) err(`move limit ${room.moveLimit} < shortest ${n}`);
  if (result.solvable && room.timeLimit !== undefined) {
    const need = Math.ceil(n * SECONDS_PER_TURN + TIMER_GRACE_SECONDS);
    if (room.timeLimit < need) err(`time limit ${room.timeLimit}s < fair budget ${need}s for ${n} turns`);
  }
  let coinsResult: SolveResult | undefined;
  if (result.solvable && room.items.some((i) => i.kind === 'coin')) {
    coinsResult = solve(room, { maxNodes, requireCoins: true });
    if (!coinsResult.solvable) err('not every coin can be collected on a winning run');
  }
  return { issues, result, coinsResult };
}
