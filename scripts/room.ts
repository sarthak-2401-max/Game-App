// Debug view for one room: prints the map, the solver result and the solution replayed turn by turn.
// Usage: npx tsx scripts/room.ts <roomNumber|dailyId> [--steps]
import { CAMPAIGN } from '../src/game/levels';
import { BONUS_ROOMS, DAILY_ROOMS } from '../src/game/daily/catalog';
import { initialState, step } from '../src/game/engine';
import { activeChannels } from '../src/game/entities/channels';
import { droneCells, platformCells, spikesRaised } from '../src/game/entities/hazards';
import { isDoorClosed, laserCells } from '../src/game/entities/lasers';
import { effectiveTile } from '../src/game/entities/terrain';
import { encodeSolution, solve } from '../src/game/solver/solver';
import type { GameState, Room } from '../src/game/types';

const arg = process.argv[2];
const room: Room | undefined = /^\d+$/.test(arg) ? CAMPAIGN[Number(arg) - 1] : [...DAILY_ROOMS, ...BONUS_ROOMS].find((r) => r.id === arg);
if (!room) throw new Error('room not found');

function render(s: GameState): string {
  const ch = activeChannels(room!, s);
  const beams = laserCells(room!, s, ch);
  const drones = droneCells(room!, s.tick);
  const plats = platformCells(room!, s.tick);
  let out = '';
  for (let r = 0; r < room!.height; r++) {
    for (let c = 0; c < room!.width; c++) {
      const i = r * room!.width + c;
      const t = effectiveTile(room!, s, i);
      let g = '.';
      if (t.k === 'wall') g = '#';
      else if (t.k === 'exit') g = 'E';
      else if (t.k === 'pit') g = plats.includes(i) ? '=' : '~';
      else if (t.k === 'crumble') g = '%';
      else if (t.k === 'spikes') g = spikesRaised(t, s.tick, ch) ? '^' : ',';
      else if (t.k === 'plate') g = '_';
      else if (t.k === 'switch') g = 's';
      else if (t.k === 'door') g = isDoorClosed(room!, s, i, ch) ? 'D' : "'";
      else if (t.k === 'lock') g = 'L';
      else if (t.k === 'tele') g = 'T';
      else if (t.k === 'emitter') g = { up: 'A', down: 'v', left: '<', right: '>' }[t.dir];
      else if (t.k === 'checkpoint') g = 'C';
      if (beams.has(i) && g === '.') g = '-';
      const it = room!.items.findIndex((x, n) => x.cell === i && !(s.itemsTaken & (1 << n)));
      if (it !== -1) g = { key: 'k', core: '*', coin: '$' }[room!.items[it].kind];
      if (s.blocks.includes(i)) g = 'B';
      if (drones.includes(i)) g = 'X';
      if (s.player === i) g = s.status === 'dead' ? '@' : 'P';
      out += g;
    }
    out += '\n';
  }
  return out;
}

console.log(`${room.id} ${room.name} ${room.width}x${room.height} tags=${room.tags.join(',')}`);
console.log(render(initialState(room)));
const res = solve(room);
console.log(res.solvable ? `solution (${res.solution.length}): ${encodeSolution(res.solution)}` : `UNSOLVABLE explored=${res.explored}`);
if (res.solvable && process.argv.includes('--steps')) {
  let s = initialState(room);
  for (const a of res.solution) {
    s = step(room, s, a).state;
    console.log(`t=${s.tick} ${a}\n${render(s)}`);
  }
}
