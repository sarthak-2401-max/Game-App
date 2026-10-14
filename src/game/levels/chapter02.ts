import type { LevelSpec } from '../levelFormat';

const CH1 = {
  S: { tile: { k: 'switch' as const, ch: 1 } },
  D: { tile: { k: 'door' as const, ch: 1 } },
  X: { tile: { k: 'door' as const, ch: 1, invert: true } },
  o: { tile: { k: 'plate' as const, ch: 1 } },
};

// Chapter 2 — Locked In. Keys, locks, switches and pressure plates.
export const chapter2: LevelSpec[] = [
  {
    name: 'Spare Key?',
    intro: 'A key is used up when it opens a lock. Choose carefully. Undo if you slip.',
    map: [
      '#######',
      '#E###.#',
      '#L###L#',
      '#..k..#',
      '#..P..#',
      '#######',
    ],
  },
  {
    name: 'The Switch',
    intro: 'Step on a switch to flip it. Blue doors open while their switch is on.',
    map: [
      '#######',
      '#P.#.E#',
      '#..d..#',
      '#s.#..#',
      '#######',
    ],
  },
  {
    name: 'Flip Side',
    intro: 'Striped doors do the opposite: they close while the switch is on.',
    map: [
      '#########',
      '#P..x..s#',
      '#####.#.#',
      '#E..d...#',
      '#########',
    ],
  },
  {
    name: 'Hold the Door',
    intro: 'Pressure plates only work while something stands on them.',
    map: [
      '#########',
      '#P...#$.#',
      '#.#._d.E#',
      '#...#...#',
      '#########',
    ],
  },
  {
    name: 'Blue and Gold',
    intro: 'Keys only fit locks of the same colour.',
    map: [
      '#########',
      '#j..J..k#',
      '#.#######',
      '#.#$#####',
      '#P..L..E#',
      '#########',
    ],
  },
  {
    name: 'Switchback',
    map: [
      '#########',
      '#P.s#.s.#',
      '#...d...#',
      '#####x###',
      '#E......#',
      '#########',
    ],
  },
  {
    name: 'Key Ring',
    hint: 'One lock leads to another key. The other only leads to a coin.',
    map: [
      '#########',
      '#..L.k..#',
      '#.#####L#',
      '#k..L.#.#',
      '#P#####E#',
      '#########',
    ],
  },
  {
    name: 'Crossed Wires',
    hint: 'Stepping on a switch twice turns it back off.',
    legend: CH1,
    map: [
      '#########',
      '#s..x.sS#',
      '#.#####.#',
      '#P#E.D.d#',
      '#########',
    ],
  },
  {
    name: 'Stepping Stones',
    legend: CH1,
    map: [
      '#########',
      '#P.._d..#',
      '#.#####.#',
      '#.#E.Do.#',
      '#$#######',
      '#########',
    ],
  },
  {
    name: 'The Vault',
    intro: 'Everything you have learned, behind one door.',
    legend: CH1,
    map: [
      '#########',
      '#k.#*.S.#',
      '#..L..#D#',
      '##s####.#',
      '#P.d..*.#',
      '#####J#.#',
      '#j..._..#',
      '##E######',
      '#########',
    ],
  },
];
