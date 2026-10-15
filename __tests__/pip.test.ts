// Pip looks alarmed only when something that can hurt it is one step away.
import { deriveModel } from '../src/components/board/derive';
import { pipInDanger } from '../src/components/board/pip';
import { initialState } from '../src/game/engine';
import { CAMPAIGN } from '../src/game/levels';

describe('pip danger', () => {
  test('room 1 has nothing dangerous anywhere', () => {
    const room = CAMPAIGN[0];
    const s = initialState(room);
    expect(pipInDanger(deriveModel(room, s), s.player, room.width, room.height)).toBe(false);
  });

  test('standing next to raised spikes is dangerous, far away is not', () => {
    const room = CAMPAIGN.find((r) => r.tiles.some((t) => t.k === 'spikes'))!;
    const s = initialState(room);
    const model = deriveModel(room, s);
    const spike = model.tiles.find((v) => v.tile.k === 'spikes' && v.raised)!;
    const w = room.width;
    const beside = [spike.cell - 1, spike.cell + 1, spike.cell - w, spike.cell + w].find((c) => room.tiles[c]?.k === 'floor')!;
    expect(pipInDanger(model, beside, w, room.height)).toBe(true);
    const far = room.tiles.findIndex((t, c) => t.k === 'floor' && model.tiles.every((v) => v.tile.k !== 'spikes' || Math.abs((v.cell % w) - (c % w)) + Math.abs(Math.floor(v.cell / w) - Math.floor(c / w)) > 1));
    if (far >= 0) expect(pipInDanger(model, far, w, room.height)).toBe(false);
  });
});
