// Rooms WITNESS adds on top of the 100-room campaign:
// - Interludes: short observation cells between chapters. They never count toward campaign
//   progress and can be skipped, so they can never block the story.
// - Variants: alternate layouts of campaign rooms, chosen from room memory. Each one is
//   solver-verified like any room, so any combination of flags yields a solvable room.
import { parseLevel, type LevelSpec } from '../levelFormat';
import { campaignSpec } from '../levels';
import { door, plate, shift } from '../levels/legend';
import type { Room } from '../types';
import type { Condition } from './conditions';

export interface Interlude {
  id: string;
  /** Campaign room after which it plays (0 = secret, opened by the sigil collection). */
  after: number;
  title: string;
  /** One line shown on the Observation Wing list. */
  blurb: string;
  room: Room;
}

const SPECS: { id: string; after: number; title: string; blurb: string; spec: LevelSpec }[] = [
  {
    id: 'o01',
    after: 10,
    title: 'Observation 1',
    blurb: 'A familiar room, rebuilt. Two voices, two exits.',
    spec: {
      name: 'Room 1, Again',
      intro: 'Step on the switch and watch the walls. Two exits: choose one.',
      hint: 'The switch slides the left wall open and the right one shut. Step on it again to swap them back.',
      legend: { a: shift(0), b: shift(0, true) },
      map: [
        '#########',
        '#E#...#E#',
        '#a#...#b#',
        '#.#.P.#.#',
        '#.##s##.#',
        '#.......#',
        '#########',
      ],
    },
  },
  {
    id: 'o02',
    after: 30,
    title: 'Observation 2',
    blurb: 'WITNESS shows you what it keeps.',
    spec: {
      name: 'The Echo',
      intro: 'WITNESS keeps your last attempt. Restart, and your echo walks it again.',
      hint: 'Walk to the plate, then restart. Your echo will stand on it and hold the door while you go through.',
      echo: { reference: 'LLLL', linger: 40 },
      map: [
        '#######',
        '#_...P#',
        '#####d#',
        '#E....#',
        '#######',
      ],
    },
  },
  {
    id: 'o03',
    after: 50,
    title: 'Observation 3',
    blurb: 'One door opens for your echo. The other closes.',
    spec: {
      name: 'Hold the Door',
      intro: 'The plate opens the first door and shuts the second. Your echo can do one thing while you do the other.',
      hint: 'Record an attempt that stands on the plate for a few turns, then steps off. Go through the first door while your echo stands there, the second after it leaves.',
      echo: { reference: 'RRRRRRWWWL', linger: 99 },
      map: [
        '#########',
        '#P....._#',
        '#.#######',
        '#d#E....#',
        '#.#####x#',
        '#.......#',
        '#########',
      ],
    },
  },
  {
    id: 'o04',
    after: 0,
    title: 'The Observation Room',
    blurb: 'Where WITNESS watched from. Opened by all ten sigils.',
    spec: {
      name: 'The Observation Room',
      intro: 'Every screen here shows one of your attempts.',
      hint: 'Your echo holds the first plate. The crate can hold the second one.',
      echo: { reference: 'LLLL', linger: 60 },
      legend: { ',': plate(1), D: door(1) },
      map: [
        '#########',
        '#_...P..#',
        '#######d#',
        '#ED.....#',
        '###.###.#',
        '###.B.,.#',
        '#########',
      ],
    },
  },
];

export const INTERLUDES: readonly Interlude[] = SPECS.map((s, i) => ({
  id: s.id,
  after: s.after,
  title: s.title,
  blurb: s.blurb,
  room: parseLevel(s.spec, s.id, 0, i + 1),
}));

export const getInterlude = (id: string) => INTERLUDES.find((i) => i.id === id);
export const interludeAfter = (roomIndex: number) => INTERLUDES.find((i) => i.after === roomIndex && i.after > 0);
export const SECRET_ROOM_ID = 'o04';
export const isInterludeId = (id: string) => /^o\d\d$/.test(id);

/** Named routes recorded in room memory when a room is first completed ("<room>.route.<name>"). */
export const ROOM_ROUTES: Record<string, Record<string, [number, number][]>> = {
  // Which exit of "Room 1, Again" the player took: WITNESS's (left) or HALE's (right).
  o01: { observer: [[1, 1]], hale: [[1, 7]] },
};

// ---- Variants ------------------------------------------------------------------------------

export interface RoomVariant {
  room: string;
  id: string;
  when: Condition;
  /** Wall cells (row, col) of the campaign map that open, with a sliding-wall animation. */
  opened: [number, number][];
}

export const ROOM_VARIANTS: readonly RoomVariant[] = [
  // Trusting WITNESS in "Room 1, Again" opens a hidden alcove in Beam Shadow, holding a recording.
  { room: 'r021', id: 'trust', when: { flag: 'o01.route.observer' }, opened: [[5, 3]] },
];

const BUILT = new Map<string, Room>();

/** The variant's room: the campaign spec with its opened cells turned to floor (cached). */
export function variantRoom(base: Room, v: RoomVariant): Room {
  const key = `${v.room}~${v.id}`;
  let r = BUILT.get(key);
  if (!r) {
    const spec = campaignSpec(base.index);
    const map = spec.map.map((row, y) =>
      [...row].map((ch, x) => (v.opened.some(([oy, ox]) => oy === y && ox === x) ? '.' : ch)).join(''),
    );
    r = { ...parseLevel({ ...spec, map }, base.id, base.chapter, base.index), variant: v.id };
    BUILT.set(key, r);
  }
  return r;
}

export const allVariantRooms = (getBase: (id: string) => Room | undefined): Room[] =>
  ROOM_VARIANTS.flatMap((v) => {
    const b = getBase(v.room);
    return b ? [variantRoom(b, v)] : [];
  });
