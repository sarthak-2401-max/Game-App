import type { LevelSpec } from '../levelFormat';

// Chapter 1 — Learn to Escape. Movement, walls, exits, plus first-session previews of a
// lock (room 2) and a trap (room 3).
export const chapter1: LevelSpec[] = [
  {
    name: 'First Step',
    intro: 'Swipe or tap next to you to move. Reach the glowing exit.',
    map: [
      '#####',
      '#...#',
      '#P.E#',
      '#...#',
      '#####',
    ],
  },
  {
    name: 'The Key',
    intro: 'Locks need a key. Walk over the key, then into the lock.',
    map: [
      '#######',
      '#..#..#',
      '#P.L.E#',
      '#k.#..#',
      '#######',
    ],
  },
  {
    name: 'Watch Your Step',
    intro: 'Red spikes are deadly. The short way is not always the safe way.',
    map: [
      '#######',
      '#P^^^E#',
      '#.###.#',
      '#.....#',
      '#######',
    ],
  },
  {
    name: 'Corridors',
    intro: 'Walls block you. Find the way through.',
    map: [
      '#########',
      '#P..#...#',
      '###.#.#.#',
      '#...#.#.#',
      '#.###.#.#',
      '#.....#E#',
      '#########',
    ],
  },
  {
    name: 'Power Core',
    intro: 'The exit is sealed until every energy core is collected.',
    map: [
      '#######',
      '#*...E#',
      '#.###.#',
      '#..P..#',
      '#######',
    ],
  },
  {
    name: 'Twin Cores',
    intro: 'Two cores this time. Plan a route that grabs both.',
    map: [
      '#########',
      '#*..#..*#',
      '#.#.#.#.#',
      '#.#...#.#',
      '#...P...#',
      '####E####',
      '#########',
    ],
  },
  {
    name: 'Spike Gallery',
    intro: 'Coins are optional, but they add up.',
    map: [
      '#######',
      '#P..^$#',
      '#.^...#',
      '#.^.^^#',
      '#...^.#',
      '#^^...#',
      '#$..^.#',
      '#.^^^E#',
      '#######',
    ],
  },
  {
    name: 'Long Way Round',
    map: [
      '#########',
      '#P#.....#',
      '#.#.###.#',
      '#.#*#...#',
      '#.###.###',
      '#.....#*#',
      '###.#.#.#',
      '#...#...#',
      '#.#####.#',
      '#......E#',
      '#########',
    ],
  },
  {
    name: 'Hidden Corner',
    intro: 'Some coins are tucked away. Explore if you dare.',
    map: [
      '#########',
      '#?^.....#',
      '#.^.###.#',
      '#.^.#*..#',
      '#...#^^.#',
      '###.#...#',
      '#P..#.#E#',
      '#########',
    ],
  },
  {
    name: 'Graduation',
    intro: 'Keys, cores and spikes together. You know enough to escape.',
    map: [
      '#########',
      '#k..#...#',
      '#.#.#.#L#',
      '#.#...#.#',
      '#.###^#*#',
      '#P..^..E#',
      '#########',
    ],
  },
];
