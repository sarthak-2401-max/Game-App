// Every line the game speaks, with who voices it. scripts/make-voices.py records these into
// assets/voice (one MP3 per line) and the game looks a recording up by the line's key.
import { TRANSMISSIONS } from './observer/script';
import { CHAPTER_STORY, EPILOGUE, ROOM_ARRIVAL, ROOM_STORY, type StoryBeat } from './story';
import { hashString } from '../utils/dates';

export type VoiceSpeaker = StoryBeat['speaker'] | 'WITNESS';

/** Identifies a recording: the speaker and the line as written (templates unfilled). */
export const voiceKey = (who: VoiceSpeaker, text: string) => `${who.toLowerCase()}-${hashString(`${who}|${text}`).toString(36)}`;

/** A voice from the Kokoro model, plus how the recording is treated. */
export interface Cast {
  voice: string;
  speed: number;
  /** monitor: a faint room echo for WITNESS. log: a recovered recording's narrower band. */
  fx: 'none' | 'monitor' | 'log';
}

export const CAST = {
  HALE: { voice: 'bm_george', speed: 0.95, fx: 'none' },
  PIP: { voice: 'af_heart', speed: 1.0, fx: 'none' },
  WITNESS: { voice: 'am_fenrir', speed: 0.86, fx: 'monitor' },
  TOMAS: { voice: 'am_puck', speed: 1.0, fx: 'log' },
  INES: { voice: 'af_bella', speed: 0.97, fx: 'log' },
  PRIYA: { voice: 'bf_emma', speed: 0.97, fx: 'log' },
  NOTICE: { voice: 'am_michael', speed: 0.95, fx: 'log' },
  HALE_LOG: { voice: 'bm_george', speed: 0.95, fx: 'log' },
} as const satisfies Record<string, Cast>;

/** Staff logs are read by whoever wrote them. */
export function castFor(who: VoiceSpeaker, source?: string): Cast {
  if (who !== 'LOG') return CAST[who];
  const s = source ?? '';
  if (s.startsWith('Tomas') || s.startsWith('Topside')) return CAST.TOMAS;
  if (s.startsWith('Dr. Ines')) return CAST.INES;
  if (s.startsWith('Priya')) return CAST.PRIYA;
  if (s.startsWith('HALE')) return CAST.HALE_LOG;
  return CAST.NOTICE;
}

/**
 * Lines with numbers filled in at play time ("Exit reached in {moves} moves") are recorded
 * without the number. The subtitle still shows it.
 */
export const SPOKEN_TEMPLATES: Record<string, string> = {
  'Exit reached in {moves} moves. Logged.': 'Exit reached. Every move logged.',
  'Attempt {deaths}. The spikes do not move, Subject 7. You do.': 'Again. The spikes do not move, Subject 7. You do.',
  'Security Ring complete. Failed attempts so far: {totalDeaths}. I have all of them.': 'Security Ring complete. Every failed attempt so far. I have all of them.',
  'You have failed {totalDeaths} times. I kept every one.': 'You have failed so many times. I kept every one.',
  '{totalHints} hints. {totalDeaths} falls. {cleanRooms} rooms without undo. That is the shape of you. I like the shape.':
    'Every hint. Every fall. Every room without undo. That is the shape of you. I like the shape.',
};

export interface VoiceLine {
  key: string;
  who: VoiceSpeaker;
  cast: Cast;
  /** What the recording says. */
  spoken: string;
}

function line(who: VoiceSpeaker, text: string, source?: string): VoiceLine {
  return { key: voiceKey(who, text), who, cast: castFor(who, source), spoken: SPOKEN_TEMPLATES[text] ?? text };
}

const beat = (b: StoryBeat) => line(b.speaker, b.text, b.source);

export function allVoiceLines(): VoiceLine[] {
  const all = [
    ...ROOM_ARRIVAL.map(beat),
    ...ROOM_STORY.map(beat),
    ...CHAPTER_STORY.flatMap((c) => c.opening.map(beat)),
    ...EPILOGUE.map(beat),
    ...TRANSMISSIONS.map((t) => line(t.speaker, t.text)),
  ];
  // The same line said twice is recorded once.
  return [...new Map(all.map((l) => [l.key, l])).values()];
}
