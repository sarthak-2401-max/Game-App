// Every campaign room stands somewhere in the Vault, and its set dressing never hides gameplay.
import { planDecor, wallFaces } from '../src/components/board/decorPlan';
import { ENVIRONMENTS, ROOM_DESIGNS, environmentFor, roomDesign } from '../src/game/environments';
import { CAMPAIGN, CAMPAIGN_SIZE, getRoom } from '../src/game/levels';

describe('room environments', () => {
  test('every campaign room has a design in a known environment', () => {
    expect(ROOM_DESIGNS).toHaveLength(CAMPAIGN_SIZE);
    for (let n = 1; n <= CAMPAIGN_SIZE; n++) {
      const d = roomDesign(n)!;
      expect(ENVIRONMENTS[d.env]).toBeDefined();
      expect(d.place.length).toBeGreaterThan(2);
      expect(d.purpose && d.clue && d.moment).toBeTruthy();
    }
  });

  test('neighbouring rooms never look the same', () => {
    for (let n = 2; n <= CAMPAIGN_SIZE; n++) {
      const a = roomDesign(n - 1)!;
      const b = roomDesign(n)!;
      expect(a.env === b.env && a.landmark === b.landmark).toBe(false);
    }
  });

  test('every environment is used and fully specified', () => {
    const used = new Set(ROOM_DESIGNS.map((d) => d.env));
    for (const e of Object.values(ENVIRONMENTS)) {
      expect(used.has(e.id)).toBe(true);
      expect(e.props.length).toBeGreaterThan(0);
      expect(e.decals.length).toBeGreaterThan(0);
      expect(e.palette.accent).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  test('set dressing stays off gameplay tiles and is stable', () => {
    for (const room of CAMPAIGN) {
      const env = environmentFor(room.index)!;
      const plan = planDecor(room, env, room.index);
      expect(planDecor(room, env, room.index)).toEqual(plan);
      const faces = new Set(wallFaces(room));
      if (plan.landmark !== undefined) expect(faces.has(plan.landmark)).toBe(true);
      for (const p of plan.props) expect(room.tiles[p.cell].k).toBe('wall');
      const busy = new Set([room.start, ...room.items.map((i) => i.cell), ...room.drones.flatMap((d) => d.cells), ...room.platforms.flatMap((p) => p.cells)]);
      for (const d of plan.decals) {
        expect(room.tiles[d.cell].k).toBe('floor');
        expect(busy.has(d.cell)).toBe(false);
      }
    }
  });

  test('a room with a back wall gets its landmark', () => {
    const room = getRoom(1)!;
    expect(planDecor(room, environmentFor(1)!, 1).landmark).toBeDefined();
  });
});
