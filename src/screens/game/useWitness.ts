// Runs WITNESS inside a room: plays scripted lines on triggers, handles lights going out,
// detects clues the player reaches, and records all of it in room memory. Presentation only:
// nothing here can change the rules of the room.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeedItem } from '../../components/game/MonitorBar';
import type { BoardClue } from '../../components/board/Board';
import { getClue, type Clue } from '../../game/observer/clues';
import { ROOM_ARRIVAL } from '../../game/story';
import { clueCell, cluesFound, fillTemplate, roomClues, transmissionsFor } from '../../game/observer/observer';
import type { Transmission, Trigger } from '../../game/observer/script';
import { analytics } from '../../services/analytics/analytics';
import { markHeard, memoryView } from '../../state/memory';
import { discoverClue } from '../../state/progression';
import type { Session } from '../../state/session';
import { useApp } from '../../state/useApp';
import { colOf, rowOf } from '../../game/grid';

const KIND_LABEL: Record<Clue['kind'], string> = { wall: 'Writing', recording: 'Recording', object: 'Object', sigil: 'Mark' };

/** Rooms whose arrival line has played since the app started: replays stay quiet. */
const arrivalPlayed = new Set<string>();

export function clueLabel(c: Clue) {
  return c.source ? `${KIND_LABEL[c.kind]} · ${c.source}` : KIND_LABEL[c.kind];
}

/** A WITNESS line as shown (numbers filled in) and as written (to find its recording). */
export interface SpokenLine {
  text: string;
  voiceKey: string;
}

export interface Witness {
  feed: FeedItem[];
  consume: (key: string) => void;
  dark: boolean;
  watched: boolean;
  clues: BoardClue[];
  /** Clue ids found during this visit. */
  foundThisVisit: string[];
  /** Line for the failure sheet, if WITNESS has one. */
  failLine?: SpokenLine;
  /** Computes (and records as heard) the lines for the win screen. */
  winLines: (run: { moves: number; deaths: number }) => SpokenLine[];
  /** Achievements unlocked by clues during this visit (to show on the result screen). */
  achievements: string[];
}

let keySeq = 0;

export function useWitness(session: Session | null, storyOpen: boolean): Witness {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [darkTurns, setDarkTurns] = useState(0);
  const [watched, setWatched] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [failLine, setFailLine] = useState<SpokenLine | undefined>();
  const [achievements, setAchievements] = useState<string[]>([]);
  const started = useRef<number>(-1);
  const echoAnnounced = useRef<string>('');
  const lastSeq = useRef<number>(-1);
  const lastMoves = useRef<number>(0);
  const failedFor = useRef<string>('');

  const save = useApp((s) => s.save);
  const room = session?.room;

  const play = useCallback(
    (lines: Transmission[], run: { moves?: number; deaths?: number } = {}) => {
      if (!lines.length) return;
      const app = useApp.getState();
      const mem = memoryView(app.save);
      const items: FeedItem[] = lines.map((t) => ({ key: `t${++keySeq}`, speaker: t.speaker, text: fillTemplate(t.text, mem, run), voiceKey: t.text }));
      app.update((sv) => lines.reduce((acc, t) => markHeard(acc, t.id), sv));
      lines.forEach((t) => analytics.track('witness_heard', { id: t.id, room_id: t.room }));
      const lights = lines.find((t) => t.lights)?.lights;
      if (lights) setDarkTurns(lights.turns);
      if (lines.some((t) => t.speaker === 'WITNESS')) setWatched(true);
      setFeed((f) => [...f, ...items]);
    },
    [],
  );

  const fire = useCallback(
    (roomId: string, trigger: Trigger, run: { moves?: number; deaths?: number } = {}) => {
      play(transmissionsFor(roomId, trigger, memoryView(useApp.getState().save)), run);
    },
    [play],
  );

  // A new visit: clear the room's presentation state.
  const visit = session?.visit ?? -1;
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset per room visit */
    setFeed([]);
    setDarkTurns(0);
    setWatched(false);
    setFound([]);
    setFailLine(undefined);
    setAchievements([]);
    /* eslint-enable react-hooks/set-state-in-effect */
    lastSeq.current = -1;
    lastMoves.current = 0;
  }, [visit]);

  // Start-of-visit lines wait until any story card is closed.
  useEffect(() => {
    if (!session || storyOpen || started.current === session.visit) return;
    started.current = session.visit;
    // The room's story line opens the visit, ahead of anything WITNESS says.
    const arrival = session.kind === 'campaign' ? ROOM_ARRIVAL[session.room.index - 1] : undefined;
    if (arrival && (arrival.speaker === 'HALE' || arrival.speaker === 'PIP') && !arrivalPlayed.has(session.room.id)) {
      arrivalPlayed.add(session.room.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- queued once per visit, like the WITNESS lines below
      setFeed((f) => [...f, { key: `a${++keySeq}`, speaker: arrival.speaker as 'HALE' | 'PIP', text: arrival.text }]);
      analytics.track('story_viewed', { kind: 'arrival', room_id: session.room.id });
    }
    fire(session.room.id, { on: 'start' });
  }, [session, storyOpen, fire]);

  // Each attempt with an echo (and the room going light again after a restart).
  const attempt = session?.attempt ?? 0;
  useEffect(() => {
    if (!session) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a restart turns the lights back on
    setDarkTurns(0);
    setFailLine(undefined);
    lastMoves.current = session.state.moves;
    const k = `${session.visit}:${session.attempt}`;
    if (session.room.echoTrack?.length && echoAnnounced.current !== k && !storyOpen) {
      echoAnnounced.current = k;
      fire(session.room.id, { on: 'echo' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, visit]);

  const clueList = useMemo(() => (room ? roomClues(room, memoryView(save)) : []), [room, save]);

  // React to each engine step.
  useEffect(() => {
    if (!session || session.seq === lastSeq.current) return;
    lastSeq.current = session.seq;
    const { state } = session;
    const id = session.room.id;

    const failed = state.status === 'dead' || session.timedOut;
    if (failed) {
      const fk = `${session.visit}:${session.attempt}:${session.failedAttempts}`;
      if (failedFor.current !== fk) {
        failedFor.current = fk;
        const lines = transmissionsFor(id, { on: 'fail', deaths: session.failedAttempts }, memoryView(useApp.getState().save)).slice(0, 1);
        if (lines.length) {
          const text = fillTemplate(lines[0].text, memoryView(useApp.getState().save), { deaths: session.failedAttempts });
          useApp.getState().update((sv) => markHeard(sv, lines[0].id));
          // eslint-disable-next-line react-hooks/set-state-in-effect -- shown on the failure sheet
          setFailLine({ text, voiceKey: lines[0].text });
        }
      }
      return;
    }

    const moved = state.moves > lastMoves.current;
    lastMoves.current = state.moves;
    if (moved) {
      fire(id, { on: 'move', n: state.moves });
      setDarkTurns((d) => Math.max(0, d - 1));
      const r = rowOf(session.room.width, state.player);
      const c = colOf(session.room.width, state.player);
      fire(id, { on: 'cell', at: [r, c] });
    }
    for (const e of session.events) {
      if (e.type === 'pickup') fire(id, { on: 'pickup', kind: e.kind });
      if (e.type === 'switch') fire(id, { on: 'switch' });
    }

    // Clues within reach. Dark clues can only be read while the lights are out.
    const newly = cluesFound(session.room, clueList, state, memoryView(useApp.getState().save), darkTurns > 0);
    for (const c of newly) {
      const res = discoverClue(useApp.getState().save, c.id);
      if (!res.isNew) continue;
      useApp.getState().update(() => res.save);
      analytics.track('clue_found', { id: c.id, room_id: id, kind: c.kind });
      setFound((f) => [...f, c.id]);
      if (res.achievements.length) setAchievements((a) => [...a, ...res.achievements]);
      setFeed((f) => [...f, { key: `c${++keySeq}`, speaker: 'CLUE', label: clueLabel(c), text: c.title, clueId: c.id }]);
      fire(id, { on: 'clue', id: c.id });
      if (c.kind === 'sigil') fire(id, { on: 'sigil', count: res.sigils });
      // Reading the writing in the dark brings the lights back.
      if (c.reveal === 'dark') setTimeout(() => setDarkTurns(0), 1500);
    }
  }, [session, clueList, darkTurns, fire]);

  const consume = useCallback((key: string) => setFeed((f) => f.filter((x) => x.key !== key)), []);

  const clues = useMemo<BoardClue[]>(
    () =>
      room
        ? clueList.map((c) => ({ id: c.id, cell: clueCell(room, c), kind: c.kind, found: (save.memory.flags[`clue.${c.id}`] ?? 0) > 0, uv: c.reveal === 'dark' }))
        : [],
    [room, clueList, save.memory.flags],
  );

  const winLines = useCallback(
    (run: { moves: number; deaths: number }) => {
      if (!session) return [];
      const lines = transmissionsFor(session.room.id, { on: 'win' }, memoryView(useApp.getState().save));
      if (!lines.length) return [];
      const mem = memoryView(useApp.getState().save);
      useApp.getState().update((sv) => lines.reduce((acc, t) => markHeard(acc, t.id), sv));
      return lines.map((t) => ({ text: fillTemplate(t.text, mem, run), voiceKey: t.text }));
    },
    [session],
  );

  return { feed, consume, dark: darkTurns > 0, watched, clues, foundThisVisit: found, failLine, winLines, achievements };
}

export const clueById = getClue;
