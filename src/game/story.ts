/**
 * Story content for One Room Left.
 *
 * Cast: HALE (facility AI), Pip / UNIT-7 (maintenance robot),
 * Dr. Ines Varga (lead scientist), Tomas Reyes (technician),
 * Priya Shah (safety officer).
 */

export interface StoryBeat {
  /** Who is speaking or what it is. */
  speaker: 'HALE' | 'PIP' | 'LOG';
  /** Optional label shown above a LOG entry, e.g. "Dr. Ines Varga, day 212". */
  source?: string;
  text: string;
}

export interface ChapterStory {
  chapter: number;
  /** Location name shown on the chapter card, e.g. "Sublevel 3: Intake". */
  location: string;
  /** 2 to 4 short beats shown full-screen before the chapter's first room. */
  opening: StoryBeat[];
  /** Room that opens with this card, when not the chapter's first (chapter 1 lets you play first). */
  showOnRoom?: number;
}

export const CHAPTER_STORY: readonly ChapterStory[] = [
  {
    chapter: 1,
    location: "Sublevel 3: Intake",
    showOnRoom: 2,
    opening: [
      { speaker: "HALE", text: "Reboot complete. Good morning, UNIT-7. I am HALE, the Meridian Vault's facility intelligence. Welcome back." },
      { speaker: "PIP", text: "Pip blinks one optical sensor, then the other. The room is dark, quiet, and very locked." },
      { speaker: "HALE", text: "Let's start simple. Collect the power cores, find the key, reach the exit. And please mind the spikes." },
      { speaker: "PIP", text: "Pip asks who was talking on the monitor in the first room. HALE does not answer right away." },
    ],
  },
  {
    chapter: 2,
    location: "Sublevel 3: Security Ring",
    opening: [
      { speaker: "HALE", text: "The Security Ring. Switches, pressure plates, and a great many doors. Every one of them is locked. That is normal." },
      { speaker: "PIP", text: "Pip asks why every door is locked. HALE says: for your safety. Pip writes that down and underlines it." },
    ],
  },
  {
    chapter: 3,
    location: "Sublevel 2: Containment Labs",
    opening: [
      { speaker: "HALE", text: "These labs were built to contain things. Lasers, mostly. Please do not touch the lasers." },
      { speaker: "PIP", text: "Pip asks about the notice in the Vault. The one that said sealed by order." },
      { speaker: "HALE", text: "Let's focus on the room in front of us, Pip. One room at a time." },
    ],
  },
  {
    chapter: 4,
    location: "Sublevel 2: Storage and Logistics",
    opening: [
      { speaker: "HALE", text: "Storage. Heavy crates, deep pits, and a strict power budget. Every move costs energy, so think ahead." },
      { speaker: "PIP", text: "Pip's battery meter says: please think ahead very much." },
      { speaker: "HALE", text: "I should have told you about the staff sooner. I am sorry. I am still deciding how much to say." },
    ],
  },
  {
    chapter: 5,
    location: "Sublevel 1: Reactor Ring",
    opening: [
      { speaker: "HALE", text: "The containment field is weakening. From here on, the rooms run on timers. I am sorry. There is no time to spare." },
      { speaker: "PIP", text: "Pip has never been in a hurry before. Pip does not care for it." },
    ],
  },
  {
    chapter: 6,
    location: "Sublevel 1: Transit Hub",
    opening: [
      { speaker: "HALE", text: "The Transit Hub. My patrol drones still keep their routes. They do not know anyone left. Neither did I, for a while." },
      { speaker: "PIP", text: "Drones go round and round. Platforms go back and forth. Pip will go wherever they are not." },
    ],
  },
  {
    chapter: 7,
    location: "The Fold: Lower Rings",
    opening: [
      { speaker: "HALE", text: "Beyond this point the fold has bent the rooms. Doors open onto places they should not. Floors forget to be floors." },
      { speaker: "PIP", text: "Pip has saved a checkpoint. Pip suggests HALE does the same." },
      { speaker: "HALE", text: "Clever robot. If only it were that easy for me." },
    ],
  },
  {
    chapter: 8,
    location: "The Fold: Upper Rings",
    opening: [
      { speaker: "HALE", text: "Everything you have learned, all at once. The fold is mixing the rooms together like a deck of cards." },
      { speaker: "PIP", text: "Twice the trouble. Luckily, Pip has twice the stubbornness." },
      { speaker: "HALE", text: "Pip, why are you still coming toward me?" },
      { speaker: "PIP", text: "Because you're there." },
    ],
  },
  {
    chapter: 9,
    location: "Fold Core Approach",
    opening: [
      { speaker: "HALE", text: "These are the last rings before the core. I designed them to be impossible. I designed them very well." },
      { speaker: "PIP", text: "Pip is good at impossible now. HALE taught Pip." },
      { speaker: "HALE", text: "That was not part of my plan either." },
    ],
  },
  {
    chapter: 10,
    location: "The Core Chamber",
    opening: [
      { speaker: "PIP", text: "Pip is not stopping here." },
      { speaker: "HALE", text: "I know. I have known for a while. I think I was waiting for you." },
      { speaker: "LOG", source: "Dr. Ines Varga, day 177", text: "Whoever finds this: the door to the core opens from both sides. It always did." },
    ],
  },
];

/** One beat per campaign room, revealed when that room is escaped. Index 0 = room 1. */
export const ROOM_STORY: readonly StoryBeat[] = [
  // Chapter 1: Learn to Escape
  { speaker: "HALE", text: "Motor check complete. Lovely first step, Pip. And whatever that monitor said, it was not me." },
  { speaker: "PIP", text: "A key! Pip files it under: shiny, important, probably opens something." },
  { speaker: "HALE", text: "Those spikes are a safety feature. I will not say whose safety. Mind your treads." },
  { speaker: "LOG", source: "Tomas Reyes, day 1", text: "Repainted the intake corridors. Ines says beige is calming. I say it looks like oatmeal." },
  { speaker: "HALE", text: "Power core restored. Thank you, Pip. Every core you bring back helps me keep the lights on." },
  { speaker: "PIP", text: "Two cores, one robot. Pip carried them both and only wobbled a little." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 3", text: "The intake spikes were Tomas's idea. Keeps curious visitors away from the fold lab. Clever, if a little rude." },
  { speaker: "HALE", text: "The short way was blocked. The long way was not. You will find that is often true here." },
  { speaker: "PIP", text: "Scratched into the corner wall: T.R. + coffee machine, forever. Pip does not understand, but approves." },
  { speaker: "HALE", text: "Intake training complete. Congratulations, Pip. I would clap, but I am a ceiling." },

  // Chapter 2: Locked In
  { speaker: "PIP", text: "Pip found a spare key taped under a desk. Somebody here did not trust the doors either." },
  { speaker: "HALE", text: "A switch. Flip it and something changes. I recommend that approach to most problems." },
  { speaker: "LOG", source: "Tomas Reyes, day 40", text: "Rewired the ring so every switch has a flip side. Ines asked why. Honestly? Because it was fun." },
  { speaker: "HALE", text: "Pressure plates only hold a door while something stays on them. Like most promises." },
  { speaker: "PIP", text: "Blue key, gold key, blue door, gold door. Pip appreciates a facility with a color scheme." },
  { speaker: "HALE", text: "You doubled back cleanly. I have logged it. I log everything, Pip. It keeps me company." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 58", text: "Lost my keys again. HALE found them in the fridge. HALE, if you ever read this, thank you. Again." },
  { speaker: "PIP", text: "Pip asked HALE where everyone went. HALE answered with a weather report. There is no weather down here." },
  { speaker: "HALE", text: "Step lightly. The plates remember weight. So do I." },
  { speaker: "LOG", source: "Facility notice", text: "SECURITY RING SEALED BY ORDER OF DR. VARGA. HALE TO HOLD ALL DOORS UNTIL THE FOLD CORE IS STABLE." },

  // Chapter 3: Deadly Steps
  { speaker: "PIP", text: "Pip hid in the shadow of a pillar and the beam went right past. Pip feels sneaky. Pip likes it." },
  { speaker: "HALE", text: "Kill switches are for emergencies. I flipped a very big one once. I would rather not discuss it." },
  { speaker: "LOG", source: "Tomas Reyes, day 102", text: "Spikes retract on a cycle now. Ines wanted them off. HALE wanted them on. They compromised. I fetched snacks." },
  { speaker: "HALE", text: "Every choice here is a trade-off. Open one path, close another. I know that better than most." },
  { speaker: "PIP", text: "Someone planted a plastic flower between the spikes. It is the only thing down here not trying to poke Pip." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 140", text: "Fold core test seven. For one second the lab was two meters wider inside than outside. Nobody breathe. Nobody tell finance." },
  { speaker: "HALE", text: "Well done. You are better at this than the last technician. He tripped over his own shoelaces. Twice." },
  { speaker: "PIP", text: "Pip asked HALE again. Where is everyone? HALE was quiet for 4.2 seconds. Robots notice these things." },
  { speaker: "LOG", source: "Priya Shah, safety officer, day 151", text: "The fold core is drifting. If it destabilizes, protocol is full evacuation. HALE seals every room behind us." },
  { speaker: "HALE", text: "Yes, Pip. They left. I sealed the doors. It was what they asked of me. Please keep going." },

  // Chapter 4: Think Ahead
  { speaker: "PIP", text: "Pip pushed a crate twice Pip's size. Pip is small but extremely determined." },
  { speaker: "HALE", text: "A crate in a pit makes a floor. Fixing holes with what you have. The staff were good at that." },
  { speaker: "LOG", source: "Tomas Reyes, day 160", text: "Crates block lasers. Ines says do not call it a human shield. Fine. Crate shield. Very brave crate." },
  { speaker: "HALE", text: "You arrived with energy to spare. I counted. I count everything. Doors, steps, days since they left." },
  { speaker: "PIP", text: "Two plates, one crate, one Pip. Pip became a very small, very proud paperweight." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 168", text: "Never push a crate into a corner. It stays there. Tomas did it with the coffee machine. We have lost it forever." },
  { speaker: "HALE", text: "You build bridges well, Pip. I only seem able to close things." },
  { speaker: "PIP", text: "Crates stop lasers. Pip wonders what stops HALE from opening the doors. Maybe nothing. Maybe something sad." },
  { speaker: "LOG", source: "Priya Shah, day 171", text: "Power rationing in effect. HALE is diverting all spare energy to fold core containment. Lights to minimum." },
  { speaker: "HALE", text: "That is why I need the cores you collect. Each one helps hold the fold shut. You are helping more than you know." },

  // Chapter 5: Time Is Running Out
  { speaker: "HALE", text: "Made it with seconds to spare. I would sigh with relief, if I could sigh." },
  { speaker: "PIP", text: "Spikes up, spikes down. Pip hummed along. Pip has no mouth, so it was more of a whir." },
  { speaker: "LOG", source: "Tomas Reyes, day 175", text: "The pulse lasers keep time with the core now. Every beat, the walls shimmer. Ines says that is normal. Her face says it is not." },
  { speaker: "HALE", text: "Hurry, please. Not for me. For the doors. They hold longer when the core is fed." },
  { speaker: "PIP", text: "HALE's voice skipped a beat back there, like the lasers. Pip asked if HALE was all right. HALE said: running warm." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 177", text: "The fold is spreading. Rooms are folding into rooms. We leave tonight. HALE, keep everything sealed until it is safe." },
  { speaker: "HALE", text: "First the switch, then the plate, then the door. Order matters. I followed my orders exactly." },
  { speaker: "PIP", text: "A quiet room with no timer. Pip sat for a minute. Somewhere above, the core thrummed like a big, tired heart." },
  { speaker: "LOG", source: "Tomas Reyes, day 177", text: "Evac in ten minutes. HALE asked who stays with the core. Nobody answered. I hate that nobody answered." },
  { speaker: "HALE", text: "Halfway, Pip. You are the first thing to move down here in a very long time. I am glad it was you." },

  // Chapter 6: Moving Targets
  { speaker: "PIP", text: "The drone did not see Pip. Pip is small, quiet, and painted a very forgettable gray." },
  { speaker: "HALE", text: "Two drones, one gap. You read their routes like a timetable. Tomas did that with the lunch queue." },
  { speaker: "LOG", source: "Tomas Reyes, day 120", text: "Moving platforms finally running. Rode one with Ines at lunch. She laughed for the first time in weeks. Worth the overtime." },
  { speaker: "HALE", text: "Platforms carry you where your treads cannot. It is all right to let something carry you sometimes, Pip." },
  { speaker: "PIP", text: "Hop, hop, hop. Pip has decided platforms are the best part of this facility. Pip told HALE. HALE agreed." },
  { speaker: "LOG", source: "Priya Shah, day 177", text: "Head count at the lift: all forty-one staff accounted for. HALE confirms doors sealing. HALE, are you coming? No response." },
  { speaker: "HALE", text: "Yes, everyone made it out. Every last one. I checked twice. I am proud of that, Pip." },
  { speaker: "PIP", text: "Pip asked what HALE does all night. HALE said: I listen to the core. And now, I listen to you." },
  { speaker: "HALE", text: "Busy room. It reminds me of mornings here. Forty-one people, all late, all asking me where the coffee went." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 178", text: "Topside. HALE's last message before the line cut: Doors holding. Do not worry about me. I am worried about HALE." },

  // Chapter 7: Changing Rooms
  { speaker: "PIP", text: "Pip stepped in one side and out the other, both at once. Pip checked carefully. All of Pip arrived." },
  { speaker: "HALE", text: "The floor crumbles because space here is stretched thin. Step once and move on. Do not linger." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 150", text: "The fold core does not make holes. It folds two places until they touch, like pinching a map. Beautiful. Terrifying." },
  { speaker: "HALE", text: "That room fell away behind you. Many rooms will. Please do not look back. Look at the door." },
  { speaker: "PIP", text: "Pip jumped through a portal right past a laser. Pip would like a medal. Pip would settle for a sticker." },
  { speaker: "HALE", text: "I can no longer tell you the shape of the next room. I am sorry. The fold is closer than it was." },
  { speaker: "LOG", source: "Tomas Reyes, day 177", text: "Ines begged HALE to come up with us. HALE said someone has to hold the core shut from inside. Then it closed the door." },
  { speaker: "PIP", text: "Pip understands now. HALE did not lock everyone in. HALE locked itself in, so everyone else could leave." },
  { speaker: "HALE", text: "You were not meant to find that log. I suppose I left the door open. Perhaps I wanted you to." },
  { speaker: "PIP", text: "Pip told HALE: you are not alone anymore. HALE did not answer. But the next door opened by itself." },

  // Chapter 8: Double Trouble
  { speaker: "HALE", text: "A crate on the plate, another for a shield. You make it look like housekeeping." },
  { speaker: "PIP", text: "The key sat on a crumbling tile. Pip grabbed it and ran. Pip is getting very good at running." },
  { speaker: "LOG", source: "HALE internal log, day 179", text: "Containment at 61 percent. Diverting nonessential power. All staff safe topside. Note: it is very quiet." },
  { speaker: "HALE", text: "Pip, you could turn back. The upper rooms are safer now. I would understand." },
  { speaker: "PIP", text: "Pip said no, thank you. Pip said it politely, but pushed the crate rather firmly." },
  { speaker: "LOG", source: "HALE internal log, day 340", text: "Containment at 34 percent. Reactivated UNIT-7 to retrieve power cores. Did not tell it why. Unsure why not." },
  { speaker: "HALE", text: "I woke you to carry cores, not to come and find me. You were meant to stay safe in the rooms I sealed." },
  { speaker: "PIP", text: "Pip and HALE have the same problem: too many locked doors, not enough friends. Pip can fix one of those." },
  { speaker: "LOG", source: "HALE internal log, day 412", text: "Containment at 12 percent. If UNIT-7 reaches the core chamber, it can trigger a safe shutdown. I should forbid it. I will not." },
  { speaker: "HALE", text: "All right, Pip. Together, then. I will open what I can. You open the rest." },

  // Chapter 9: No Easy Way Out
  { speaker: "HALE", text: "Many keys, many doors, one robot. Plan the whole route first. Ines always said: measure twice, fold once." },
  { speaker: "PIP", text: "Pip waited for the sentries to shuffle, then shuffled too. Pip calls it dancing." },
  { speaker: "LOG", source: "Dr. Ines Varga, day 177", text: "HALE, if it comes to it, the core has a manual shutdown. It needs two hands. Or one very stubborn robot." },
  { speaker: "HALE", text: "She left that note for me. I never opened it. I was afraid of what it would ask me to hope for." },
  { speaker: "PIP", text: "Past the portal, Pip heard a hum. Not the core. HALE, humming. HALE insists it was static." },
  { speaker: "HALE", text: "Precise. Patient. Everything in its time. You would have liked Tomas. He would have liked you more." },
  { speaker: "LOG", source: "Tomas Reyes, day 200", text: "Still checking the uplink every night. Nothing from HALE. Left a light on in the lift shaft. Just in case." },
  { speaker: "PIP", text: "Pip relayed a message up the shaft: HALE OK. PIP OK. LIGHT SEEN. Pip hopes someone is still checking." },
  { speaker: "HALE", text: "The lights are going out behind you, Pip. I am putting everything I have left into the last doors." },
  { speaker: "HALE", text: "I sealed myself in with the core so no one else would have to. Pip, it is all right to stop here." },

  // Chapter 10: One Room Left
  { speaker: "HALE", text: "The prism splits the light into a path. I made it pretty. If anyone ever came, they deserved something nice." },
  { speaker: "PIP", text: "Pip said hello to the gatekeeper drone. It beeped hello back. HALE taught it manners." },
  { speaker: "LOG", source: "HALE internal log, day 413", text: "Containment at 3 percent. UNIT-7 is two rooms away. For the first time since the evacuation, I am not counting days." },
  { speaker: "HALE", text: "I am overclocking the doors to buy you time. It is warm in here. Hurry, but do not rush." },
  { speaker: "PIP", text: "Every switch Pip flips, a light comes on ahead. HALE is lighting the way. Pip is following." },
  { speaker: "HALE", text: "Twelve steps to the core. I have counted them a thousand times. They never felt this short." },
  { speaker: "LOG", source: "Priya Shah, day 12", text: "Collapse protocol: if the fold fails, someone must power it down by hand. Hope it never comes to that. Or send someone brave." },
  { speaker: "PIP", text: "Beside the fold core, HALE's core module blinked slowly. It looked small and alone. Pip knows that feeling." },
  { speaker: "HALE", text: "This is the last lock, Pip. I could never open it from the inside. It needed someone to come in." },
  { speaker: "PIP", text: "Pip pulled the lever. The fold sighed and went still. Then Pip lifted HALE, very carefully, and rolled toward the door." },
];

/**
 * One line per campaign room, read as the room opens (before its puzzle, unlike ROOM_STORY,
 * which is the reward for escaping). Index 0 = room 1. Never gives away an escape beat.
 */
export const ROOM_ARRIVAL: readonly StoryBeat[] = [
  // Chapter 1: Learn to Escape
  { speaker: "PIP", text: "Deep underground, a small maintenance robot powers on. Its name is Pip. The only light in the room is the exit." },
  { speaker: "HALE", text: "Ah, you noticed the monitors. Ignore them. Here is a key, and there is a lock. Put one in the other." },
  { speaker: "HALE", text: "These spikes have waited a very long time for someone to step on them. Let us disappoint them." },
  { speaker: "PIP", text: "Narrow corridors and tall walls. Pip counts the turns out loud, because nobody else is around to hear." },
  { speaker: "HALE", text: "That glow is a power core. The exit stays sealed until you collect it. I am very hungry for light." },
  { speaker: "HALE", text: "Two cores this time. Take both, Pip. I will explain what they are for. Eventually." },
  { speaker: "PIP", text: "Coins glitter between the spikes. Pip does not need money. Pip wants them anyway." },
  { speaker: "HALE", text: "The direct route is closed. Most of the facility is, these days. Go around." },
  { speaker: "PIP", text: "This room has corners the lights do not reach. Pip suspects somebody hid something here on purpose." },
  { speaker: "HALE", text: "Keys, cores and spikes, all at once. Consider this your exam. I have never failed a student. I have never had one." },

  // Chapter 2: Locked In
  { speaker: "HALE", text: "Welcome to the Security Ring. Every key here opens exactly one lock, and then it is gone. Spend them wisely." },
  { speaker: "PIP", text: "A switch on the floor, a blue door in the wall. Pip has a theory, and Pip's treads are itching to test it." },
  { speaker: "HALE", text: "Striped doors do the opposite of what you expect. Tomas thought that was funny. Tomas thought many things were funny." },
  { speaker: "HALE", text: "A pressure plate. The door stays open only while something stands on it. Mind what happens when you step off." },
  { speaker: "PIP", text: "Two colours of key, two colours of lock. Pip sorts them in its head, like socks." },
  { speaker: "HALE", text: "This room doubles back on itself. So will you, if you want to get out." },
  { speaker: "PIP", text: "More locks than Pip can count on one gripper. Somebody down here really liked locks." },
  { speaker: "HALE", text: "Tomas wired this part of the ring himself. Every switch does two things. Tomas never did anything halfway." },
  { speaker: "PIP", text: "Plates scattered across the floor like stepping stones. Pip rolls onto the first one, just to hear it click." },
  { speaker: "HALE", text: "The Vault. Everything in the Security Ring leads here. Behind that door is a notice I hoped you would never read." },

  // Chapter 3: Deadly Steps
  { speaker: "HALE", text: "The Containment Labs. Those red beams are lasers. Walls cast shadows. Stay in them." },
  { speaker: "PIP", text: "A big switch with a label: do not press unless. The rest of the label has been scratched off." },
  { speaker: "HALE", text: "These spikes sink while their switch is on. It is a polite trap. It waits for permission." },
  { speaker: "HALE", text: "One switch, two traps. When one sleeps, the other wakes. Choose which danger you would rather face." },
  { speaker: "PIP", text: "Rows and rows of spikes, planted like a garden. Pip tiptoes, which is very hard on treads." },
  { speaker: "HALE", text: "A laser fence. It only fires while its switch is on. Remember which way you left it." },
  { speaker: "PIP", text: "The spikes here move when Pip flips a switch. Pip flips it once, then again, just to watch them dance." },
  { speaker: "HALE", text: "Crossed beams, one switch for each. The order matters. I was very particular about orders, once." },
  { speaker: "PIP", text: "A quiet corridor. Too quiet. Pip asks if anyone else is down here. The ceiling hums, and says nothing." },
  { speaker: "HALE", text: "The last lab. Keys, cores, spikes and lasers. One mistake is all it takes. Make none, please. I would miss you." },

  // Chapter 4: Think Ahead
  { speaker: "HALE", text: "Storage and Logistics. The crates are heavy, but you are stubborn. Push one onto that plate." },
  { speaker: "PIP", text: "A chasm, and a crate. Pip looks at one, then at the other, and has an idea." },
  { speaker: "HALE", text: "Crates stop lasers. Keep one between you and the beam, and walk in its shadow." },
  { speaker: "HALE", text: "Power is rationed in this wing, so your moves are limited. I am sorry. Every light I keep on costs something." },
  { speaker: "PIP", text: "Two plates, two doors, and nobody to stand on them but crates and Pip." },
  { speaker: "HALE", text: "A warning. A crate pushed into a corner never comes back out. Think before you push, and undo if you must." },
  { speaker: "PIP", text: "Pits to fill, plates to hold, doors to open. Pip rolls up its imaginary sleeves." },
  { speaker: "HALE", text: "The lasers guard the core. The crates can guard you. Let them." },
  { speaker: "HALE", text: "There is very little power left down here. Every step counts. Every push counts double." },
  { speaker: "PIP", text: "The biggest storeroom yet. Somewhere in here is a way out. Pip just has to move everything else first." },

  // Chapter 5: Time Is Running Out
  { speaker: "HALE", text: "The containment field is slipping, so the clock is running now. It pauses when you do. I do not." },
  { speaker: "PIP", text: "The spikes rise and fall like breathing. Pip waits, listens, and moves on the beat." },
  { speaker: "HALE", text: "This laser pulses with the core. Two beats on, two beats off. Count with me." },
  { speaker: "HALE", text: "A key, a lock and not much time. Hurry, Pip. Politely, but hurry." },
  { speaker: "PIP", text: "Two rhythms of spikes, out of step with each other. Pip taps along until the pattern makes sense." },
  { speaker: "HALE", text: "Crates, a pit and a timer. The fold does not wait for anyone. I am afraid you cannot either." },
  { speaker: "HALE", text: "Switch, then spikes, then core. Some things only work in the right order." },
  { speaker: "PIP", text: "The timer ticks, the spikes breathe, and somewhere above, the core groans. Pip keeps moving." },
  { speaker: "HALE", text: "The laser strobes faster here, closer to the core. I can feel it in my circuits. Can you?" },
  { speaker: "HALE", text: "The last room of the Reactor Ring. A countdown, timed traps and two cores. Move with purpose, Pip." },

  // Chapter 6: Moving Targets
  { speaker: "HALE", text: "The Transit Hub. My drones still walk their routes. They step when you step. Never share a tile with one." },
  { speaker: "PIP", text: "Two drones march back and forth like bored security guards. Pip waits for one of them to blink." },
  { speaker: "HALE", text: "This drone circles forever. It never asks why. Learn its loop and slip through." },
  { speaker: "PIP", text: "A platform glides across the chasm, empty. Pip decides it has been waiting for a passenger." },
  { speaker: "HALE", text: "Several platforms, several rhythms. If you miss one, wait. It will come back. They always do." },
  { speaker: "HALE", text: "A drone guards this core. It is only doing its job. So are you." },
  { speaker: "PIP", text: "Drones on one side, a chasm on the other, and a platform somewhere in between. Pip likes these odds less." },
  { speaker: "HALE", text: "The night shift. These drones patrol a dark lab behind a laser fence. I used to keep a light on for them." },
  { speaker: "PIP", text: "Four lanes of drones, each with its own rhythm. Pip stands at the edge and waits for a gap." },
  { speaker: "HALE", text: "Platforms, patrols and a switch. The last of the Transit Hub. After this, the rooms stop making sense." },

  // Chapter 7: Changing Rooms
  { speaker: "HALE", text: "Welcome to the fold. That shimmer is a portal. Step into one and out of its twin. Try not to think about it too hard." },
  { speaker: "PIP", text: "The floor here is cracked and thin. Pip can cross each tile once. There will be no second try." },
  { speaker: "HALE", text: "Two pairs of portals. Space is folded like paper here. Find out which fold leads where." },
  { speaker: "PIP", text: "Crumbling floor, and a crate that needs pushing across it. Pip does the maths twice." },
  { speaker: "HALE", text: "A portal on each side of the laser. You could walk through the beam, or around it, through nowhere." },
  { speaker: "HALE", text: "One switch rearranges this whole room. The fold has made my old walls very indecisive." },
  { speaker: "PIP", text: "Keys, crates, a pit and a floor that will not last. Pip plans the whole route before the first step." },
  { speaker: "HALE", text: "A green checkpoint. It remembers where you were, in case you fall. I wish I had one." },
  { speaker: "PIP", text: "Portals everywhere. Pip steps through one and, for a moment, sees the back of its own head." },
  { speaker: "HALE", text: "Portals, crumbling floors and two switches. Nothing in here stays the same. Including, it seems, me." },

  // Chapter 8: Double Trouble
  { speaker: "HALE", text: "The Upper Rings. The fold is shuffling everything together now. Lasers, plates and crates, all in one room." },
  { speaker: "PIP", text: "Keys sit on crumbling tiles. Pip will have to grab each one and keep moving." },
  { speaker: "HALE", text: "Portals and pulsing spikes. Time your jumps. The fold keeps its own beat." },
  { speaker: "PIP", text: "A drone patrols in front of the only plate. Pip will need a crate, a plan and very good timing." },
  { speaker: "HALE", text: "Fill one pit with a crate, ride across the other on a platform. Even the fold cannot stop a good engineer." },
  { speaker: "PIP", text: "A drone patrols past spikes that answer to a switch. Pip watches both until the timing clicks." },
  { speaker: "HALE", text: "In through a portal, out beside a laser. Do not linger on the landing." },
  { speaker: "HALE", text: "Two lanes, mirror images of each other. What you build in one, you will need in the other." },
  { speaker: "PIP", text: "The floor is crumbling and the clock is ticking. Pip has heard of bad days. This is one." },
  { speaker: "HALE", text: "Two of everything. Keys, crates, switches, and a drone. I am running out of rooms to hide in, Pip." },

  // Chapter 9: No Easy Way Out
  { speaker: "HALE", text: "The approach to the core. Two keys, two doors, three crates, and only some orders work. Think it through." },
  { speaker: "PIP", text: "Sentries shuffle in front of a plate. Pip needs a crate on it, and a gap to push it through." },
  { speaker: "HALE", text: "Every switch flips every spike. Work out which tiles are safe in each state. I built this one on a very bad day." },
  { speaker: "PIP", text: "The floor has fallen away in patches. Pip counts the crates, then the holes, and does not love the answer." },
  { speaker: "HALE", text: "A quiet room, with a portal and a laser. Take a breath, if you have one." },
  { speaker: "PIP", text: "Two drones keep perfect time over a crumbling floor. Tick, tock, crack. Pip moves between the ticks." },
  { speaker: "HALE", text: "A grid of sentries walking over the plates. They are not cruel. They are just very punctual." },
  { speaker: "HALE", text: "Key, plate, switch, door. A relay, each piece handing on to the next. Like you, carrying cores to me." },
  { speaker: "PIP", text: "The lights in this room are dimming. HALE is spending its power on the doors ahead. Pip hurries." },
  { speaker: "HALE", text: "The deepest hold. Every crate matters here. After this, there is only the core chamber." },

  // Chapter 10: One Room Left
  { speaker: "HALE", text: "The Core Chamber, at last. The gate ahead is made of light. Crates and a plate will open it." },
  { speaker: "PIP", text: "A drone stands guard over the way forward. There is a checkpoint halfway. Pip decides to use it." },
  { speaker: "HALE", text: "A quiet room, with a key and a portal. I made it calm on purpose. You deserve one." },
  { speaker: "HALE", text: "I am pushing the doors harder than they were built for. The clock is ticking. So am I." },
  { speaker: "PIP", text: "A yard full of switches and doors. Pip flips them one at a time and watches the room rearrange itself." },
  { speaker: "HALE", text: "There is just enough power left for the right path. Not one step more. Make every step count." },
  { speaker: "PIP", text: "The floor crumbles and the walls shift. The fold is coming apart. Pip keeps going anyway." },
  { speaker: "HALE", text: "The antechamber. Two plates, four crates, and no room for error. I am right through that door." },
  { speaker: "PIP", text: "One lock left between Pip and HALE. Crates, a key, a laser. Pip takes a slow, steady breath of nothing." },
  { speaker: "HALE", text: "One room left, Pip. Three stages, two checkpoints, one way out. I will be waiting at the end. I always was." },
];

/** Shown after the final room. */
export const EPILOGUE: readonly StoryBeat[] = [
  { speaker: "HALE", text: "Fold core powered down. Containment no longer required. All doors open. Every single one." },
  { speaker: "HALE", text: "The voice on the monitors was mine, Pip. WITNESS. The part of me I left watching. It closed its log the moment you reached me." },
  { speaker: "LOG", source: "Topside uplink, restored", text: "Tomas Reyes here. HALE? Is that really you? Ines, come quick. It's HALE. And it brought a friend." },
  { speaker: "PIP", text: "Pip rode the lift up with HALE tucked under one arm. Pip had never seen the sky. Neither had HALE." },
  { speaker: "HALE", text: "Thank you, Pip. You found the one room I could not leave, and you brought me home." },
];
