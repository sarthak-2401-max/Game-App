// Pure render model for a board frame: what each layer should draw for the current state,
// including one-turn-ahead warnings (spikes about to rise, lasers about to fire, drone steps).
import { activeChannels, isChannelOn } from '../../game/entities/channels';
import { emitterActive, spikesRaised } from '../../game/entities/hazards';
import { isDoorClosed, laserBeams, type BeamSegment } from '../../game/entities/lasers';
import { routeCellAt } from '../../game/entities/routes';
import { effectiveTile } from '../../game/entities/terrain';
import { exitOpen, itemTaken, remainingCores } from '../../game/engine';
import type { GameState, Item, Room, Tile } from '../../game/types';

export interface TileView {
  cell: number;
  tile: Tile;
  /** For spikes: raised now. */
  raised?: boolean;
  /** Spikes rising / laser firing on the next turn. */
  warning?: boolean;
  /** Doors: closed now. Switches: on. Plates: pressed. Emitters: firing. */
  active?: boolean;
}

export interface RenderModel {
  tiles: TileView[];
  beams: BeamSegment[];
  items: { index: number; item: Item }[];
  drones: { index: number; cell: number; next: number }[];
  platforms: { index: number; cell: number }[];
  exitOpen: boolean;
  coresLeft: number;
  channels: number;
}

export function deriveModel(room: Room, s: GameState): RenderModel {
  const channels = activeChannels(room, s);
  const tiles: TileView[] = [];
  for (let i = 0; i < room.tiles.length; i++) {
    const tile = effectiveTile(room, s, i);
    const v: TileView = { cell: i, tile };
    if (tile.k === 'spikes') {
      v.raised = spikesRaised(tile, s.tick, channels);
      // Timed spikes are predictable: warn when they will be up next turn.
      v.warning = !v.raised && tile.mode.kind === 'timed' && spikesRaised(tile, s.tick + 1, channels);
    } else if (tile.k === 'door') v.active = isDoorClosed(room, s, i, channels);
    else if (tile.k === 'switch') v.active = isChannelOn(s.switches, tile.ch);
    else if (tile.k === 'plate') v.active = s.player === i || s.blocks.includes(i);
    else if (tile.k === 'emitter') {
      v.active = emitterActive(tile, s.tick, channels);
      v.warning = !v.active && !!tile.timing && emitterActive(tile, s.tick + 1, channels);
    }
    tiles.push(v);
  }
  return {
    tiles,
    beams: laserBeams(room, s, channels),
    items: room.items.map((item, index) => ({ index, item })).filter((x) => !itemTaken(s, x.index)),
    drones: room.drones.map((d, index) => ({ index, cell: routeCellAt(d, s.tick), next: routeCellAt(d, s.tick + 1) })),
    platforms: room.platforms.map((p, index) => ({ index, cell: routeCellAt(p, s.tick) })),
    exitOpen: exitOpen(room, s),
    coresLeft: remainingCores(room, s),
    channels,
  };
}
