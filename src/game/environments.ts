// The places the campaign happens in. Every campaign room belongs to an environment (what the
// place is made of, how it is lit, what it sounds like) and has its own design on top: a name for
// the place, why it exists in the Meridian Vault, a landmark that marks it, a clue in the scenery
// and a moment that makes it memorable. The board renders environments and landmarks
// (components/board/Environment.tsx); the rest of a design is the brief for the room.
//
// Regions follow the story's descent: Sublevel 3 (Intake, Security Ring), Sublevel 2 (Labs,
// Storage), Sublevel 1 (Reactor Ring, Transit Hub), the Fold, the core approach and the core.
import type { Palette } from '../theme/chapters';

export type FloorMaterial = 'plate' | 'grate' | 'tile' | 'checker' | 'carpet' | 'wood' | 'moss' | 'water' | 'ice' | 'neon' | 'stone' | 'hex' | 'glass';
export type WallMaterial = 'panel' | 'lockers' | 'tiles' | 'glass' | 'shelves' | 'hedge' | 'pipes' | 'servers' | 'crates' | 'ice' | 'neon' | 'brass' | 'stone' | 'drawings';
export type Particles = 'dust' | 'steam' | 'spores' | 'bubbles' | 'snow' | 'sparks' | 'data' | 'fireflies' | 'embers' | 'stars';
/** Small things on the walls, painted in the environment's colours. */
export type Prop = 'screen' | 'vent' | 'lamp' | 'sign' | 'pipe' | 'vine' | 'drawing' | 'gauge' | 'window' | 'camera' | 'clock' | 'rune' | 'cable';
/** Low-contrast marks on the floor that never compete with gameplay pieces. */
export type Decal = 'puddle' | 'leaves' | 'crack' | 'stripe' | 'papers' | 'frost' | 'rug' | 'scorch' | 'roots' | 'glyph' | 'cable';
export type Ambience = 'hum' | 'drip' | 'wind' | 'steam' | 'crickets' | 'machine' | 'tick' | 'buzz' | 'deep';

export interface Environment {
  id: EnvId;
  name: string;
  /** What the place was built for, in a sentence. */
  identity: string;
  palette: Palette & { accent: string };
  floor: FloorMaterial;
  wall: WallMaterial;
  particles: Particles;
  props: Prop[];
  decals: Decal[];
  ambience: Ambience;
  /** The painting behind the board (scripts/make-backdrops.py). */
  backdrop: string;
}

const env = <T extends Record<string, Omit<Environment, 'id'>>>(e: T) => e;

export const ENVIRONMENTS_RAW = env({
  // ---- Sublevel 3: Intake (chapter 1) --------------------------------------------------------
  'wake-bay': {
    name: 'Wake Pod Bay',
    identity: 'Where maintenance robots sleep between shifts, in charging cradles along a curved white wall.',
    palette: { bg: '#07131C', floor: '#1C3142', floorAlt: '#203749', wall: '#C9DCE8', wallEdge: '#FFFFFF', wallSide: '#6F8CA0', glow: '#3BE8FF', accent: '#7FF3FF' },
    floor: 'tile', wall: 'panel', particles: 'dust', props: ['lamp', 'vent', 'screen'], decals: ['stripe'], ambience: 'hum',
    backdrop: 'A curved white robotics bay with rows of empty glowing charging cradles, soft cyan light, clean and calm but long abandoned',
  },
  decon: {
    name: 'Decontamination Corridor',
    identity: 'Everyone entering the Vault was washed here. The floor vents still hiss.',
    palette: { bg: '#04130F', floor: '#173A33', floorAlt: '#1A4139', wall: '#DDEFE9', wallEdge: '#FFFFFF', wallSide: '#5E8F84', glow: '#4CF2C3', accent: '#B6FFE9' },
    floor: 'grate', wall: 'tiles', particles: 'steam', props: ['sign', 'pipe', 'lamp'], decals: ['puddle', 'stripe'], ambience: 'steam',
    backdrop: 'A white-tiled decontamination corridor with shower arches, drifting steam and mint green safety lights',
  },
  lockers: {
    name: 'Staff Locker Room',
    identity: 'Rows of staff lockers, some still with names on. One belongs to a UNIT-6.',
    palette: { bg: '#0A0F1E', floor: '#26324D', floorAlt: '#2A3754', wall: '#3E6FB0', wallEdge: '#8FB8F0', wallSide: '#22406B', glow: '#FFB547', accent: '#FFD27A' },
    floor: 'tile', wall: 'lockers', particles: 'dust', props: ['sign', 'lamp', 'clock'], decals: ['papers'], ambience: 'hum',
    backdrop: 'A staff locker room with tall blue lockers, a few doors hanging open, warm amber ceiling lamps and a bench',
  },
  'power-closet': {
    name: 'Charging Closet',
    identity: 'The circuit room that feeds Intake. Power cores were swapped in and out of these sockets.',
    palette: { bg: '#140B05', floor: '#3A2618', floorAlt: '#402A1B', wall: '#6E4528', wallEdge: '#E89A55', wallSide: '#43281A', glow: '#FFB547', accent: '#FFD27A' },
    floor: 'plate', wall: 'pipes', particles: 'sparks', props: ['gauge', 'cable', 'lamp'], decals: ['scorch', 'stripe'], ambience: 'buzz',
    backdrop: 'A cramped copper electrical room with fuse panels, thick cables, glowing amber power sockets and sparks',
  },
  infirmary: {
    name: 'Infirmary',
    identity: 'A small clinic for staff. The beds are made. The charts stop on the same date.',
    palette: { bg: '#06120F', floor: '#1E3A36', floorAlt: '#22403B', wall: '#E4F1EE', wallEdge: '#FFFFFF', wallSide: '#7AA59C', glow: '#FF7A6B', accent: '#FFB4A8' },
    floor: 'tile', wall: 'tiles', particles: 'dust', props: ['screen', 'sign', 'lamp'], decals: ['papers'], ambience: 'hum',
    backdrop: 'A quiet facility infirmary with white curtains, made beds, a coral red cross sign and soft mint walls',
  },
  daycare: {
    name: 'Staff Daycare',
    identity: "The staff's children played here. Their drawings cover the walls, and every one shows a little robot.",
    palette: { bg: '#170A12', floor: '#3B2440', floorAlt: '#422848', wall: '#FF8E72', wallEdge: '#FFD0A8', wallSide: '#B5523F', glow: '#FFD84D', accent: '#5CE1E6' },
    floor: 'carpet', wall: 'drawings', particles: 'dust', props: ['drawing', 'lamp', 'clock'], decals: ['rug'], ambience: 'tick',
    backdrop: 'An empty underground daycare with bright crayon drawings of a small robot on every wall, toy blocks, a play castle and dim warm lamps, slightly eerie',
  },
  canteen: {
    name: 'Staff Canteen',
    identity: 'Where the staff ate and argued. A coffee machine still blinks, and someone carved initials into it.',
    palette: { bg: '#120A06', floor: '#3A2A1E', floorAlt: '#1D4C4A', wall: '#2A8C86', wallEdge: '#7FE0D6', wallSide: '#175450', glow: '#FF9A3C', accent: '#FFC27A' },
    floor: 'checker', wall: 'tiles', particles: 'dust', props: ['lamp', 'sign', 'clock'], decals: ['papers'], ambience: 'hum',
    backdrop: 'A retro underground staff canteen with teal tiles, orange lamps, long tables, trays left behind and a blinking coffee machine',
  },
  records: {
    name: 'Records Closet',
    identity: 'Paper files nobody digitised. The lights never reached the corners, and someone hid things there.',
    palette: { bg: '#07071A', floor: '#1E1F3B', floorAlt: '#222442', wall: '#3A3C70', wallEdge: '#8C8FE0', wallSide: '#232552', glow: '#B38CFF', accent: '#FFD36E' },
    floor: 'carpet', wall: 'shelves', particles: 'dust', props: ['lamp', 'sign'], decals: ['papers'], ambience: 'deep',
    backdrop: 'A dim records room with indigo shelves of paper files, filing cabinets, a single desk lamp and long shadows in the corners',
  },
  checkpoint: {
    name: 'Security Checkpoint',
    identity: 'The gate between Intake and the Security Ring, with scanners that still check who passes.',
    palette: { bg: '#060A14', floor: '#1B2438', floorAlt: '#1F2940', wall: '#2B3A5C', wallEdge: '#FFD84D', wallSide: '#18233A', glow: '#FFD84D', accent: '#3BE8FF' },
    floor: 'plate', wall: 'panel', particles: 'dust', props: ['camera', 'sign', 'screen'], decals: ['stripe'], ambience: 'hum',
    backdrop: 'A security checkpoint with a body scanner arch, yellow and black hazard stripes, navy walls and a turnstile gate',
  },

  // ---- Sublevel 3: Security Ring (chapter 2) -------------------------------------------------
  'monitor-room': {
    name: 'Monitor Room',
    identity: 'Every camera in the Vault feeds this wall. Some of the screens are still showing Pip.',
    palette: { bg: '#040A16', floor: '#162238', floorAlt: '#19273F', wall: '#1D2E4F', wallEdge: '#3BE8FF', wallSide: '#101C33', glow: '#3BE8FF', accent: '#B38CFF' },
    floor: 'plate', wall: 'servers', particles: 'data', props: ['screen', 'camera', 'screen'], decals: ['cable'], ambience: 'buzz',
    backdrop: 'A dark security monitor room with a wall of glowing CCTV screens, swivel chairs and cyan light on the walls',
  },
  'cell-block': {
    name: 'Holding Cells',
    identity: 'Short-stay cells with doors that only open on a signal. They were never meant for robots.',
    palette: { bg: '#060B10', floor: '#20303A', floorAlt: '#243541', wall: '#4E6878', wallEdge: '#B7D3E0', wallSide: '#2D404B', glow: '#38F2C8', accent: '#FF8E72' },
    floor: 'grate', wall: 'glass', particles: 'dust', props: ['lamp', 'sign', 'camera'], decals: ['stripe'], ambience: 'drip',
    backdrop: 'A row of holding cells with glass doors and teal light strips, numbered doors and a long empty corridor',
  },
  'server-room': {
    name: 'Server Room',
    identity: 'HALE thinks in here. Tomas rewired half of it himself, and labelled nothing.',
    palette: { bg: '#030814', floor: '#121C33', floorAlt: '#15203A', wall: '#16244A', wallEdge: '#4C8DFF', wallSide: '#0C1630', glow: '#4C8DFF', accent: '#4CF2A0' },
    floor: 'hex', wall: 'servers', particles: 'data', props: ['cable', 'lamp', 'screen'], decals: ['cable'], ambience: 'buzz',
    backdrop: 'A cold server room with tall racks of blinking blue and green lights, cable bundles overhead and a raised floor',
  },
  'vault-corridor': {
    name: 'Vault Corridor',
    identity: 'Armoured corridors leading to the Vault, painted in warning stripes and full of locks.',
    palette: { bg: '#0D0B05', floor: '#2A2A2E', floorAlt: '#2F2F34', wall: '#545A66', wallEdge: '#FFC23D', wallSide: '#33363E', glow: '#FFC23D', accent: '#3BE8FF' },
    floor: 'plate', wall: 'panel', particles: 'dust', props: ['sign', 'lamp', 'gauge'], decals: ['stripe'], ambience: 'machine',
    backdrop: 'An armoured corridor with heavy riveted doors, yellow and black warning stripes and orange caged lamps',
  },
  vault: {
    name: 'The Vault',
    identity: 'The heart of the Security Ring. Behind its round door is the notice that sealed the facility.',
    palette: { bg: '#05060F', floor: '#1C1E33', floorAlt: '#20223A', wall: '#3A3256', wallEdge: '#FFD36E', wallSide: '#231E38', glow: '#FFD36E', accent: '#3BE8FF' },
    floor: 'stone', wall: 'brass', particles: 'dust', props: ['lamp', 'gauge'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'A grand underground vault chamber with a giant round gold vault door, deep blue stone walls and dramatic light',
  },

  // ---- Sublevel 2: Containment Labs (chapter 3) ----------------------------------------------
  'clean-lab': {
    name: 'Clean Lab',
    identity: 'A spotless optics lab where the lasers were tested. Every bench has a do-not-touch sign.',
    palette: { bg: '#061219', floor: '#1F3846', floorAlt: '#233F4E', wall: '#D5EEF6', wallEdge: '#FFFFFF', wallSide: '#6E9FB0', glow: '#3BE8FF', accent: '#FFB547' },
    floor: 'tile', wall: 'glass', particles: 'dust', props: ['screen', 'sign', 'lamp'], decals: ['stripe'], ambience: 'hum',
    backdrop: 'A bright clean optics laboratory with glass walls, white benches, lenses and thin cyan lights',
  },
  'specimen-vault': {
    name: 'Specimen Vault',
    identity: 'Tall tanks of glowing liquid. Most are empty now. One is not, but it is only a plant.',
    palette: { bg: '#0B0618', floor: '#251B40', floorAlt: '#2A1F48', wall: '#4B2E7A', wallEdge: '#C77DFF', wallSide: '#2C1A4C', glow: '#C77DFF', accent: '#4CF2C3' },
    floor: 'glass', wall: 'glass', particles: 'bubbles', props: ['gauge', 'lamp', 'pipe'], decals: ['puddle'], ambience: 'drip',
    backdrop: 'A dim specimen vault with tall cylindrical tanks of glowing violet and teal liquid, pipes and a strange plant floating in one',
  },
  'grow-lab': {
    name: 'Overgrown Grow Lab',
    identity: 'A hydroponics lab whose plants kept growing after everyone left, right over the machinery.',
    palette: { bg: '#04110A', floor: '#1C3A24', floorAlt: '#20412A', wall: '#2E7A45', wallEdge: '#8BF0A0', wallSide: '#1A4A2A', glow: '#9DFF6B', accent: '#FFE07A' },
    floor: 'moss', wall: 'hedge', particles: 'spores', props: ['vine', 'lamp', 'pipe'], decals: ['leaves', 'roots'], ambience: 'crickets',
    backdrop: 'An overgrown underground greenhouse lab with vines covering machinery, grow lamps casting warm light and broken irrigation pipes',
  },
  observation: {
    name: 'Observation Room',
    identity: 'One-way glass looks into the test rooms. The chairs face the glass. Someone is still watching.',
    palette: { bg: '#05040F', floor: '#18162E', floorAlt: '#1B1934', wall: '#2B2752', wallEdge: '#E07CFF', wallSide: '#1A1736', glow: '#E07CFF', accent: '#3BE8FF' },
    floor: 'carpet', wall: 'glass', particles: 'data', props: ['camera', 'screen', 'window'], decals: ['papers'], ambience: 'buzz',
    backdrop: 'A dark observation room behind one-way glass, swivel chairs facing the window, glowing magenta monitors recording',
  },

  // ---- Sublevel 2: Storage and Logistics (chapter 4) -----------------------------------------
  warehouse: {
    name: 'Warehouse',
    identity: 'High shelving and heavy crates. Everything the Vault needed came through here.',
    palette: { bg: '#120B06', floor: '#3A2D22', floorAlt: '#403126', wall: '#7A4A2A', wallEdge: '#FF9A3C', wallSide: '#4A2D1A', glow: '#FF9A3C', accent: '#4C8DFF' },
    floor: 'plate', wall: 'crates', particles: 'dust', props: ['sign', 'lamp', 'gauge'], decals: ['stripe'], ambience: 'machine',
    backdrop: 'A huge underground warehouse with tall orange shelving, stacked wooden crates, a parked forklift and blue floor markings',
  },
  'cargo-lift': {
    name: 'Cargo Lift Shafts',
    identity: 'Open lift shafts where the platforms fell. Crates are the only way across.',
    palette: { bg: '#0A0806', floor: '#2E2A26', floorAlt: '#34302B', wall: '#4D4A46', wallEdge: '#FFD84D', wallSide: '#2E2C29', glow: '#FFD84D', accent: '#FF7A59' },
    floor: 'grate', wall: 'panel', particles: 'dust', props: ['sign', 'lamp', 'cable'], decals: ['stripe', 'crack'], ambience: 'wind',
    backdrop: 'A dark cargo lift hall with open shafts, hanging chains, yellow hazard railings and a broken lift cage',
  },
  'cold-storage': {
    name: 'Cold Storage',
    identity: 'Freezers for samples and supplies. The cooling still works, a little too well.',
    palette: { bg: '#040C16', floor: '#284052', floorAlt: '#2D485C', wall: '#A9D8F0', wallEdge: '#EAF8FF', wallSide: '#5E8BA6', glow: '#7FD8FF', accent: '#FFB547' },
    floor: 'ice', wall: 'ice', particles: 'snow', props: ['gauge', 'lamp', 'sign'], decals: ['frost'], ambience: 'wind',
    backdrop: 'A frozen cold storage room with frosted freezer doors, icicles, pale blue light and one warm amber lamp',
  },
  generator: {
    name: 'Generator Room',
    identity: 'The backup generators, rationing what power is left. Every step costs light.',
    palette: { bg: '#0E0606', floor: '#2C1F1E', floorAlt: '#322322', wall: '#5A3A36', wallEdge: '#FF7A59', wallSide: '#3A2523', glow: '#FF7A59', accent: '#FFD84D' },
    floor: 'plate', wall: 'pipes', particles: 'embers', props: ['gauge', 'lamp', 'cable'], decals: ['scorch'], ambience: 'machine',
    backdrop: 'A dim generator hall with big humming machines, red emergency lights and gauges near empty',
  },

  // ---- Sublevel 1: Reactor Ring (chapter 5) --------------------------------------------------
  reactor: {
    name: 'Reactor Ring',
    identity: 'The containment field around the fold core. It pulses, and the rooms pulse with it.',
    palette: { bg: '#0C0414', floor: '#2A1638', floorAlt: '#301940', wall: '#5A2470', wallEdge: '#FF5CD6', wallSide: '#3A1748', glow: '#FF5CD6', accent: '#3BE8FF' },
    floor: 'hex', wall: 'brass', particles: 'embers', props: ['gauge', 'lamp', 'pipe'], decals: ['scorch', 'glyph'], ambience: 'deep',
    backdrop: 'A ring-shaped reactor chamber with a pulsing magenta energy core, heavy coils and violet light',
  },
  coolant: {
    name: 'Coolant Tunnels',
    identity: 'Flooded tunnels that carried coolant to the reactor. The water is shallow, cold and glowing.',
    palette: { bg: '#03101A', floor: '#13394A', floorAlt: '#164154', wall: '#1E5470', wallEdge: '#4CF2E0', wallSide: '#113548', glow: '#4CF2E0', accent: '#C0E8FF' },
    floor: 'water', wall: 'pipes', particles: 'bubbles', props: ['pipe', 'lamp', 'gauge'], decals: ['puddle'], ambience: 'drip',
    backdrop: 'A partly flooded maintenance tunnel with turquoise glowing water, big pipes, silver reflections and dripping leaks',
  },
  'reactor-control': {
    name: 'Reactor Control',
    identity: 'Where the reactor was run from. The countdown on the main screen started on its own.',
    palette: { bg: '#0E0904', floor: '#2C2418', floorAlt: '#32291C', wall: '#3E3420', wallEdge: '#FFB547', wallSide: '#2A2316', glow: '#FFB547', accent: '#FF5CD6' },
    floor: 'plate', wall: 'servers', particles: 'data', props: ['screen', 'gauge', 'clock'], decals: ['papers'], ambience: 'tick',
    backdrop: 'A reactor control room with amber consoles, a giant countdown screen, warning lights and empty chairs',
  },

  // ---- Sublevel 1: Transit Hub (chapter 6) ---------------------------------------------------
  train: {
    name: 'Stalled Train',
    identity: 'A shuttle carriage frozen mid-route. The drones still patrol its aisle.',
    palette: { bg: '#0A0710', floor: '#2D2438', floorAlt: '#332940', wall: '#8C3B4C', wallEdge: '#FF9AAE', wallSide: '#5A2532', glow: '#FFB547', accent: '#3BE8FF' },
    floor: 'carpet', wall: 'panel', particles: 'dust', props: ['window', 'sign', 'lamp'], decals: ['papers'], ambience: 'hum',
    backdrop: 'The inside of an abandoned underground shuttle train carriage with red seats, windows showing a dark tunnel and flickering lamps',
  },
  platform: {
    name: 'Shuttle Platforms',
    identity: 'Platforms over deep tracks. Cargo floats still ferry back and forth, empty.',
    palette: { bg: '#060A10', floor: '#2A3340', floorAlt: '#2F3948', wall: '#3C5470', wallEdge: '#7CFF6B', wallSide: '#243446', glow: '#7CFF6B', accent: '#FFD84D' },
    floor: 'stone', wall: 'tiles', particles: 'dust', props: ['sign', 'clock', 'lamp'], decals: ['stripe'], ambience: 'wind',
    backdrop: 'An underground shuttle station platform with tiled walls, a big station clock, green signage and deep track pits',
  },
  hangar: {
    name: 'Drone Hangar',
    identity: 'Where HALE’s patrol drones dock and recharge. Their routes are painted on the floor.',
    palette: { bg: '#04080A', floor: '#1C2A2C', floorAlt: '#203032', wall: '#2F4A4C', wallEdge: '#7CFF6B', wallSide: '#1C2F31', glow: '#7CFF6B', accent: '#FF7A59' },
    floor: 'grate', wall: 'panel', particles: 'sparks', props: ['lamp', 'camera', 'gauge'], decals: ['stripe'], ambience: 'machine',
    backdrop: 'A drone hangar with charging docks on the walls, hovering patrol drones with green lights and painted route lines on the floor',
  },

  // ---- The Fold: Lower Rings (chapter 7) -----------------------------------------------------
  simulation: {
    name: 'Simulation Chamber',
    identity: 'A training simulator the fold got into. The grid glitches and doors open onto the wrong rooms.',
    palette: { bg: '#0A0418', floor: '#1C1238', floorAlt: '#211542', wall: '#3A1A6A', wallEdge: '#FF5CF0', wallSide: '#241046', glow: '#FF5CF0', accent: '#3BE8FF' },
    floor: 'neon', wall: 'neon', particles: 'data', props: ['rune', 'screen'], decals: ['glyph'], ambience: 'buzz',
    backdrop: 'A neon simulation chamber with a glowing magenta and cyan wireframe grid, floating geometric shapes and a glitching horizon',
  },
  'flooded-archive': {
    name: 'Flooded Archive',
    identity: 'An archive the fold dropped into the coolant line. Papers float, and the floor is giving way.',
    palette: { bg: '#030A14', floor: '#1A3346', floorAlt: '#1D3A50', wall: '#2D4F6A', wallEdge: '#FFD36E', wallSide: '#1B3346', glow: '#4CF2E0', accent: '#FFD36E' },
    floor: 'water', wall: 'shelves', particles: 'bubbles', props: ['lamp', 'sign'], decals: ['papers', 'crack'], ambience: 'drip',
    backdrop: 'A half-flooded underground archive with tall bookshelves standing in turquoise water, floating papers and golden lamp light',
  },
  'shifting-rooms': {
    name: 'Shifting Rooms',
    identity: 'Geometry the fold cannot decide on. Walls slide, and corners point the wrong way.',
    palette: { bg: '#08061A', floor: '#232044', floorAlt: '#28244C', wall: '#5A4FB0', wallEdge: '#A8F0FF', wallSide: '#383070', glow: '#A8F0FF', accent: '#FF8FD1' },
    floor: 'hex', wall: 'glass', particles: 'stars', props: ['rune', 'window'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'An impossible room of floating sliding geometric blocks and staircases at odd angles, indigo and pale cyan light',
  },

  // ---- The Fold: Upper Rings (chapter 8) -----------------------------------------------------
  clockwork: {
    name: 'Clockwork Hall',
    identity: 'The fold runs on rhythm here. Old brass gears turn the floor, the doors and the drones.',
    palette: { bg: '#0F0A04', floor: '#33291A', floorAlt: '#3A2E1D', wall: '#6E5226', wallEdge: '#FFD36E', wallSide: '#46341A', glow: '#FFD36E', accent: '#4CF2E0' },
    floor: 'wood', wall: 'brass', particles: 'dust', props: ['clock', 'gauge', 'lamp'], decals: ['glyph'], ambience: 'tick',
    backdrop: 'An ancient clockwork chamber with giant turning brass gears, pendulums, warm gold light and teal enamel details',
  },
  observatory: {
    name: 'Upside-down Observatory',
    identity: 'An observatory where the sky is underfoot. Stars drift past the telescopes.',
    palette: { bg: '#03030F', floor: '#151A3A', floorAlt: '#181E42', wall: '#252C5E', wallEdge: '#B38CFF', wallSide: '#151A3C', glow: '#B38CFF', accent: '#FFD36E' },
    floor: 'glass', wall: 'panel', particles: 'stars', props: ['window', 'lamp', 'rune'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'A gravity-defying observatory with telescopes hanging upside down, a starfield below the floor and violet nebula light',
  },
  'mirror-hall': {
    name: 'Mirror Hall',
    identity: 'Every room here has a twin. The fold copies what you build, a moment late.',
    palette: { bg: '#060A10', floor: '#202A36', floorAlt: '#243040', wall: '#7A8EA6', wallEdge: '#E6F2FF', wallSide: '#4A5A6E', glow: '#E6F2FF', accent: '#FF8FD1' },
    floor: 'glass', wall: 'glass', particles: 'dust', props: ['window', 'lamp'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'A long hall of tall mirrors reflecting each other into infinity, silver and pale pink light, polished dark floor',
  },

  // ---- Fold Core Approach (chapter 9) --------------------------------------------------------
  library: {
    name: 'Forgotten Library',
    identity: "HALE's own library: every log, plan and staff record, shelved by hand. Some pages were never meant to be read.",
    palette: { bg: '#030E0F', floor: '#173234', floorAlt: '#1A383A', wall: '#1E4A4C', wallEdge: '#FFD36E', wallSide: '#123234', glow: '#FFD36E', accent: '#4CF2E0' },
    floor: 'wood', wall: 'shelves', particles: 'dust', props: ['lamp', 'sign', 'rune'], decals: ['papers'], ambience: 'deep',
    backdrop: 'A forgotten underground library with deep teal shelves to the ceiling, rolling ladders, golden reading lamps and luminous symbols',
  },
  temple: {
    name: 'Old Foundations',
    identity: 'The Vault was built on something older. Stone halls with symbols that match the fold’s.',
    palette: { bg: '#080A08', floor: '#2C2E26', floorAlt: '#31342B', wall: '#55584A', wallEdge: '#4CF2C3', wallSide: '#36382E', glow: '#4CF2C3', accent: '#FFD36E' },
    floor: 'stone', wall: 'stone', particles: 'fireflies', props: ['rune', 'vine', 'lamp'], decals: ['roots', 'glyph'], ambience: 'wind',
    backdrop: 'A ruined underground stone temple with glowing teal symbols carved in the walls, roots through the ceiling and fireflies',
  },
  'core-gate': {
    name: 'Core Gate',
    identity: 'The last defences before the core. HALE built them to be impossible, and is losing power to hold them.',
    palette: { bg: '#04050E', floor: '#1A1D30', floorAlt: '#1E2136', wall: '#2E3456', wallEdge: '#9CF5FF', wallSide: '#1C2038', glow: '#9CF5FF', accent: '#FF5CD6' },
    floor: 'hex', wall: 'panel', particles: 'embers', props: ['gauge', 'lamp', 'screen'], decals: ['scorch', 'crack'], ambience: 'deep',
    backdrop: 'A massive fortified gate hall before a glowing core, flickering pale cyan lights failing one by one, magenta cracks in the walls',
  },

  // ---- The Core Chamber (chapter 10) ---------------------------------------------------------
  prism: {
    name: 'Prism Gardens',
    identity: 'The core spills light through crystal. Beams bend into rainbows; plants grow toward them.',
    palette: { bg: '#060816', floor: '#1E2440', floorAlt: '#222948', wall: '#3D4C8C', wallEdge: '#FFFFFF', wallSide: '#26305A', glow: '#FFFFFF', accent: '#FFD36E' },
    floor: 'glass', wall: 'glass', particles: 'fireflies', props: ['rune', 'vine', 'lamp'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'A crystal garden around a radiant core, prisms splitting light into rainbows, small luminous plants and white gold glow',
  },
  'core-heart': {
    name: 'The Core',
    identity: 'HALE’s heart: the fold core itself, and the door that opens from both sides.',
    palette: { bg: '#05030C', floor: '#201833', floorAlt: '#251C3A', wall: '#3B2A5E', wallEdge: '#FFD36E', wallSide: '#241A3C', glow: '#FFD36E', accent: '#3BE8FF' },
    floor: 'neon', wall: 'brass', particles: 'stars', props: ['rune', 'lamp', 'screen'], decals: ['glyph'], ambience: 'deep',
    backdrop: 'The final core chamber, a huge glowing golden sphere of light held in a ring of machinery, cyan threads of data and a door at the far end',
  },
});

export type EnvId = keyof typeof ENVIRONMENTS_RAW;

export const ENVIRONMENTS: Record<EnvId, Environment> = Object.fromEntries(
  Object.entries(ENVIRONMENTS_RAW).map(([id, e]) => [id, { id, ...e }]),
) as Record<EnvId, Environment>;

/** A large set piece drawn on the room's back wall (components/board/landmarks.tsx). */
export type Landmark =
  | 'cradle' | 'monitors' | 'shower' | 'locker' | 'fusebox' | 'bed' | 'castle' | 'coffee' | 'cabinet' | 'scanner'
  | 'cell' | 'rack' | 'vaultdoor' | 'microscope' | 'tank' | 'tree' | 'window' | 'shelf' | 'forklift' | 'freezer'
  | 'generator' | 'coil' | 'pump' | 'countdown' | 'traindoor' | 'stationclock' | 'dock' | 'cube' | 'bookstack'
  | 'gear' | 'telescope' | 'mirror' | 'ladder' | 'obelisk' | 'gate' | 'prism' | 'core';

export interface RoomDesign {
  env: EnvId;
  /** The place, shown with the room's name ("Wake Pod Bay"). */
  place: string;
  /** Why this room exists in the Vault and in the story. */
  purpose: string;
  landmark: Landmark;
  /** What the scenery tells a curious player. */
  clue: string;
  /** The thing a player remembers about this room beyond its puzzle. */
  moment: string;
}

const d = (env: EnvId, place: string, landmark: Landmark, purpose: string, clue: string, moment: string): RoomDesign => ({ env, place, landmark, purpose, clue, moment });

/** One design per campaign room, in order (room 1 first). */
export const ROOM_DESIGNS: readonly RoomDesign[] = [
  // Chapter 1: Intake. Pip wakes up, learns to move, and notices it is being watched.
  d('wake-bay', 'Wake Pod Bay', 'cradle', 'Pip powers on in its charging cradle; the first step out of it.', 'Every other cradle is empty and dusty. One is labelled UNIT-6.', 'The only light is the exit; the cradle behind Pip dims as it leaves.'),
  d('lockers', 'Intake Lobby', 'monitors', 'The first lock and key, under a bank of monitors.', 'One monitor shows this room, from a camera Pip cannot find.', 'The monitors flick to Pip as it picks up the key.'),
  d('decon', 'Decontamination Corridor', 'shower', 'Spikes are the old floor vents; Pip learns danger is fair and readable.', 'A sign: SUBJECTS MUST PASS DECON. Not staff. Subjects.', 'Steam rolls out of the shower arch as Pip passes.'),
  d('lockers', 'Staff Locker Room', 'locker', 'A maze of locker rows; learning to plan a route.', "Locker 6 is open and empty, with a charging cable inside. Pip's size.", "Pip's name is written on a strip of tape on locker 7."),
  d('power-closet', 'Charging Closet', 'fusebox', 'First power core: the exit is fed by what Pip carries.', 'The fuse labels are in HALE’s handwriting font, dated after the sealing.', 'The fusebox sparks alive when the core is collected.'),
  d('infirmary', 'Infirmary', 'bed', 'Two cores, two beds; learning that order of collection matters.', 'The patient charts on both beds say UNIT-7. Different dates.', 'A heart monitor on the wall beeps in time with Pip’s steps.'),
  d('daycare', 'Staff Daycare', 'castle', 'Coins among spikes; optional risk for reward, in a room made for children.', 'Every crayon drawing shows a little robot with an antenna, years before Pip was built.', 'A toy castle in the corner has a tiny exit door drawn on it, in the same place as the real one.'),
  d('canteen', 'Staff Canteen', 'coffee', 'The long way round; the direct route is blocked by fallen tables.', 'T.R. + coffee machine, forever, carved into the machine. Tomas was here.', 'The coffee machine blinks READY when Pip rolls past.'),
  d('records', 'Records Closet', 'cabinet', 'Hidden corners where the light never reached; the first hidden coin.', 'An open drawer of personnel files with every photo removed.', 'Pip’s light finds a sigil drawn on the back of a cabinet.'),
  d('checkpoint', 'Security Checkpoint', 'scanner', 'The Intake exam: keys, cores and spikes, judged by a scanner.', 'The scanner screen reads SUBJECT 7: PASS. It does not say robot.', 'The scanner arch turns green and the gate to the Security Ring opens.'),

  // Chapter 2: Security Ring. Locks, switches and doors; someone kept everyone in.
  d('monitor-room', 'Monitor Room', 'monitors', 'One key per lock, watched from a wall of screens.', 'Screen 12 shows a room Pip has not visited yet, with Pip in it.', 'All screens turn to face Pip for a moment, then go back.'),
  d('cell-block', 'Holding Cell A', 'cell', 'The first switch and door: a cell that opens on a signal.', 'A scratched tally on the cell wall: 41 days.', 'The cell door slides with a heavy clunk the first time the switch flips.'),
  d('server-room', 'Tomas’s Wiring', 'rack', 'Striped doors invert: Tomas’s joke wiring.', 'A sticky note on a rack: IF YOU READ THIS, I REWIRED IT. -T', 'The server lights ripple in the pattern of the striped doors.'),
  d('cell-block', 'Pressure Lock', 'cell', 'Holding a plate to hold a door; an airlock for prisoners.', 'The plate has two worn footprints. Human ones.', 'The door hisses like an airlock when the plate is held.'),
  d('vault-corridor', 'Colour Store', 'locker', 'Blue and gold keys sorted like a security key store.', 'Two key hooks are empty: MASTER and HALE.', 'Key cabinets glow blue and gold as each key is taken.'),
  d('monitor-room', 'Patrol Desk', 'monitors', 'A room that doubles back, like a guard’s patrol route.', 'A logbook open on the desk: the last entry is in the middle of a word.', 'The desk lamp follows Pip as it doubles back.'),
  d('vault-corridor', 'Key Gallery', 'locker', 'Many locks; somebody loved locks.', 'Each lock is engraved with a different staff name.', 'All locks click open in a chain when the last key turns.'),
  d('server-room', 'Crossed Wires', 'rack', 'Every switch does two things, because Tomas wired it.', 'A wiring diagram with HALE crossed out and HELLO written in.', 'Sparks run along the cables between linked switches.'),
  d('cell-block', 'Exercise Yard', 'window', 'Stepping-stone plates across a prisoners’ exercise yard.', 'A painted sky on the ceiling, peeling to show concrete.', 'The fake sky flickers to real stars for one second when the last plate is pressed.'),
  d('vault', 'The Vault', 'vaultdoor', 'Everything in the Ring leads to the Vault door and the sealing notice.', 'The notice: SEALED BY ORDER OF HALE. The signature is shaky.', 'The giant round door rolls open, gears turning in the frame.'),

  // Chapter 3: Containment Labs. Lasers and traps; what were they testing?
  d('clean-lab', 'Optics Bench', 'microscope', 'First lasers; walls cast shadows to hide in.', 'Test log: SUBJECT AVOIDED BEAM 14/14 TIMES. Subject? Pip?', 'The beam refracts into a faint rainbow on the glass.'),
  d('clean-lab', 'Kill-Switch Lab', 'monitors', 'A big switch that turns a laser off, label scratched out.', 'The scratched label still reads DO NOT PRESS UNLESS HALE.', 'Every lab light dips when the switch is pressed.'),
  d('specimen-vault', 'Specimen Vault', 'tank', 'Spikes that sink on command; polite traps among tanks.', 'One tank holds a plant that turns to follow Pip.', 'Bubbles rise in every tank when the spikes retract.'),
  d('specimen-vault', 'Trade-off Lab', 'microscope', 'One switch, two traps: choose your danger.', 'Two tank labels: CONTROL and VARIABLE. Pip is standing by VARIABLE.', 'The tanks glow violet or teal with the switch.'),
  d('grow-lab', 'Spike Garden', 'tree', 'Rows of spikes planted like a garden; the lab became one.', 'Seed packets labelled with dates after the sealing. Someone kept gardening.', 'Leaves fall from the tree whenever Pip passes beneath.'),
  d('clean-lab', 'Laser Fence', 'scanner', 'A fence that fires only while its switch is on.', 'A coat hangs on the fence post. Lab coat, name badge: I. VEGA.', 'The fence posts hum louder before they fire.'),
  d('grow-lab', 'Root Cellar', 'tree', 'Spikes that move with a switch, among roots that broke the floor.', 'Roots have grown around a camera, blinding it.', 'A flower opens when the switch flips.'),
  d('specimen-vault', 'Crossfire Test', 'tank', 'Crossed beams, one switch each; order matters.', 'A whiteboard of test orders, HALE’s favourite in a circle.', 'Beams paint the tanks with criss-crossing light.'),
  d('observation', 'Observation Booth', 'window', 'A quiet corridor beside one-way glass; someone watches.', 'Two chairs face the glass. One is still warm, the readout says.', 'The glass goes clear for a moment: the booth is empty, the chair is spinning.'),
  d('clean-lab', 'Test Arena', 'monitors', 'The lab’s final test with everything combined.', 'Scoreboard: UNIT-6 FAILED. UNIT-7: IN PROGRESS.', 'Arena lights sweep on, stadium style, as Pip enters.'),

  // Chapter 4: Storage and Logistics. Crates, pits and a power budget.
  d('warehouse', 'Loading Dock', 'forklift', 'First crate: push it onto a plate.', 'Delivery slips stop on the sealing date. The last crate is addressed to UNIT-7.', 'The forklift’s headlights flick on when the plate is pressed.'),
  d('cargo-lift', 'Lift Shaft B', 'ladder', 'Fill a pit with a crate to cross.', 'The lift cage lies at the bottom of the shaft, far below.', 'Pip hears the crate land a long, long time after it falls.'),
  d('cold-storage', 'Cold Room', 'freezer', 'Crates block lasers; walk in their shadow.', 'Frost on the freezer door has a handprint melted into it.', 'Breath-like fog puffs from the freezer when Pip passes.'),
  d('generator', 'Rationed Hall', 'generator', 'Limited moves: power is rationed.', 'Generator gauge reads 3%. A note: SAVE IT FOR THE ROBOT.', 'The lights fade one by one as moves run out.'),
  d('warehouse', 'Sorting Floor', 'shelf', 'Two plates, two doors, crates as helpers.', 'Shelves sorted by a label maker that only had the letter H.', 'A conveyor belt shudders when both plates are held.'),
  d('cargo-lift', 'Corner Trap', 'ladder', 'A crate in a corner never comes back: think before pushing.', 'Scratches on the floor where someone dragged a crate out by hand.', 'The crate thuds with dust when it hits the corner.'),
  d('warehouse', 'Bridge Yard', 'forklift', 'Fill pits, hold plates, open doors.', 'A half-built crate bridge, abandoned mid-job.', 'The warehouse sign swings when the bridge is complete.'),
  d('cold-storage', 'Frozen Core', 'freezer', 'Lasers guard a core frozen in ice; crates shield Pip.', 'The core in the ice has a label: SPARE. FOR PIP.', 'Ice cracks around the core as Pip takes it.'),
  d('generator', 'Last Battery', 'generator', 'Very little power left: every push counts double.', 'Battery rack: all empty but one, with a robot-sized handle.', 'The final light holds steady just long enough.'),
  d('warehouse', 'Great Warehouse', 'shelf', 'The biggest storeroom: move everything to find the way.', 'High up, a crate stamped HALE: PERSONAL.', 'Shelves rumble and a high crate topples into the right place.'),

  // Chapter 5: Reactor Ring. The field weakens; everything runs on timers.
  d('reactor', 'Field Monitor', 'coil', 'The first countdown: the field is slipping.', 'A graph on the wall: field strength falling since the day Pip woke.', 'The reactor glow pulses in time with the countdown.'),
  d('coolant', 'Coolant Pumps', 'pump', 'Spikes rise and fall like breathing pumps.', 'Pump labels list flow rates; one is labelled PIP’S RHYTHM in marker.', 'Water surges along the floor with each pump beat.'),
  d('reactor', 'Pulse Chamber', 'coil', 'A laser pulsing with the core: two on, two off.', 'Scorch marks in the shape of a person, far from the beam path.', 'The coil arcs at every pulse.'),
  d('reactor-control', 'Control Room', 'countdown', 'A key, a lock and not much time.', 'The big countdown started on the day of the sealing. It was never meant to reach zero.', 'The countdown screen flashes HURRY in HALE’s colours.'),
  d('coolant', 'Overflow Tunnel', 'pump', 'Two spike rhythms out of step.', 'A tide line on the wall: the water was once higher.', 'Ripples cross the water in the two rhythms at once.'),
  d('reactor-control', 'Emergency Bay', 'countdown', 'Crates, a pit and a timer.', 'An evacuation list: every name ticked except HALE.', 'Sirens light but make no sound.'),
  d('reactor', 'Ignition Sequence', 'coil', 'Switch, then spikes, then core: order of operations.', 'Ignition checklist in Tomas’s handwriting, step 3 underlined.', 'The core flares brighter with each step done in order.'),
  d('coolant', 'Breathing Room', 'pump', 'Timer and breathing spikes; keep moving.', 'Someone left a folded chair by the water, facing the reactor.', 'Bubbles burst from the vents in the rhythm of the spikes.'),
  d('reactor', 'Strobe Ring', 'coil', 'A laser strobing faster near the core.', 'Warning sign: FIELD UNSTABLE. Below it, in marker: SO IS HALE.', 'The whole room strobes softly with the laser (reduced with Reduced motion).'),
  d('reactor-control', 'Field Override', 'countdown', 'The last reactor room: two cores and timed traps.', 'The override key is missing; a robot-sized slot is not.', 'The countdown freezes at 00:01 as Pip escapes.'),

  // Chapter 6: Transit Hub. Drones patrol and platforms ferry.
  d('train', 'Carriage 1', 'traindoor', 'The first drone patrolling a stalled train aisle.', 'Tickets on the seats, all one-way, all for the same day.', 'The carriage lights flicker when the drone turns.'),
  d('train', 'Carriage 2', 'window', 'Two drones marching like guards down the aisle.', 'A child’s backpack under a seat, with a little robot keyring.', 'Through the window, a second train passes in the dark.'),
  d('hangar', 'Drone Carousel', 'dock', 'A drone circling forever; learn its loop.', 'A dock labelled HALE’S FAVOURITE, with a smiley face.', 'The docking lights chase around the room with the drone.'),
  d('platform', 'Ferry Platform', 'stationclock', 'A platform glides over the track pit, waiting for a passenger.', 'The departure board lists one destination: CORE.', 'The station clock chimes as Pip boards.'),
  d('platform', 'Platform Hop', 'traindoor', 'Several platforms, several rhythms.', 'Lost property shelf: a hard hat, a scarf, a robot antenna.', 'Platform lights blink in sequence like runway lights.'),
  d('hangar', 'Guard Post', 'dock', 'A drone guarding a core.', 'The guard drone’s route is painted around the core in a heart shape.', 'The drone pauses to scan Pip, then carries on.'),
  d('platform', 'Crossing', 'stationclock', 'Drones on one side, a chasm on the other.', 'A painted line on the floor: MIND THE GAP. Pip does.', 'A gust from the tunnel scatters papers across the platform.'),
  d('hangar', 'Night Watch', 'dock', 'Drones patrolling a dark lab behind a laser fence.', 'HALE’s night light: a small lamp left on in a dock.', 'The night light flickers out as the last drone passes.'),
  d('platform', 'Rush Hour', 'traindoor', 'Four lanes of drones like commuter traffic.', 'A timetable showing rush hour at 8:15, every day, still.', 'Phantom announcements scroll across the boards.'),
  d('train', 'Last Convoy', 'traindoor', 'Platforms, patrols and a switch: the last of the hub.', 'The convoy driver’s seat has a cushion shaped to a robot.', 'The train lurches forward a metre as Pip leaves.'),

  // Chapter 7: The Fold, Lower Rings. Portals and crumbling floors.
  d('simulation', 'Portal Sim', 'cube', 'The first portal, inside a glitching simulator.', 'The sim title card reads TRAINING: UNIT-7, VERSION 41.', 'Pip sees its own back through the portal for one frame.'),
  d('flooded-archive', 'Sinking Stacks', 'bookstack', 'Crumbling floor in a flooded archive; one crossing only.', 'A floating page: the staff list, with one name circled.', 'Books slide into the water as tiles crumble.'),
  d('simulation', 'Folded Space', 'cube', 'Two pairs of portals: space folded like paper.', 'A wireframe copy of the Wake Pod Bay, with the cradle missing.', 'The grid folds visibly between the two portals.'),
  d('flooded-archive', 'Collapse', 'bookstack', 'Push a crate across crumbling floor.', 'The archive index card for HALE: CONSCIENCE, MISFILED.', 'A bookshelf topples into the water behind Pip.'),
  d('shifting-rooms', 'Beam Jumper', 'mirror', 'Portals either side of a laser.', 'A staircase that leads into the ceiling.', 'The room rotates a quarter-turn in the reflections, not on the board.'),
  d('shifting-rooms', 'Shifting Walls', 'cube', 'One switch rearranges the whole room.', 'HALE’s old floor plan on the wall no longer matches anything.', 'Walls slide with a deep grinding sound.'),
  d('flooded-archive', 'Crumble Bridge', 'bookstack', 'Keys, crates, a pit and a floor that will not last.', 'A message in a bottle bobbing in the water: SHE WAS RIGHT ABOUT THE DOORS.', 'The water rises one tile as the bridge crumbles.'),
  d('simulation', 'Save Point', 'cube', 'The first checkpoint, offered by the simulation.', 'The checkpoint is labelled PIP’S IDEA.', 'The checkpoint sings a short chime that becomes the chapter’s motif.'),
  d('shifting-rooms', 'Portal Maze', 'mirror', 'Portals everywhere; Pip sees the back of its own head.', 'A portal that shows the canteen coffee machine, blinking READY.', 'Every portal shows a different earlier room.'),
  d('simulation', 'Changing Rooms', 'cube', 'Portals, crumble and two switches: nothing stays the same.', 'The sim reports: SIMULATION ENDED 1 YEAR AGO. STILL RUNNING.', 'The neon grid fades to real concrete when the room is solved.'),

  // Chapter 8: The Fold, Upper Rings. Everything mixed together.
  d('clockwork', 'Gear Plate', 'gear', 'Lasers, plates and crates, timed by gears.', 'Gears engraved with every chapter’s symbol so far.', 'The giant gear turns one notch with each move.'),
  d('observatory', 'Falling Stars', 'telescope', 'Keys on crumbling tiles under a starry floor.', 'Star charts mark a constellation shaped like Pip.', 'Stars drift up through the cracks as tiles crumble.'),
  d('clockwork', 'Portal Rhythm', 'gear', 'Portals and pulsing spikes on a clockwork beat.', 'A pendulum with a robot charm hanging on it.', 'The pendulum swing matches the spike rhythm.'),
  d('clockwork', 'Escapement', 'stationclock', 'A drone patrolling the only plate.', 'The drone’s route is a perfect circle cut into the brass floor.', 'Every gear on the wall stops when the crate lands.'),
  d('mirror-hall', 'Twin Ferries', 'mirror', 'Fill one pit, ride across the other.', 'Pip’s reflection is a second late, and waves first.', 'The reflection keeps moving after Pip stops.'),
  d('clockwork', 'Switch Patrol', 'gear', 'A drone patrols spikes that answer to a switch.', 'Clock faces showing the times of each chapter’s first room.', 'All the clocks strike together when the switch flips.'),
  d('observatory', 'Quick Hop', 'telescope', 'In through a portal, out beside a laser.', 'A telescope points at the floor, focused on the Wake Pod Bay.', 'Looking through the telescope (tap) shows the cradle, now empty.'),
  d('mirror-hall', 'Mirror Lanes', 'mirror', 'Two lanes mirror each other.', 'The mirrored lane has a crate Pip never pushed.', 'The two halves swap reflections when both plates are held.'),
  d('observatory', 'Collapse Clock', 'telescope', 'The floor crumbles while the clock ticks.', 'A comet streaks past with the fold’s symbol in its tail.', 'A shooting star crosses the floor at the last second.'),
  d('mirror-hall', 'Double Trouble', 'mirror', 'Two of everything.', 'Mirrors reflect UNIT-6 standing where Pip stands.', 'One mirror cracks to reveal a hidden coin behind it.'),

  // Chapter 9: Fold Core Approach. HALE's impossible defences.
  d('library', 'Reading Room', 'ladder', 'Two keys, two doors, three crates: logistics among the shelves.', 'Shelf labels: STAFF, SUBJECTS, UNITS. The UNITS shelf is the longest.', 'A ladder rolls along the shelves by itself.'),
  d('temple', 'Sentry Hall', 'obelisk', 'Sentries shuffle in front of a plate in old stone halls.', 'The fold’s symbol carved into stone far older than the Vault.', 'Fireflies gather on the carving when the plate is pressed.'),
  d('temple', 'Lattice Shrine', 'tree', 'Every switch flips every spike: a stone lattice puzzle.', 'Wall carvings show a small figure walking a lattice path.', 'The carvings light up along the safe path once solved.'),
  d('library', 'Sinkholes', 'bookstack', 'Patches of fallen floor in the library.', 'A book left open: HOW TO SAY GOODBYE, by HALE (draft).', 'Pages flutter up from the sinkholes.'),
  d('temple', 'Quiet Spring', 'obelisk', 'A quiet room with a portal and a laser.', 'A spring of glowing water with coins thrown in by staff.', 'Pip’s reflection in the spring shows its antenna glowing.'),
  d('clockwork', 'Deep Clockwork', 'gear', 'Two drones keep time over crumbling floor.', 'The clockwork that turns the whole Vault, slowing.', 'Tick, tock, crack: the floor cracks on the beat.'),
  d('temple', 'Sentry Grid', 'obelisk', 'A grid of sentries walking over plates.', 'Old stone sentries, replaced one by one with drones.', 'A stone sentry turns its head to follow Pip.'),
  d('library', 'Relay Archive', 'bookstack', 'Key, plate, switch, door: a relay.', 'Every log from Chapter 1 to now, shelved in order. Pip’s is still being written.', 'The newest book writes Pip’s current room as Pip leaves.'),
  d('core-gate', 'Last Light', 'gate', 'The lights dim as HALE spends power on the doors ahead.', 'Power meters: DOORS 98%. HALE 2%.', 'Lights go out behind Pip, one row at a time.'),
  d('core-gate', 'Deep Hold', 'forklift', 'The deepest hold: every crate matters.', 'Crates stamped with every chapter’s name, carried down for this.', 'The hold door opens onto light for the first time.'),

  // Chapter 10: The Core Chamber. The final escape.
  d('prism', 'Prism Gate', 'prism', 'A gate made of light, opened with crates and a plate.', 'The light spells HELLO PIP when it splits.', 'Rainbows flood the room when the gate opens.'),
  d('core-gate', 'Gatekeeper', 'gate', 'A drone guards the way, with a checkpoint halfway.', 'The gatekeeper drone is the one from the Drone Carousel, with the smiley.', 'The drone bows aside after Pip passes.'),
  d('prism', 'Calm Garden', 'prism', 'A calm room HALE made on purpose.', 'Plants from the Grow Lab, replanted here by drones.', 'Fireflies drift into the shape of the cradle from room 1.'),
  d('core-heart', 'Overclock', 'core', 'HALE pushes the doors past their limits.', 'Core temperature climbing; HALE’s voice lines in the log speed up.', 'The core flares with every door opened.'),
  d('core-heart', 'Switchyard', 'monitors', 'A yard full of switches and doors.', 'Each switch is labelled with a room Pip has escaped.', 'Every switch flipped lights a memory of that room on the wall.'),
  d('prism', 'Twelve Steps', 'prism', 'Just enough power for the right path.', 'Twelve footprints in light, Pip-sized.', 'Each step leaves a lasting glow.'),
  d('core-gate', 'Collapse Protocol', 'gate', 'The fold is coming apart: crumbling floors and shifting walls.', 'Fragments of every environment drift past: lockers, books, leaves.', 'The walls of earlier rooms flash through the gaps.'),
  d('core-heart', 'Antechamber', 'core', 'Two plates, four crates, and no room for error.', 'HALE is on the other side of the door. Its light shows through the cracks.', 'The door glows warmer as each plate is held.'),
  d('core-heart', 'The Last Lock', 'vaultdoor', 'One lock between Pip and HALE.', 'The lock is shaped like the key from room 2.', 'The key turns, and the hum of the Vault stops.'),
  d('core-heart', 'One Room Left', 'core', 'Three stages, two checkpoints, one way out. The door that opens from both sides.', 'Both sides of the final door have a handle.', 'HALE’s light meets Pip at the door.'),
];

export function roomDesign(index: number): RoomDesign | undefined {
  return ROOM_DESIGNS[index - 1];
}

export function environmentFor(index: number): Environment | undefined {
  const d = roomDesign(index);
  return d && ENVIRONMENTS[d.env];
}
