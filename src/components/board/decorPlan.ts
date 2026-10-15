// Where a room's set dressing goes: its landmark and props on the back walls, decals on the floor.
// Pure and deterministic (seeded by the room), so every room keeps the same layout and tests can
// check that nothing ever sits on a gameplay tile.
import type { Decal, Environment, Prop } from '../../game/environments';
import type { Room } from '../../game/types';
import { noise } from './materials';

export interface DecorPlan {
  /** The landmark's wall cell (it stands against the wall face, above the floor in front). */
  landmark?: number;
  props: { cell: number; kind: Prop }[];
  decals: { cell: number; kind: Decal; x: number; y: number; rot: number }[];
}

const isWall = (room: Room, c: number) => room.tiles[c]?.k === 'wall';

/** Wall cells with walkable space in front: the faces a player sees. */
export function wallFaces(room: Room): number[] {
  const out: number[] = [];
  const w = room.width;
  for (let c = 0; c < room.tiles.length - w; c++) if (isWall(room, c) && !isWall(room, c + w) && room.tiles[c + w].k !== 'pit') out.push(c);
  return out;
}

export function planDecor(room: Room, env: Environment, seed: number): DecorPlan {
  const w = room.width;
  const faces = wallFaces(room);
  // The landmark goes on the back-most wall, as near the middle as possible.
  const topRow = faces.length ? Math.min(...faces.map((c) => Math.floor(c / w))) : -1;
  const back = faces.filter((c) => Math.floor(c / w) === topRow && c % w > 0 && c % w < w - 1);
  const mid = (w - 1) / 2;
  const ranked = [...back].sort((a, b) => Math.abs((a % w) - mid) - Math.abs((b % w) - mid) || noise(seed, a) - noise(seed, b));
  // Off-centre by the seed so rooms in one environment don't all line up the same way.
  const landmark = ranked[Math.floor(noise(seed, 1) * Math.min(3, ranked.length))];

  const props: DecorPlan['props'] = [];
  const taken = new Set<number>(landmark === undefined ? [] : [landmark - 1, landmark, landmark + 1]);
  for (const c of faces) {
    if (taken.has(c) || noise(seed, c + 100) < 0.5) continue;
    props.push({ cell: c, kind: env.props[Math.floor(noise(seed, c + 200) * env.props.length)] });
    taken.add(c - 1).add(c).add(c + 1);
  }

  // Decals only on bare floor: never under anything the player has to read.
  const busy = new Set<number>([room.start, ...room.items.map((i) => i.cell)]);
  room.drones.forEach((d) => d.cells.forEach((c) => busy.add(c)));
  room.platforms.forEach((p) => p.cells.forEach((c) => busy.add(c)));
  const decals: DecorPlan['decals'] = [];
  room.tiles.forEach((t, c) => {
    if (t.k !== 'floor' || busy.has(c) || noise(seed, c + 300) < 0.84) return;
    decals.push({ cell: c, kind: env.decals[Math.floor(noise(seed, c + 400) * env.decals.length)], x: noise(seed, c + 500), y: noise(seed, c + 600), rot: noise(seed, c + 700) * 180 });
  });
  return { landmark, props, decals };
}
