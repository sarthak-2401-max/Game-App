// Core game types. The engine is pure TypeScript and has no React Native imports,
// so it can be executed by tests, the solver and the level tools in Node.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Action = Dir | 'wait';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
export const ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'wait'];

export type KeyColor = 'gold' | 'blue';
export const KEY_COLORS: readonly KeyColor[] = ['gold', 'blue'];

/** A repeating on/off cycle measured in turns: active when (tick + offset) % period < on. */
export interface Timing {
  period: number;
  on: number;
  offset: number;
}

/**
 * How a spike trap decides whether it is raised.
 * - static: always raised.
 * - timed: raised on a repeating cycle.
 * - channel: controlled by a switch/plate channel (retracted while the channel is active,
 *   unless `raisedWhenActive`).
 */
export type SpikeMode =
  | { kind: 'static' }
  | { kind: 'timed'; timing: Timing }
  | { kind: 'channel'; ch: number; raisedWhenActive?: boolean };

export type Tile =
  | { k: 'floor' }
  | { k: 'wall' }
  | { k: 'exit' }
  | { k: 'pit' }
  | { k: 'crumble' }
  | { k: 'checkpoint' }
  | { k: 'spikes'; mode: SpikeMode }
  | { k: 'plate'; ch: number }
  | { k: 'switch'; ch: number }
  /** `look: 'wall'` draws the door as a wall section that slides into the floor when it opens. */
  | { k: 'door'; ch: number; invert?: boolean; look?: 'wall' }
  | { k: 'lock'; color: KeyColor }
  | { k: 'tele'; pair: number }
  /** With a channel, an emitter is off while it is active (or only fires while active if `invert`). */
  | { k: 'emitter'; dir: Dir; ch?: number; invert?: boolean; timing?: Timing };

export type TileKind = Tile['k'];

export type ItemKind = 'key' | 'core' | 'coin';
export interface Item {
  kind: ItemKind;
  cell: number;
  color?: KeyColor;
  /** Coins marked hidden count toward the "hidden collectible" achievement. */
  hidden?: boolean;
}

export type PathMode = 'loop' | 'pingpong';
/** A deterministic route through cells. Position is a pure function of the tick. */
export interface Route {
  cells: number[];
  mode: PathMode;
  offset: number;
}

/**
 * Echo rooms replay the player's previous attempt as a translucent echo. The echo re-walks the
 * recorded actions one per turn, with collision (walls, closed doors, locks, crates and pits
 * stop it for that turn), is intangible to hazards and to the player, and holds pressure
 * plates down only when `presses` is set. It lingers `linger` turns after its track ends.
 */
export interface EchoConfig {
  linger: number;
  /** Longest recording kept, in actions. */
  maxRecord: number;
  presses: boolean;
  /** A reference first attempt (encoded actions) used to prove the room solvable. */
  reference: string;
}

export interface Room {
  id: string;
  chapter: number; // 1-based; 0 for daily/bonus content
  index: number; // 1-based room number within the campaign (or catalog)
  name: string;
  width: number;
  height: number;
  tiles: Tile[];
  start: number;
  blocks: number[];
  items: Item[];
  drones: Route[];
  platforms: Route[];
  moveLimit?: number;
  timeLimit?: number; // seconds of real time
  intro?: string; // short contextual instruction shown when the room opens
  hint?: string; // free textual hint
  tags: string[]; // mechanics used, for teaching order checks and analytics
  echo?: EchoConfig;
  /** The recorded attempt the echo replays (set per session; absent on the first attempt). */
  echoTrack?: Action[];
  /** Id of the room-memory variant this room was built from, if any. */
  variant?: string;
}

export type DeathCause = 'spikes' | 'laser' | 'drone' | 'fall' | 'moves' | 'timeout';
export type Status = 'playing' | 'won' | 'dead';

export interface GameState {
  tick: number;
  moves: number;
  player: number;
  blocks: number[]; // sorted cell indices
  itemsTaken: number; // bitmask over room.items
  keys: Record<KeyColor, number>;
  switches: number; // bitmask of switch-channel toggles
  mods: Record<number, 'pit' | 'floor'>; // terrain changed during play
  status: Status;
  death?: DeathCause;
  /** Extra moves granted by a revive. Part of state so undo stays consistent. */
  bonusMoves: number;
  /** Freeze power-up: actions left during which the clock (drones, platforms, timed traps) stands still. */
  frozen?: number;
  /** Echo position (-1 once it has faded). Only present in echo rooms with a recording. */
  echo?: number;
}

export type StepEvent =
  | { type: 'move'; from: number; to: number }
  | { type: 'bump'; at: number }
  | { type: 'push'; from: number; to: number }
  | { type: 'fill'; at: number }
  | { type: 'unlock'; at: number }
  | { type: 'crumble'; at: number }
  | { type: 'teleport'; from: number; to: number }
  | { type: 'pickup'; item: number; kind: ItemKind }
  | { type: 'switch'; at: number; ch: number; on: boolean }
  | { type: 'carried'; from: number; to: number }
  | { type: 'death'; cause: DeathCause }
  | { type: 'win' }
  | { type: 'checkpoint'; at: number }
  | { type: 'exitSealed'; at: number }
  | { type: 'echo'; from: number; to: number }
  | { type: 'echoFaded'; at: number }
  /** A door changed state this turn (opened or closed by a switch, plate or echo). */
  | { type: 'doors'; opened: number[]; closed: number[] }
  /** Session-level: the Shield power-up absorbed a fatal action. */
  | { type: 'shielded'; at: number; cause: DeathCause };

export interface StepResult {
  state: GameState;
  /** False when the action was rejected (e.g. walking into a wall). No turn passes. */
  valid: boolean;
  events: StepEvent[];
}
