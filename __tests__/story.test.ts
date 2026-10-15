import { CAMPAIGN_SIZE } from '../src/game/levels';
import { CHAPTER_STORY, EPILOGUE, ROOM_ARRIVAL, ROOM_STORY } from '../src/game/story';

jest.mock('../src/services/audio/sound', () => ({ sound: { duck: jest.fn() } }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => []) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PROFILES, VoiceOver, speakable } = require('../src/services/audio/voice') as typeof import('../src/services/audio/voice');
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

describe('voiceover', () => {
  beforeEach(() => sound.duck.mockClear());

  test('each character speaks with its own pitch and rate', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never);
    v.say('Hello, Pip.', 'HALE');
    v.say('Pip waves.', 'PIP');
    expect(e.calls[0].opts).toMatchObject({ pitch: PROFILES.HALE.pitch, rate: PROFILES.HALE.rate });
    expect(e.calls[1].opts).toMatchObject({ pitch: PROFILES.PIP.pitch, rate: PROFILES.PIP.rate });
    expect(PROFILES.HALE.pitch).not.toBe(PROFILES.PIP.pitch);
  });

  test('installed system voices are matched by name, preferring enhanced ones', async () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never);
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
    const v = new VoiceOver(e as never);
    v.configure({ voiceover: false });
    const end = jest.fn();
    v.say('Hello', 'HALE', end);
    expect(e.speak).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
  });

  test('a new line cuts off the old one, whose onEnd runs once', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never);
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
    const v = new VoiceOver(e as never);
    v.say('one', 'HALE');
    expect(sound.duck).toHaveBeenLastCalledWith(true);
    e.calls[0].opts.onDone?.();
    expect(sound.duck).toHaveBeenLastCalledWith(false);
  });

  test('going to the background stops the voice and keeps it quiet', () => {
    const e = fakeEngine();
    const v = new VoiceOver(e as never);
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
