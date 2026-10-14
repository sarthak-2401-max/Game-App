// Level-design assistant: hill-climbs over the variable cells of a hand-drawn template to find
// layouts with longer solutions and more meaningful (losing) choices. Output is a candidate map
// that a designer then reviews, edits and commits by hand — nothing it prints ships unreviewed.
//
// Template variables:  ? -> . or #   b -> . or B   q -> . # B   c -> . or %   g -> . # w W   h -> % or #
// Usage: npx tsx scripts/forge.ts <template.json> [iterations] [seed]
import { readFileSync } from 'node:fs';
import { parseLevel, type LevelSpec } from '../src/game/levelFormat';
import { analyze, encodeSolution, solve } from '../src/game/solver/solver';
import { validateStructure } from '../src/game/validator';

const VARS: Record<string, string[]> = {
  '?': ['.', '#'],
  b: ['.', 'B'],
  q: ['.', '#', 'B'],
  c: ['.', '%'],
  g: ['.', '#', 'w', 'W'], // needs W (spikes raised while ch0 is on) in the template legend
  h: ['%', '#'],
  y: ['.', 'w', 'W'], // needs W in the template legend
};
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8')) as LevelSpec & { minLen?: number; maxLen?: number };
const iters = Number(process.argv[3] ?? 400);
let seed = Number(process.argv[4] ?? 1);
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const cells: [number, number, string[]][] = [];
spec.map.forEach((row, r) => [...row].forEach((ch, c) => VARS[ch] && cells.push([r, c, VARS[ch]])));
const grid = spec.map.map((r) => [...r].map((ch) => (VARS[ch] ? VARS[ch][0] : ch)));
cells.forEach(([r, c, opts]) => (grid[r][c] = opts[Math.floor(rand() * opts.length)]));

function score(g: string[][]): { s: number; info: string } {
  const map = g.map((r) => r.join(''));
  let room;
  try {
    room = parseLevel({ ...spec, map }, 'forge', 0, 0);
  } catch {
    return { s: -1, info: 'parse' };
  }
  if (validateStructure(room).length) return { s: -1, info: 'invalid' };
  const res = solve(room, { maxNodes: 150_000 });
  if (!res.solvable) return { s: -1, info: 'unsolvable' };
  const n = res.solution.length;
  if (spec.maxLen && n > spec.maxLen) return { s: 0, info: `too long ${n}` };
  const a = analyze(room, res.solution, 80_000);
  const deadRatio = a.deadEnds / Math.max(1, a.reachable);
  const s = n + 2 * a.criticalChoices + 20 * deadRatio + (spec.minLen && n < spec.minLen ? -50 : 0);
  return { s, info: `min=${n} crit=${a.criticalChoices} dead=${a.deadEnds}/${a.reachable} sol=${encodeSolution(res.solution)}` };
}

let cur = score(grid);
let best = { ...cur, grid: grid.map((r) => [...r]) };
for (let i = 0; i < iters; i++) {
  const [r, c, opts] = cells[Math.floor(rand() * cells.length)];
  const old = grid[r][c];
  grid[r][c] = opts[Math.floor(rand() * opts.length)];
  if (grid[r][c] === old) continue;
  const sc = score(grid);
  if (sc.s >= cur.s || rand() < 0.03) {
    cur = sc;
    if (sc.s > best.s) {
      best = { ...sc, grid: grid.map((row) => [...row]) };
      console.error(`#${i} score=${sc.s.toFixed(1)} ${sc.info}`);
    }
  } else grid[r][c] = old;
}
console.log(best.info);
console.log(JSON.stringify(best.grid.map((r) => r.join('')), null, 2));
