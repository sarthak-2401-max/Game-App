// Home-screen attract loop: replays a verified solution of an early room on a small board.
import React, { useEffect, useState } from 'react';
import { initialState, step } from '../game/engine';
import { getRoom } from '../game/levels';
import SOLUTIONS from '../game/levels/solutions.generated.json';
import { decodeSolution } from '../game/solver/solver';
import type { GameState, StepEvent } from '../game/types';
import type { BoardLook } from './board/Board';
import { Board } from './board/Board';

const ROOM = getRoom(4)!;
const MOVES = decodeSolution((SOLUTIONS as Record<string, string>)[ROOM.id] ?? '');

export function RoomPreview({ width, look, reducedMotion }: { width: number; look: BoardLook; reducedMotion: boolean }) {
  const [frame, setFrame] = useState<{ state: GameState; events: StepEvent[]; seq: number; i: number }>(() => ({
    state: initialState(ROOM),
    events: [],
    seq: 0,
    i: 0,
  }));

  useEffect(() => {
    if (reducedMotion || !MOVES.length) return;
    const t = setInterval(() => {
      setFrame((f) => {
        if (f.i >= MOVES.length) return { state: initialState(ROOM), events: [], seq: f.seq + 1, i: 0 };
        const r = step(ROOM, f.state, MOVES[f.i]);
        return { state: r.state, events: r.events, seq: f.seq + 1, i: f.i + 1 };
      });
    }, 420);
    return () => clearInterval(t);
  }, [reducedMotion]);

  const cell = Math.floor(width / ROOM.width);
  return (
    <Board
      room={ROOM}
      state={frame.state}
      events={frame.events}
      seq={frame.seq}
      cell={cell}
      look={look}
      reducedMotion={reducedMotion}
      inputEnabled={false}
    />
  );
}
