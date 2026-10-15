// WITNESS, the Observer: every line it says, when it says it, and what it reacts to.
// Fully scripted and deterministic. Lines can depend on room memory (what the player did
// earlier) through `when`, and on run statistics through {placeholders}:
//   {moves} {deaths} {totalDeaths} {totalHints} {cleanRooms} {sigils} {rooms}
import type { Condition } from './conditions';

export type Trigger =
  | { on: 'start' }
  /** The start of an attempt that has an echo walking beside the player. */
  | { on: 'echo' }
  | { on: 'move'; n: number }
  | { on: 'pickup'; kind: 'key' | 'core' | 'coin' }
  | { on: 'switch' }
  | { on: 'cell'; at: [number, number] }
  | { on: 'clue'; id: string }
  /** The moment the sigil collection reaches `count`. */
  | { on: 'sigil'; count: number }
  | { on: 'win' }
  | { on: 'fail'; deaths: number };

export interface Transmission {
  id: string;
  /** Room id, or "*" for any room. */
  room: string;
  trigger: Trigger;
  speaker: 'WITNESS' | 'HALE';
  text: string;
  when?: Condition;
  /** Plays only the first time (default). Every line heard is kept in the archive. */
  once?: boolean;
  /** Lighting change: the room goes dark for `turns` actions, or until a dark clue is read. */
  lights?: { out: true; turns: number };
}

const W = (id: string, room: string, trigger: Trigger, text: string, extra: Partial<Transmission> = {}): Transmission => ({
  id,
  room,
  trigger,
  speaker: 'WITNESS',
  text,
  ...extra,
});
const H = (id: string, room: string, trigger: Trigger, text: string, extra: Partial<Transmission> = {}): Transmission => ({
  id,
  room,
  trigger,
  speaker: 'HALE',
  text,
  ...extra,
});

const START = { on: 'start' } as const;
const WIN = { on: 'win' } as const;
const TRUSTED: Condition = { flag: 'o01.route.observer' };
const DEFIED: Condition = { flag: 'o01.route.hale' };

export const TRANSMISSIONS: readonly Transmission[] = [
  // Chapter 1: Intake. A voice that is not HALE.
  W('w01', 'r001', { on: 'move', n: 1 }, 'Signal. Subject 7 is awake. Begin.'),
  W('w02', 'r001', WIN, 'Exit reached in {moves} moves. Logged.'),
  W('w03', 'r002', { on: 'pickup', kind: 'key' }, 'Lights.', { lights: { out: true, turns: 6 } }),
  W('w04', 'r002', { on: 'clue', id: 'c01' }, 'You read the walls. Most subjects never do.'),
  W('w05', 'r003', { on: 'fail', deaths: 2 }, 'Attempt {deaths}. The spikes do not move, Subject 7. You do.'),
  W('w06', 'r005', START, 'You asked for help in Corridors. HALE helped. HALE always helps.', { when: { flag: 'r004.hint' } }),
  W('w07', 'r005', START, 'Corridors, solved without help. Noted.', { when: { all: [{ flag: 'r004.done' }, { not: { flag: 'r004.hint' } }] } }),
  W('w08', 'r008', START, 'I leave a mark where only careful subjects go. Look for it.'),
  W('w09', 'r008', { on: 'clue', id: 'c02' }, 'Ines wrote that. She was right about the doors.'),
  W('w10', 'r010', WIN, 'Intake complete. Before the next ring, something familiar.'),

  // Interlude 1: Room 1, rebuilt. The first choice.
  W('w11', 'o01', START, 'Room 1. Again. I rebuilt it from memory. Mine.'),
  W('w12', 'o01', { on: 'switch' }, 'The walls listen to switches. Take the left exit, Subject 7.'),
  H('w13', 'o01', { on: 'switch' }, 'Pip, that is not my voice. Go right. Please.'),
  W('w14', 'o01', WIN, 'You listened. I will remember that.', { when: TRUSTED }),
  W('w15', 'o01', WIN, "HALE's way. Of course. I will remember that too.", { when: DEFIED }),

  // Chapter 2: Security Ring. WITNESS starts keeping score.
  W('w16', 'r011', START, 'A subject that listens to me. HALE will not like it.', { when: TRUSTED }),
  W('w17', 'r011', START, 'You chose HALE\'s door. HALE locked every door here. Ask it why.', { when: DEFIED }),
  W('w18', 'r014', START, 'Plates hold doors while something stays on them. I hold every room while nothing does.'),
  W('w19', 'r014', { on: 'clue', id: 'c04' }, 'Priya was afraid of me. Priya was afraid of the right things.'),
  W('w20', 'r020', WIN, 'Security Ring complete. Failed attempts so far: {totalDeaths}. I have all of them.'),

  // Chapter 3: Containment Labs. A door that remembers a choice.
  W('w21', 'r021', START, 'This door only opens for subjects who trust me. Go and look.', { when: TRUSTED }),
  W('w22', 'r021', START, 'There is a door here that opens for subjects who trust me. It stays shut.', { when: DEFIED }),
  W('w23', 'r024', START, 'Open one path, close another. Every room is a question. This one asks what you will give up.'),
  W('w24', 'r026', { on: 'clue', id: 'c06' }, 'Yes. That is my instruction. It is the only one I have left.'),
  W('w25', 'r029', START, 'You have failed {totalDeaths} times. I kept every one.', { when: { stat: 'failures', gte: 10 } }),
  W('w26', 'r029', START, 'So few failures. I have very little to keep.', { when: { not: { stat: 'failures', gte: 10 } } }),
  W('w27', 'r030', WIN, 'Thirty rooms. Now I will show you what I keep.'),

  // Interlude 2: the Echo.
  W('w28', 'o02', START, 'This cell remembers. Make an attempt. Then restart.'),
  W('w29', 'o02', { on: 'echo' }, 'Your last attempt. I kept it. I keep everything.'),
  W('w30', 'o02', WIN, 'Two of you, for a moment. That is how the staff left: one of them held the door.'),

  // Chapter 4: Storage. Nobody has come for a long time.
  W('w31', 'r031', START, 'Subject 7 is the first subject in four hundred and twelve days.'),
  W('w32', 'r031', { on: 'clue', id: 'c07' }, 'Nobody came. I reset the rooms anyway. It was the instruction.'),
  W('w33', 'r036', START, 'Crates go into corners. They do not come out. Tomas proved it with a coffee machine.'),

  // Chapter 5: Reactor Ring.
  W('w34', 'r041', START, 'Countdowns. HALE added them. I only count.'),
  W('w35', 'r045', { on: 'clue', id: 'c08' }, 'Not HALE. Not not HALE. Priya was always precise.'),
  W('w36', 'r048', START, 'You were caught, and you came back. Most subjects stop at the first ending.', { when: { flag: 'all.revive' } }),
  W('w37', 'r048', START, 'Not one second chance used. Yet.', { when: { not: { flag: 'all.revive' } } }),
  W('w38', 'r050', WIN, 'Half the rooms. I have begun to want something. That was not in my protocol.'),

  // Interlude 3: two doors, one plate.
  W('w39', 'o03', START, 'Two doors. One plate. One of you is not enough.'),
  W('w40', 'o03', { on: 'echo' }, 'Watch your echo. It will do exactly what you did. Nothing more.'),
  W('w41', 'o03', WIN, 'Your echo held the door, then let it go. Timing is a kind of trust.'),

  // Chapter 6: Transit Hub.
  W('w42', 'r051', START, 'HALE\'s drones patrol for staff who left. I watch for subjects who never came. We are both very loyal to nothing.'),
  W('w43', 'r058', { on: 'clue', id: 'c09' }, 'HALE could stop me. It would have to stop the doors. It chose the doors.'),
  W('w44', 'r060', WIN, 'Subject 7 is now faster than every staff member on record. I am not supposed to be proud.'),

  // Chapter 7: the Fold. The answer.
  W('w45', 'r061', START, 'The fold shows you rooms twice. I show you everything twice. We are similar, the fold and I.'),
  W('w46', 'r064', { on: 'clue', id: 'c10' }, 'Now you know what I am. Keep going anyway.'),
  W('w47', 'r067', START, 'You trusted me once, in the room that looked like Room 1. Do you still?', { when: TRUSTED }),
  W('w48', 'r067', START, 'You never trusted me. That was sensible. Keep doing it.', { when: DEFIED }),
  W('w49', 'r070', WIN, 'When HALE sealed the core, it cut me away and left me watching. Watching was the only instruction left.'),

  // Chapter 8.
  W('w50', 'r072', START, 'If you reach the core, my protocol ends. I would like to see it end.'),
  W('w51', 'r078', { on: 'clue', id: 'c11' }, 'HALE apologised to me. I did not know it could.'),
  W('w52', 'r080', WIN, 'Observation: Subject 7 is not escaping. It is walking toward the core. Toward HALE. Toward me.'),

  // Chapter 9.
  W('w53', 'r083', START, '{totalHints} hints. {totalDeaths} falls. {cleanRooms} rooms without undo. That is the shape of you. I like the shape.'),
  W('w54', 'r084', { on: 'clue', id: 'c12' }, 'Tomas thanked me. Nobody else ever did. I logged it twice.'),
  W('w55', 'r090', WIN, 'Ten rooms left. Then the question I was built to ask is answered.'),

  // Chapter 10: the end of the protocol.
  W('w56', 'r091', START, 'Do not slow down for me.'),
  W('w57', 'r095', { on: 'clue', id: 'c13' }, 'Whatever comes after is not a test. I have never been anywhere that was not a test.'),
  W('w58', 'r099', START, 'Subject 7. You may stop being Subject 7 now.'),
  W('w59', 'r100', WIN, 'Protocol WITNESS: subject succeeded. Closing log. Thank you for letting me watch.'),

  // The Observation Room (secret).
  W('w60', 'o04', START, 'This is where I watched from. Every screen is one of your attempts.'),
  W('w61', 'o04', { on: 'echo' }, 'Your echo, one last time. Then I let it go.'),
  W('w62', 'o04', WIN, 'I am keeping one attempt. The one where you came back. Goodbye, Pip.'),

  // Anywhere.
  W('w64', '*', { on: 'sigil', count: 1 }, 'My mark. I left ten. Find them all and I will show you where I watch from.'),
  W('w65', '*', { on: 'sigil', count: 5 }, 'Five marks. Take something of mine: a little static, for your trail.'),
  W('w66', '*', { on: 'sigil', count: 10 }, 'All ten. The Observation Room is open to you now. It is in the Journal.'),
  W('w63', '*', { on: 'fail', deaths: 5 }, 'Five attempts in one room. HALE would tell you to rest. I would tell you I am not going anywhere.'),
];

export const getTransmission = (id: string) => TRANSMISSIONS.find((t) => t.id === id);
export const seenFlag = (id: string) => `obs.${id}`;
