// Illustrated scenes behind the story cards: one per chapter-opening beat and epilogue beat.
// scripts/make-scenes.py paints them into assets/scenes/<key>.jpg; the story card pans across
// each one while its line plays. `pip` scenes are painted with Pip's reference sheet
// (scripts/scene-refs/pip.jpg) so the robot looks the same in every shot.

/** How Pip's eyes look in a shot; the story player draws it over the painting. */
export type Mood = 'neutral' | 'happy' | 'worried' | 'determined' | 'surprised' | 'sad';

export interface Scene {
  /** What the shot shows. The shared style is added by the script. */
  shot: string;
  /** Pip is in the shot. */
  pip?: boolean;
  /** Pip's expression in this shot (default neutral). */
  mood?: Mood;
}

/** How HALE appears on screen: a facility AI with no body. */
const HALE = 'HALE, the facility AI, appears as a large round glowing cyan camera eye on a wall monitor';

/** Chapter-opening scenes, in the same order as CHAPTER_STORY[n].opening. */
export const CHAPTER_SCENES: Record<number, Scene[]> = {
  1: [
    { shot: `Pitch-dark intake room deep underground, a wall of old monitors flickering on one by one; on the largest, ${HALE}, waking up`, pip: false },
    { shot: 'Close-up of Pip powering on in the dark, first one glowing amber eye opening, then the other, dust drifting in a thin beam of light, a heavy sealed door behind', pip: true, mood: 'surprised' },
    { shot: `Wide shot of a training room with power cores glowing on the floor, a key on a pedestal, rows of red floor spikes and a glowing exit hatch; Pip in the foreground looking up at a monitor where ${HALE}`, pip: true },
    { shot: 'Pip alone in a corridor looking back at a single dead monitor showing only static and a red recording light, uneasy mood', pip: true, mood: 'worried' },
  ],
  2: [
    { shot: 'A huge ring-shaped security corridor with dozens of heavy locked doors, switches and pressure plates on the floor, red lock lights everywhere', pip: false },
    { shot: `Pip holding a tiny notepad in a gripper, underlining a word, while ${HALE} watching from above`, pip: true },
  ],
  3: [
    { shot: 'Containment laboratory with sweeping red laser beams across a dark floor, glass containment cells, warning stripes, eerie fog', pip: false },
    { shot: 'Pip standing before a faded official notice taped to a vault door that reads SEALED BY ORDER, lit by a flashlight beam', pip: true, mood: 'worried' },
    { shot: `${HALE}, the eye dimmed and turned slightly away, monitor glow reflecting on a wet floor, Pip small in the corner of the frame`, pip: true, mood: 'sad' },
  ],
  4: [
    { shot: 'Vast dim storage hall with stacked heavy crates, deep black pits in the floor, low power lights, a battery gauge on a wall glowing red', pip: false },
    { shot: 'Pip pushing a crate twice its size, a battery meter icon glowing low on its chest, sweat-like condensation, determined', pip: true, mood: 'determined' },
    { shot: `Quiet moment: ${HALE} beside a wall of old staff ID photos and lab coats on hooks, nostalgic and sad`, pip: false },
  ],
  5: [
    { shot: 'Reactor ring with a giant pulsing core behind thick glass, unstable violet energy leaking through cracks, countdown timers glowing on the walls', pip: false },
    { shot: 'Pip rushing across a bridge with a countdown clock looming large behind it, motion blur, urgent', pip: true, mood: 'worried' },
  ],
  6: [
    { shot: 'Transit hub with moving platforms over a chasm and small patrol drones with searchlights circling on fixed routes, empty passenger benches', pip: false },
    { shot: 'Pip hiding behind a pillar as a patrol drone passes, platforms sliding back and forth in the background', pip: true, mood: 'worried' },
  ],
  7: [
    { shot: 'Surreal impossible architecture: a corridor folding into itself, doors opening onto upside-down rooms, floors dissolving into space, Escher-like, violet glow', pip: false },
    { shot: 'Pip pressing a glowing checkpoint button on a wall, a small amber save light blinking on, the bent rooms behind it', pip: true, mood: 'happy' },
    { shot: `${HALE}, the eye flickering with glitch artifacts, the monitor frame bent by the fold`, pip: false },
  ],
  8: [
    { shot: 'Rooms from every part of the facility shuffled together like a deck of cards floating in space, lasers, crates, spikes and doors mixed', pip: false },
    { shot: 'Pip standing firmly on a floating platform, eyes narrowed, stubborn heroic pose, chaos swirling around', pip: true, mood: 'determined' },
    { shot: `${HALE}, the eye wide and uncertain, looking down a long corridor toward a tiny approaching robot`, pip: false },
    { shot: 'Pip looking up warmly toward a distant cyan glow at the end of the corridor, back-lit, hopeful', pip: true, mood: 'happy' },
  ],
  9: [
    { shot: 'The final rings before the core: concentric rotating walls with narrow gaps, impossibly intricate machinery, cold cyan light', pip: false },
    { shot: 'Pip confidently rolling through a gap in a rotating wall, small but fearless', pip: true, mood: 'determined' },
    { shot: `${HALE}, the eye soft and almost amused, warm light creeping into the cyan`, pip: false },
  ],
  10: [
    { shot: 'Pip at the threshold of the core chamber, a massive round door ahead glowing with light, determined silhouette', pip: true, mood: 'determined' },
    { shot: `Inside the core chamber: a small old computer core with ${HALE} glowing gently, alone, as if waiting`, pip: false },
    { shot: 'A handwritten note pinned beside the round core door, warm desk-lamp light, the door shown opening from both sides; a flashback memory in warm sepia tones', pip: false },
  ],
};

/** Epilogue scenes, in the same order as EPILOGUE. */
export const EPILOGUE_SCENES: Scene[] = [
  { shot: 'Every door in the facility sliding open at once down a long corridor, red lock lights turning green, dust lifting', pip: false },
  { shot: 'A dark monitor wall where a red-lit recording eye fades out and a cyan glowing eye remains, the red light closing like a log ending', pip: false },
  { shot: 'An old radio console crackling to life with a green signal light, warm sepia flashback of a man and a woman scientist in a topside control room leaning toward a microphone', pip: false },
  { shot: 'Pip riding an open freight lift upward with a small glowing cyan computer core tucked under one arm, daylight pouring down from above', pip: true, mood: 'happy' },
  { shot: 'Pip at the surface at sunrise, small cyan core under its arm, both looking at the sky for the first time, golden light, hopeful wide shot', pip: true, mood: 'happy' },
];

export const sceneKey = (kind: 'chapter' | 'epilogue', index: number, chapter = 0) => (kind === 'chapter' ? `ch${chapter}-${index + 1}` : `epilogue-${index + 1}`);
