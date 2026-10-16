// Pip's face: where it looks, when it blinks, and how it feels about what is around it.
// Pure danger check plus a small hook; the face itself is drawn by PlayerGlyph.
import { useEffect, useState } from 'react';
import { DELTA, dirBetween, neighbor } from '../../game/grid';
import type { Dir, GameState, StepEvent } from '../../game/types';
import type { PipMood } from './glyphs';
import type { RenderModel } from './derive';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/** True when something that can hurt Pip is one step away (or about to be). */
export function pipInDanger(model: RenderModel, player: number, w: number, h: number): boolean {
  const near = new Set([player, ...DIRS.map((d) => neighbor(w, h, player, d)).filter((c) => c >= 0)]);
  if (model.beams.some((b) => b.cells.some((c) => near.has(c)))) return true;
  if (model.drones.some((d) => near.has(d.cell) || near.has(d.next))) return true;
  return model.tiles.some((v) => v.tile.k === 'spikes' && (v.raised || v.warning) && near.has(v.cell));
}

/** Pip's mood and gaze for this frame. Blinks and a short smile run on timers, off with Reduced motion. */
export function usePip(state: GameState, events: StepEvent[], seq: number, w: number, danger: boolean, reduced: boolean) {
  // Gaze follows the last step; derived when a new action arrives (React's previous-render pattern).
  const [gaze, setGaze] = useState({ seq, look: { x: 0, y: 0 } });
  let look = gaze.look;
  if (gaze.seq !== seq) {
    const mv = events.find((e): e is Extract<StepEvent, { type: 'move' }> => e.type === 'move');
    const bump = events.find((e): e is Extract<StepEvent, { type: 'bump' }> => e.type === 'bump');
    const dir = mv ? dirBetween(w, mv.from, mv.to) : bump ? dirBetween(w, state.player, bump.at) : null;
    if (dir) {
      const [dr, dc] = DELTA[dir];
      look = { x: dc, y: dr };
    }
    setGaze({ seq, look });
  }
  const [blink, setBlink] = useState(false);
  // A pickup earns a short smile: it lasts until the timer marks that action's smile as over.
  const cheered = !reduced && events.some((e) => e.type === 'pickup' || e.type === 'unlock' || e.type === 'checkpoint');
  const [smiled, setSmiled] = useState(-1);
  useEffect(() => {
    if (!cheered) return;
    const t = setTimeout(() => setSmiled(seq), 700);
    return () => clearTimeout(t);
  }, [cheered, seq]);
  const glad = cheered && smiled !== seq;

  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        t = setTimeout(() => {
          setBlink(false);
          loop();
        }, 130);
      }, 2400 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduced]);

  const mood: PipMood =
    state.status === 'dead' ? 'hurt' : state.status === 'won' || glad ? 'happy' : danger ? 'alert' : blink ? 'blink' : 'idle';
  return { mood, look };
}
