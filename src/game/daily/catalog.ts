// Daily challenge catalog and bonus rooms. Independent of the 100-room campaign, validated by
// the same solver. Adding entries extends the rotation without code changes elsewhere.
import { parseLevel, type LevelSpec } from '../levelFormat';
import { door, drone, laser, plate, platform, timedSpikes } from '../levels/legend';
import type { Room } from '../types';

const DAILY_SPECS: LevelSpec[] = [
  {
    name: 'Morning Rush',
    legend: { X: drone('RRRRRR'), Y: drone('LLLLLL', 'pingpong', 3), Z: drone('RRRRRR', 'pingpong', 5) },
    map: [
      '#########',
      '#P.....$#',
      '#X......#',
      '#......Y#',
      '#Z......#',
      '#.....*E#',
      '#########',
    ],
  },
  {
    name: 'Key Hunt',
    map: [
      '#########',
      '#P.#k..j#',
      '#..#.##.#',
      '#.....L.#',
      '##J###..#',
      '#*....#E#',
      '#########',
    ],
  },
  {
    name: 'Crate Shuffle',
    map: [
      '#######',
      '#P....#',
      '#.B.B.#',
      '#..#_.#',
      '#.B...#',
      '###d###',
      '#E...*#',
      '#######',
    ],
  },
  {
    name: 'Spike Waltz',
    legend: { a: timedSpikes(3, 1, 0), b: timedSpikes(3, 1, 1), c: timedSpikes(3, 1, 2) },
    map: [
      '#########',
      '#P.abc..#',
      '#.#####c#',
      '#..cba..#',
      '#b#####.#',
      '#.abc.*E#',
      '#########',
    ],
  },
  {
    name: 'Portal Hop',
    map: [
      '#########',
      '#P.T#*.U#',
      '#...#...#',
      '#####.###',
      '#U..#T.*#',
      '#.E.#...#',
      '#########',
    ],
  },
  {
    name: 'Laser Dodge',
    legend: { a: laser('down', { timing: [3, 1, 0] }), b: laser('down', { timing: [3, 1, 1] }), c: laser('down', { timing: [3, 1, 2] }) },
    map: [
      '##a#b#c##',
      '#.......#',
      '#P.....E#',
      '#.......#',
      '#...*...#',
      '#########',
    ],
  },
  {
    name: 'Crumble Run',
    map: [
      '#######',
      '#P%%%*#',
      '#%#%#%#',
      '#%%*%%#',
      '#%#%#%#',
      '#*%%%.#',
      '#####E#',
      '#######',
    ],
  },
  {
    name: 'Switch Flip',
    legend: { W: { tile: { k: 'spikes', mode: { kind: 'channel', ch: 0, raisedWhenActive: true } } } },
    map: [
      '#########',
      '#P.ww.s*#',
      '#.#W#.#.#',
      '#.WsW.w.#',
      '#.#w#.#W#',
      '#*.WwW.E#',
      '#########',
    ],
  },
  {
    name: 'Ferry Day',
    legend: { p: platform('RRRR'), q: platform('RRRR', 'pingpong', 2) },
    map: [
      '#########',
      '#P.p~~~~#',
      '#######.#',
      '#.q~~~~.#',
      '#.#######',
      '#*.....E#',
      '#########',
    ],
  },
  {
    name: 'Clockwatch',
    timeLimit: 35,
    map: [
      '#########',
      '#P..#..*#',
      '#.#.#.#.#',
      '#.#...#.#',
      '#.#####.#',
      '#*..k..L#',
      '#######E#',
      '#########',
    ],
  },
  {
    name: 'Pressure Point',
    legend: { o: plate(1), D: door(1) },
    map: [
      '#########',
      '#P......#',
      '#.B.#B..#',
      '#._..o.B#',
      '####d####',
      '#E.D....#',
      '#########',
    ],
  },
  {
    name: 'Minimalist',
    moveLimit: 16,
    map: [
      '#########',
      '#P..^...#',
      '#.#.#.#.#',
      '#...^...#',
      '#^#.#.#^#',
      '#*.....E#',
      '#########',
    ],
  },
];

const BONUS_SPECS: LevelSpec[] = [
  {
    name: 'Echo Vault',
    hint: 'Both plates must stay pressed at the same time.',
    legend: { o: plate(1), D: door(1) },
    map: [
      '#########',
      '#P.....#',
      '#.B.B..#',
      '#..#..o#',
      '#_.B...#',
      '###d#D##',
      '#E....*#',
      '#########',
    ].map((r) => r.padEnd(9, '#').slice(0, 9)),
  },
  {
    name: 'Night Shift',
    legend: { X: drone('RRDDLLUU', 'loop'), Y: drone('DDRRUULL', 'loop', 2), a: laser('down', { timing: [4, 2] }) },
    map: [
      '####a####',
      '#P......#',
      '#.X.....#',
      '#.......#',
      '#....Y..#',
      '#*.....*#',
      '#...E...#',
      '#########',
    ],
  },
  {
    name: 'Sinkhole Gardens',
    hint: 'A crate dropped into the chasm becomes floor. So does a collapsed tile you fill.',
    map: [
      '#########',
      '#P..#..*#',
      '#%..B.#%#',
      '#.%B%#%.#',
      '#%B.B..%#',
      '#~~~~~~~#',
      '#*.....E#',
      '#########',
    ],
  },
];

export const DAILY_ROOMS: Room[] = DAILY_SPECS.map((s, i) => parseLevel(s, `d${String(i + 1).padStart(2, '0')}`, 0, i + 1));
export const BONUS_ROOMS: Room[] = BONUS_SPECS.map((s, i) => parseLevel(s, `b${String(i + 1).padStart(2, '0')}`, 0, i + 1));
