import { CAMPAIGN_SIZE } from '../src/game/levels';
import { CHAPTER_STORY, EPILOGUE, ROOM_ARRIVAL, ROOM_STORY } from '../src/game/story';

jest.mock('../src/services/audio/sound', () => ({ sound: { duck: jest.fn() } }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => []) }));
jest.mock('../src/services/audio/voiceClipPlayer', () => ({ expoClipPlayer: { play: jest.fn(() => () => undefined) } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PROFILES, VoiceOver, speakable } = require('../src/services/audio/voice') as typeof import('../src/services/audio/voice');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VOICE_CLIPS } = require('../src/services/audio/voiceClips.generated') as { VOICE_CLIPS: Record<string, number> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { allVoiceLines, castFor, SPOKEN_TEMPLATES, voiceKey } = require('../src/game/voiceLines') as typeof import('../src/game/voiceLines');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TRANSMISSIONS } = require('../src/game/observer/script') as typeof import('../src/game/observer/script');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sound } = require('../src/services/audio/sound') as { sound: { duck: jest.Mock } };

describe('story content', () => {
  test('every campaign room has an arrival line and an escape beat', () => {
    expect(ROOM_ARRIVAL).toHaveLength(CAMPAIGN_SIZE);
    expect(ROOM_STORY).toHaveLength(CAMPAIGN_SIZE);
  });

  test('arrival lines are spoken by HALE or Pip, short enough for the monitor, and never repeat an escape beat', () => {
    const escape = new Set(ROOM_STORY.map((b) => b.text));
    ROOM_ARRIVAL.forEach((b, i) => {
      expect(['HALE', 'PIP']).toContain(b.speaker);
      expect(b.text.length).toBeGreaterThan(20);
      // The monitor shows three lines of text.
      expect({ room: i + 1, len: b.text.length <= 130 }).toEqual({ room: i + 1, len: true });
      expect(escape.has(b.text)).toBe(false);
    });
    expect(new Set(ROOM_ARRIVAL.map((b) => b.text)).size).toBe(ROOM_ARRIVAL.length);
  });

  test('every speaker in the story has a voice', () => {
    const all = [...ROOM_ARRIVAL, ...ROOM_STORY, ...EPILOGUE, ...CHAPTER_STORY.flatMap((c) => c.opening)];
    for (const b of all) expect(PROFILES[b.speaker]).toBeDefined();
  });
});

function fakeEngine() {
  const calls: { text: string; opts: Record<string, unknown> & { onDone?: () => void; onStopped?: () => void } }[] = [];
  return {
    calls,
    speak: jest.fn((text: string, opts: Record<string, unknown>) => {
      calls.push({ text, opts });
    }),
    stop: jest.fn(async () => undefined),
    getAvailableVoicesAsync: jest.fn(async () => [
      { identifier: 'com.apple.daniel', name: 'Daniel', language: 'en-GB', quality: 'Default' },
      { identifier: 'com.apple.samantha.enh', name: 'Samantha (Enhanced)', language: 'en-US', quality: 'Enhanced' },
      { identifier: 'com.apple.samantha', name: 'Samantha', language: 'en-US', quality: 'Default' },
      { identifier: 'fr.thomas', name: 'Thomas', language: 'fr-FR', quality: 'Default' },
    ]),
  };
}

describe('recorded voices', () => {
  test('every spoken line has a recording', () => {
    const missing = allVoiceLines().filter((l) => !(l.key in VOICE_CLIPS));
    expect(missing.map((l) => l.spoken)).toEqual([]);
  });

  test('different lines never share a recording key', () => {
    const texts = [...ROOM_ARRIVAL, ...ROOM_STORY, ...EPILOGUE].map((b) => `${b.speaker}|${b.text}`);
    const keys = new Map<string, string>();
    for (const t of texts) {
      const [who, text] = t.split('|') as ['HALE', string];
      const k = voiceKey(who, text);
      if (keys.has(k)) expect(keys.get(k)).toBe(t);
      keys.set(k, t);
    }
  });

  test('lines with numbers filled in are recorded without them', () => {
    for (const t of TRANSMISSIONS.filter((x) => /\{\w+\}/.test(x.text))) expect(SPOKEN_TEMPLATES[t.text]).toBeDefined();
    expect(allVoiceLines().some((l) => /[{}]/.test(l.spoken))).toBe(false);
  });

  test('staff logs are read by the person who wrote them, WITNESS by its own voice', () => {
    expect(castFor('LOG', 'Tomas Reyes, day 1').voice).not.toBe(castFor('LOG', 'Dr. Ines Varga, day 3').voice);
    expect(castFor('LOG', 'Priya Shah, day 12').voice).not.toBe(castFor('HALE').voice);
    const witness = castFor('WITNESS');
    expect(['HALE', 'PIP'].map((w) => castFor(w as 'HALE').voice)).not.toContain(witness.voice);
  });

  test('a recorded line plays its recording instead of text-to-speech', () => {
    const e = fakeEngine();
    const ends: (() => void)[] = [];
    const player = { play: jest.fn((_src: number, onEnd: () => void) => (ends.push(onEnd), jest.fn())) };
    const v = new VoiceOver(e as never, { [voiceKey('HALE', 'Hello, Pip.')]: 42 }, player);
    const end = jest.fn();
    v.say('Hello, Pip.', 'HALE', end);
    expect(player.play).toHaveBeenCalledWith(42, expect.any(Function), expect.any(Function));
    expect(e.speak).not.toHaveBeenCalled();
    ends[0]();
    expect(end).toHaveBeenCalledWith(true);
  });

  test('a slow, acted take is not cut off before the recording ends', () => {
    jest.useFakeTimers();
    try {
      const e = fakeEngine();
      let reportLength: (s: number) => void = () => undefined;
      const stop = jest.fn();
      const player = {
        play: jest.fn((_src: number, _onEnd: () => void, onDuration?: (s: number) => void) => {
          reportLength = onDuration!;
          return stop;
        }),
      };
      const text = 'Signal. Subject 7 is awake. Begin.';
      const v = new VoiceOver(e as never, { [voiceKey('WITNESS', text)]: 1 }, player);
      const end = jest.fn();
      v.say(text, 'WITNESS', end);
      reportLength(9);
      jest.advanceTimersByTime(9000);
      expect(stop).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
      jest.advanceTimersByTime(2500); // the player never reported the end: move on
      expect(end).toHaveBeenCalledWith(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a filled-in line finds its recording by the line as written', () => {
    const e = fakeEngine();
    const player = { play: jest.fn(() => jest.fn()) };
    const v = new VoiceOver(e as never, { [voiceKey('WITNESS', 'Exit reached in {moves} moves. Logged.')]: 7 }, player);
    v.say('Exit reached in 12 moves. Logged.', 'WITNESS', undefined, 'Exit reached in {moves} moves. Logged.');
    expect(player.play).toHaveBeenCalledWith(7, expect.any(Function), expect.any(Function));
  });

  test('a sequence plays in order and stops when cut off', () => {
    const e = fakeEngine();
    const ends: (() => void)[] = [];
    const stops: jest.Mock[] = [];
    const player = {
      play: jest.fn((_src: number, onEnd: () => void) => {
        ends.push(onEnd);
        const s = jest.fn();
        stops.push(s);
        return s;
      }),
    };
    const clips = { [voiceKey('WITNESS', 'a')]: 1, [voiceKey('HALE', 'b')]: 2, [voiceKey('PIP', 'c')]: 3 };
    const v = new VoiceOver(e as never, clips, player);
    v.sayAll([
      { text: 'a', who: 'WITNESS' },
      { text: 'b', who: 'HALE' },
      { text: 'c', who: 'PIP' },
    ]);
    ends[0]();
    expect(player.play.mock.calls.map((c) => c[0])).toEqual([1, 2]);
    expect(stops[0]).toHaveBeenCalled(); // the finished clip is freed
    v.stop();
    expect(stops[1]).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalledTimes(2); // 'c' never starts
  });
});

describe('voiceover', () => {
  beforeEach(() => sound.duck.mockClear());

  test('each character speaks with its own pitch and rate', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    v.say('Hello, Pip.', 'HALE');
    v.say('Pip waves.', 'PIP');
    expect(e.calls[0].opts).toMatchObject({ pitch: PROFILES.HALE.pitch, rate: PROFILES.HALE.rate });
    expect(e.calls[1].opts).toMatchObject({ pitch: PROFILES.PIP.pitch, rate: PROFILES.PIP.rate });
    expect(PROFILES.HALE.pitch).not.toBe(PROFILES.PIP.pitch);
  });

  test('installed system voices are matched by name, preferring enhanced ones', async () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    await v.loadVoices();
    v.say('a line', 'HALE');
    v.say('a line', 'PIP');
    v.say('a line', 'LOG');
    expect(e.calls[0].opts.voice).toBe('com.apple.daniel');
    expect(e.calls[1].opts.voice).toBe('com.apple.samantha.enh');
    expect(e.calls[2].opts.voice).toBeUndefined(); // falls back to the default voice
  });

  test('turned off: nothing is spoken and onEnd still runs', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    v.configure({ voiceover: false });
    const end = jest.fn();
    v.say('Hello', 'HALE', end);
    expect(e.speak).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledWith(false);
  });

  test('a new line cuts off the old one, whose onEnd runs once', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    const first = jest.fn();
    const second = jest.fn();
    v.say('one', 'HALE', first);
    v.say('two', 'PIP', second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    // The engine's late stop callback for the first line changes nothing.
    e.calls[0].opts.onStopped?.();
    expect(first).toHaveBeenCalledTimes(1);
    expect(v.isSpeaking).toBe(true);
    e.calls[1].opts.onDone?.();
    expect(second).toHaveBeenCalledTimes(1);
    expect(v.isSpeaking).toBe(false);
  });

  test('music is lowered while a line plays and restored after', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    v.say('one', 'HALE');
    expect(sound.duck).toHaveBeenLastCalledWith(true);
    e.calls[0].opts.onDone?.();
    expect(sound.duck).toHaveBeenLastCalledWith(false);
  });

  test('going to the background stops the voice and keeps it quiet', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never, {});
    const end = jest.fn();
    v.say('one', 'HALE', end);
    v.setAppActive(false);
    expect(e.stop).toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
    v.say('two', 'HALE');
    expect(e.speak).toHaveBeenCalledTimes(1);
  });

  test('labels are rewritten so they read well aloud', () => {
    expect(speakable('Good morning, UNIT-7.')).toBe('Good morning, Unit 7.');
    expect(speakable('T.R. + coffee machine')).toBe('T R and coffee machine');
  });
});

describe('story scenes', () => {
  const { CHAPTER_SCENES, EPILOGUE_SCENES } = require('../src/game/scenes') as typeof import('../src/game/scenes');
  test('every chapter-opening and epilogue beat has its own scene', () => {
    for (const st of CHAPTER_STORY) expect(CHAPTER_SCENES[st.chapter]?.length).toBe(st.opening.length);
    expect(EPILOGUE_SCENES.length).toBe(EPILOGUE.length);
  });
});
