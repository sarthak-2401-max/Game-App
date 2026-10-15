// Echo rooms: the previous attempt's actions become a replay that walks beside the player.
// The recording lives only in the session (never in the save) and is capped by the room.
import { decodeSolution } from './solver/solver';
import type { Action, Room } from './types';

/** The room as played with `track` as its echo. Rooms without echo support are returned as-is. */
export function withEcho(room: Room, track: readonly Action[] | undefined): Room {
  if (!room.echo) return room;
  const t = (track ?? []).slice(0, room.echo.maxRecord);
  if (!t.length) {
    if (!room.echoTrack) return room;
    const { echoTrack: _drop, ...rest } = room;
    return rest;
  }
  return { ...room, echoTrack: t };
}

/** The room with its reference first attempt, used by the solver, the level report and tests. */
export const withReferenceEcho = (room: Room): Room => (room.echo ? withEcho(room, decodeSolution(room.echo.reference)) : room);

/** Key used to store the solver's solution for this exact room (variants get their own). */
export const solutionKey = (room: Room) => (room.variant ? `${room.id}~${room.variant}` : room.id);
