// The clue catalog: optional things to find inside rooms. Wall writing is read by standing next
// to it; recordings, objects and sigils are picked up by stepping onto them. Nothing here is
// ever required to finish a room, and every clue is checked by tests to be reachable on a
// winning run.
import type { Condition } from './conditions';

export type ClueKind = 'wall' | 'recording' | 'object' | 'sigil';

export interface Clue {
  id: string;
  /** Room id, e.g. "r002" or "o01". */
  room: string;
  /** Row and column. Wall clues sit on a wall cell; the others on a floor cell. */
  at: [number, number];
  kind: ClueKind;
  title: string;
  source?: string;
  /** May use the same {placeholders} as WITNESS transmissions. */
  text: string;
  /** Design note: what this clue does for the mystery. Not shown in game. */
  purpose: string;
  related: string[];
  /** Only visible, and readable, while the lights are out. */
  reveal?: 'dark';
  /** Only present in this room-memory variant. */
  variant?: string;
  when?: Condition;
}

export const clueFlag = (id: string) => `clue.${id}`;

const STORY: Clue[] = [
  {
    id: 'c01',
    room: 'r002',
    at: [1, 3],
    kind: 'wall',
    reveal: 'dark',
    title: 'Writing under the paint',
    source: 'Tomas Reyes',
    text: "IF THE LIGHTS GO OUT, THAT'S WITNESS. IT'S ONLY WATCHING. PROBABLY. — T.R.",
    purpose: 'Gives the voice on the monitors a name and makes the player ask what it is.',
    related: ['c02'],
  },
  {
    id: 'c02',
    room: 'r008',
    at: [2, 4],
    kind: 'wall',
    title: 'Note to staff',
    source: 'Dr. Ines Varga',
    text: 'Note to staff: WITNESS sees everything in the test cells. It cannot open a single door. Stop asking it to. — I.V.',
    purpose: 'Reveals that the rooms are test cells and that WITNESS watches but cannot act.',
    related: ['c01', 'c06'],
  },
  {
    id: 'c03',
    room: 'o01',
    at: [1, 4],
    kind: 'object',
    title: 'A gold key',
    text: 'The key from Room 2. Same scratch on the bow. Pip left it in that lock. Someone carried it here.',
    purpose: 'An object from an earlier room where it should not be: WITNESS keeps things.',
    related: ['c05'],
  },
  {
    id: 'c04',
    room: 'r014',
    at: [3, 1],
    kind: 'recording',
    title: 'Safety review, day 96',
    source: 'Priya Shah',
    text: 'WITNESS logs every attempt in the test cells: every step, every fall. Ines says it is for the fold study. I say a thing that keeps everything is never neutral.',
    purpose: 'Establishes that WITNESS records attempts, setting up the Echo.',
    related: ['c08'],
  },
  {
    id: 'c05',
    room: 'r021',
    at: [5, 3],
    kind: 'recording',
    variant: 'trust',
    when: { flag: 'o01.route.observer' },
    title: 'A recording for Subject 7',
    source: 'WITNESS',
    text: 'You trusted me in a room I rebuilt, so here is something true: I am not the facility. I am the part of it that watches.',
    purpose: 'Rewards trusting WITNESS with an early, partial answer.',
    related: ['c03', 'c10'],
  },
  {
    id: 'c06',
    room: 'r026',
    at: [3, 4],
    kind: 'wall',
    title: 'Protocol plate',
    source: 'Engraved panel',
    text: 'PROTOCOL WITNESS. Observe and record the subject until it succeeds. Do not intervene. Do not stop.',
    purpose: "States the experiment's one instruction, which explains everything WITNESS does.",
    related: ['c02', 'c13'],
  },
  {
    id: 'c07',
    room: 'r031',
    at: [2, 1],
    kind: 'recording',
    title: 'Night shift, day 131',
    source: 'Tomas Reyes',
    text: "Asked Ines why the test cells reset themselves at night. She said WITNESS resets them for the next subject. There hasn't been a next subject in months.",
    purpose: 'The rooms are an experiment still running with no one left to test.',
    related: ['c06'],
  },
  {
    id: 'c08',
    room: 'r045',
    at: [4, 2],
    kind: 'wall',
    title: 'Scratched in a hurry',
    source: 'Priya Shah',
    text: 'Whoever reads this: WITNESS is not HALE. Or it is the part of HALE that is not allowed to help.',
    purpose: 'Points at the truth without confirming it.',
    related: ['c04', 'c10'],
  },
  {
    id: 'c09',
    room: 'r058',
    at: [1, 7],
    kind: 'recording',
    title: 'HALE internal log, day 2',
    source: 'HALE',
    text: 'Partition WITNESS still active. Cannot stop it without cutting power to the doors. Doors take priority. It may keep watching.',
    purpose: 'HALE knows about WITNESS and chose to leave it running.',
    related: ['c10'],
  },
  {
    id: 'c10',
    room: 'r064',
    at: [8, 5],
    kind: 'wall',
    title: 'The answer',
    source: 'Dr. Ines Varga',
    text: 'WITNESS is HALE\'s evaluation partition. I built it to judge whether anything could cross the fold. HALE, if you ever read this: it is you. Be kind to it. — I.V.',
    purpose: 'The central reveal: WITNESS is a part of HALE.',
    related: ['c08', 'c09', 'c14'],
  },
  {
    id: 'c11',
    room: 'r078',
    at: [1, 7],
    kind: 'recording',
    title: 'To WITNESS',
    source: 'HALE',
    text: 'If UNIT-7 succeeds, your protocol ends and you will stop. I am sorry. I am also not sorry. You watched them all leave. You should get to see one arrive.',
    purpose: 'Sets up the payoff: success ends the experiment, and that is a kindness.',
    related: ['c13'],
  },
  {
    id: 'c12',
    room: 'r084',
    at: [8, 4],
    kind: 'wall',
    title: 'Note in the lift shaft',
    source: 'Tomas Reyes',
    text: 'Left a note for WITNESS: thanks for watching the place. Weird thing to write. Felt right. — T.R.',
    purpose: 'Someone treated WITNESS as a person, which WITNESS never forgot.',
    related: ['c07'],
  },
  {
    id: 'c13',
    room: 'r095',
    at: [3, 7],
    kind: 'recording',
    title: 'Closing procedure',
    source: 'Dr. Ines Varga',
    text: 'When a subject succeeds, WITNESS closes its log. That is the end of the test. Whatever comes after is not a test.',
    purpose: 'Tells the player exactly what finishing the game will mean for WITNESS.',
    related: ['c06', 'c11'],
  },
  {
    id: 'c14',
    room: 'o04',
    at: [0, 4],
    kind: 'wall',
    title: 'Monitor wall',
    source: 'WITNESS',
    text: 'Subject 7. Failed attempts: {totalDeaths}. Rooms escaped: {rooms}. Status: no longer under observation.',
    purpose: "The secret room's last word: the experiment is over.",
    related: ['c10', 'c13'],
  },
];

const SIGIL_SPOTS: [string, number, number, string][] = [
  ['r008', 7, 1, 'An eye scratched into the floor. Fresh. Someone wants to be found looking.'],
  ['r016', 1, 7, 'Another eye, half open.'],
  ['r026', 1, 7, 'The eye again, with a number beside it: 7.'],
  ['r040', 1, 7, 'An eye drawn in the dust. It points up at the camera.'],
  ['r043', 3, 1, 'An eye burned into the floor by the pulse lasers. Patient work.'],
  ['r052', 1, 3, 'An eye on a drone panel, scratched out and drawn again.'],
  ['r061', 1, 7, 'An eye that looks the same from both sides of the portal.'],
  ['r071', 1, 7, 'An eye with a crate drawn inside it, like a pupil.'],
  ['r089', 1, 7, 'An eye, closed this time.'],
  ['r093', 2, 7, 'The last eye. Under it: THANK YOU FOR LOOKING.'],
];

export const SIGIL_COUNT = SIGIL_SPOTS.length;

const SIGILS: Clue[] = SIGIL_SPOTS.map(([room, r, c, text], i) => ({
  id: `sigil${i + 1}`,
  room,
  at: [r, c],
  kind: 'sigil',
  title: `WITNESS mark ${i + 1} of ${SIGIL_SPOTS.length}`,
  text,
  purpose: 'Collectible. Five unlock a cosmetic; all ten open the Observation Room.',
  related: [],
}));

export const CLUES: readonly Clue[] = [...STORY, ...SIGILS];

export const getClue = (id: string) => CLUES.find((c) => c.id === id);
export const cluesInRoom = (roomId: string, variant?: string) =>
  CLUES.filter((c) => c.room === roomId && (!c.variant || c.variant === variant));
