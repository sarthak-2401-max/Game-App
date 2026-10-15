// The music follows the moment: chapter bed, story scene on top, WITNESS on top of all.
interface FakePlayer {
  source: unknown;
  volume: number;
  loop: boolean;
  playing: boolean;
  play: () => void;
  pause: () => void;
  replace: (s: unknown) => void;
  seekTo: () => Promise<void>;
}
const players: FakePlayer[] = [];

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => undefined),
  createAudioPlayer: (source: unknown) => {
    const p: FakePlayer = {
      source,
      volume: 1,
      loop: false,
      playing: false,
      play() {
        p.playing = true;
      },
      pause() {
        p.playing = false;
      },
      replace(s) {
        p.source = s;
      },
      seekTo: async () => undefined,
    };
    players.push(p);
    return p;
  },
}));
jest.mock('../src/services/audio/musicBeds.generated', () => ({
  MUSIC_BEDS: { menu: 'menu', ch3: 'ch3', 'story-worried': 'story-worried', witness: 'witness' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sound } = require('../src/services/audio/sound') as typeof import('../src/services/audio/sound');

/** The bed you can hear: the loudest playing player. */
function audible() {
  const on = players.filter((p) => p.playing && p.volume > 0.01).sort((a, b) => b.volume - a.volume);
  return on[0]?.source;
}

describe('music beds', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  test('follows the chapter, a story scene over it and WITNESS over both', () => {
    sound.setBase('ch3');
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('ch3');

    sound.setScene('story-worried');
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('story-worried');

    sound.setWitness(true);
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('witness');

    sound.setWitness(false);
    sound.setScene(null);
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('ch3');
    // Two players cover any crossfade.
    expect(players.length).toBeLessThanOrEqual(2);
  });

  test('a bed with no recording falls back to the menu bed', () => {
    sound.setBase('ch9');
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('menu');
  });

  test('a voice line lowers the music and its end brings it back', () => {
    sound.setBase('ch3');
    jest.advanceTimersByTime(2000);
    const full = players.find((p) => p.source === 'ch3' && p.playing)!.volume;
    sound.duck(true);
    jest.advanceTimersByTime(1000);
    expect(players.find((p) => p.source === 'ch3' && p.playing)!.volume).toBeLessThan(full / 2);
    sound.duck(false);
    jest.advanceTimersByTime(1000);
    expect(players.find((p) => p.source === 'ch3' && p.playing)!.volume).toBeCloseTo(full);
  });

  test('music off silences every bed', () => {
    sound.configure({ sound: true, music: false });
    expect(players.some((p) => p.playing)).toBe(false);
    sound.configure({ sound: true, music: true });
    jest.advanceTimersByTime(2000);
    expect(audible()).toBe('ch3');
  });
});
