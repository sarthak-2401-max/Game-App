import type { LevelSpec } from '../levelFormat';
import { drone, laser, platform } from './legend';

// Chapter 6 — Moving Targets. Drones patrol fixed routes one step per turn; platforms ferry
// you across chasms. Both are perfectly predictable.
export const chapter6: LevelSpec[] = [
  {
    name: 'Patrol',
    intro: 'Drones move one step each time you do. Their next step is marked. Never share a tile with one.',
    legend: { X: drone('DD') },
    map: [
      '#########',
      '####X####',
      '#P.....E#',
      '####.####',
      '#########',
    ],
  },
  {
    name: 'Two Guards',
    legend: { X: drone('DDD'), Y: drone('UUU') },
    map: [
      '#########',
      '###X.#..#',
      '#P......#',
      '#......E#',
      '###.Y#..#',
      '#########',
    ],
  },
  {
    name: 'Merry-Go-Round',
    intro: 'Some drones circle forever. Learn the loop.',
    legend: { X: drone('RRDDLLUU', 'loop') },
    map: [
      '#########',
      '#P......#',
      '#..X..*.#',
      '#...#...#',
      '#*......#',
      '#......E#',
      '#########',
    ],
  },
  {
    name: 'Ferry',
    intro: 'Step onto a moving platform to ride it across the chasm.',
    legend: { p: platform('RRR') },
    map: [
      '#########',
      '#########',
      '#Pp~~~.E#',
      '#########',
      '#########',
    ],
  },
  {
    name: 'Platform Hop',
    legend: { p: platform('RRR'), q: platform('DDD', 'pingpong', 1) },
    map: [
      '#########',
      '#P.p~~~q#',
      '######.~#',
      '######.~#',
      '#E.....~#',
      '#########',
    ],
  },
  {
    name: 'Guarded Core',
    legend: { X: drone('RRDDLLUU', 'loop'), Y: drone('LLUURRDD', 'loop', 4) },
    map: [
      '#########',
      '#P......#',
      '#.X.....#',
      '#..*....#',
      '#....*..#',
      '#.....Y.#',
      '#......E#',
      '#########',
    ],
  },
  {
    name: 'Crossing',
    legend: { p: platform('DDD'), X: drone('RRRR') },
    map: [
      '#########',
      '#P..p...#',
      '####~####',
      '####~####',
      '#X..~...#',
      '#..##..E#',
      '#########',
    ],
  },
  {
    name: 'Night Watch',
    legend: { X: drone('RRRRR'), a: laser('down', { ch: 0 }) },
    map: [
      '#####a###',
      '#P......#',
      '#.X.....#',
      '#.......#',
      '#s......#',
      '#####.#E#',
      '#########',
    ],
  },
  {
    name: 'Rush Hour',
    intro: 'Four lanes, four rhythms. Wait for your gap.',
    legend: {
      X: drone('RRRRRR', 'pingpong', 0),
      Y: drone('LLLLLL', 'pingpong', 2),
      Z: drone('RRRRRR', 'pingpong', 3),
      W: drone('LLLLLL', 'pingpong', 5),
    },
    map: [
      '#########',
      '#...P...#',
      '#X......#',
      '#......Y#',
      '#Z......#',
      '#......W#',
      '#...E...#',
      '#########',
    ],
  },
  {
    name: 'Convoy',
    intro: 'Platforms, patrols and a switch. Time everything.',
    legend: {
      p: platform('RRRR'),
      X: drone('DDDD', 'pingpong', 1),
      d: { tile: { k: 'door', ch: 0 } },
    },
    map: [
      '#########',
      '#P.#.X.*#',
      '#..#....#',
      '#.p~~~~.#',
      '#s.#....#',
      '###d#...#',
      '#E....#.#',
      '#########',
    ],
  },
];
