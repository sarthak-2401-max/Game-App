// Replaceable sound system. Each cue maps to one asset (footsteps to several takes); swap files
// in assets/audio to change the sound design without touching code. Music is a set of looping
// beds (assets/music, made by scripts/make-music.py): the chapter's bed while playing, a story
// mood's bed under a cinematic scene and a drone under WITNESS, crossfaded as the moment changes.
// Failures (missing codec, audio focus lost during a call) are swallowed so audio can never
// block gameplay.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { log } from '../../utils/log';
import { MUSIC_BEDS } from './musicBeds.generated';

export type SoundCue =
  | 'move' | 'bump' | 'push' | 'switch' | 'door' | 'coin' | 'key' | 'core' | 'warning'
  | 'teleport' | 'crumble' | 'fail' | 'win' | 'unlock' | 'tap'
  | 'observer' | 'clue' | 'echo' | 'reveal' | 'star';

 
const SOURCES: Record<SoundCue, number> = {
  move: require('../../../assets/audio/move.wav'),
  bump: require('../../../assets/audio/bump.wav'),
  push: require('../../../assets/audio/push.wav'),
  switch: require('../../../assets/audio/switch.wav'),
  door: require('../../../assets/audio/door.wav'),
  coin: require('../../../assets/audio/coin.wav'),
  key: require('../../../assets/audio/key.wav'),
  core: require('../../../assets/audio/core.wav'),
  warning: require('../../../assets/audio/warning.wav'),
  teleport: require('../../../assets/audio/teleport.wav'),
  crumble: require('../../../assets/audio/crumble.wav'),
  fail: require('../../../assets/audio/fail.wav'),
  win: require('../../../assets/audio/win.wav'),
  unlock: require('../../../assets/audio/unlock.wav'),
  tap: require('../../../assets/audio/tap.wav'),
  observer: require('../../../assets/audio/observer.wav'),
  clue: require('../../../assets/audio/clue.wav'),
  echo: require('../../../assets/audio/echo.wav'),
  reveal: require('../../../assets/audio/reveal.wav'),
  star: require('../../../assets/audio/star.wav'),
};
/** Extra takes of a cue, picked at random so repeated sounds don't feel mechanical. */
const TAKES: Partial<Record<SoundCue, number[]>> = {
  move: [
    require('../../../assets/audio/step1.wav'),
    require('../../../assets/audio/step2.wav'),
    require('../../../assets/audio/step3.wav'),
    require('../../../assets/audio/step4.wav'),
  ],
};
/** The original synthesized loop: used when a bed has not been scored. */
const MUSIC: number = require('../../../assets/audio/music.wav');

const MUSIC_LEVEL = 0.35;
/** How much quieter the music gets while a voice line plays. */
const DUCKED = 0.35;
/** Beds that need a lift to be heard under the line they accompany. */
const BED_GAIN: Record<string, number> = { witness: 1.5 };

interface Deck {
  player: AudioPlayer;
  bed: string;
  volume: number;
}

class SoundSystem {
  private players = new Map<string, AudioPlayer>();
  private lastTake = new Map<SoundCue, number>();
  /** The bed playing (or fading in) and the one fading out. */
  private deck: Deck | null = null;
  private spare: Deck | null = null;
  private fade: ReturnType<typeof setInterval> | null = null;
  private ducked = false;
  /** What the music follows: the chapter (or menu), a story scene on top, WITNESS on top of all. */
  private base = 'menu';
  private scene: string | null = null;
  private witness = false;
  private sfxOn = true;
  private musicOn = true;
  private ready = false;
  private appActive = true;
  /** Browsers block audio until the first user gesture. */
  private unlocked = Platform.OS !== 'web';

  async init() {
    if (this.ready) return;
    this.ready = true;
    if (!this.unlocked && typeof window !== 'undefined') {
      const unlock = () => {
        this.unlocked = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        this.syncMusic();
      };
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
    try {
      // Respect the silent switch and mix politely with other audio (podcasts, calls).
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
    } catch (e) {
      log.warn('audio', 'audio mode unavailable', e);
    }
    // Load every cue up front: creating a player on first use stalls that move by a frame or two.
    if (Platform.OS !== 'web')
      for (const cue of Object.keys(SOURCES) as SoundCue[]) for (let i = 0; i < (TAKES[cue]?.length ?? 1); i++) this.player(cue, i);
  }

  private player(cue: SoundCue, take = 0): AudioPlayer | null {
    const id = `${cue}:${take}`;
    let p = this.players.get(id);
    if (p) return p;
    try {
      p = createAudioPlayer(TAKES[cue]?.[take] ?? SOURCES[cue]);
      p.volume = cue === 'move' ? 0.5 : 0.9;
      this.players.set(id, p);
      return p;
    } catch (e) {
      log.debug('audio', `cue ${cue} failed to load`, e);
      return null;
    }
  }

  configure(opts: { sound: boolean; music: boolean }) {
    this.sfxOn = opts.sound;
    this.musicOn = opts.music;
    this.syncMusic();
  }

  /** Called on app background/foreground; music stops while backgrounded. */
  setAppActive(active: boolean) {
    this.appActive = active;
    this.syncMusic();
  }

  /** Lowers the music while a voice line plays. */
  duck(on: boolean) {
    this.ducked = on;
    this.syncMusic(400);
  }

  /** The music for where the player is: a chapter's bed ('ch3') or 'menu'. */
  setBase(bed: string) {
    this.base = bed;
    this.syncMusic();
  }

  /** The music under a story scene (a mood's bed, 'story-worried'), or null when it closes. */
  setScene(bed: string | null) {
    this.scene = bed;
    this.syncMusic();
  }

  /** WITNESS is speaking: the drone takes over until the line ends. */
  setWitness(on: boolean) {
    this.witness = on;
    this.syncMusic(800);
  }

  play(cue: SoundCue) {
    if (!this.sfxOn || !this.appActive || !this.unlocked) return;
    try {
      const takes = TAKES[cue]?.length ?? 1;
      let take = 0;
      if (takes > 1) {
        // Any take but the last one, so the same step never plays twice in a row.
        take = Math.floor(Math.random() * (takes - 1));
        if (take >= (this.lastTake.get(cue) ?? -1)) take++;
        this.lastTake.set(cue, take);
      }
      const p = this.player(cue, take);
      if (!p) return;
      p.seekTo(0).catch(() => undefined);
      p.play();
    } catch (e) {
      log.debug('audio', `cue ${cue} failed`, e);
    }
  }

  private wantedBed(): string {
    return this.witness ? 'witness' : (this.scene ?? this.base);
  }

  private level(bed: string): number {
    return MUSIC_LEVEL * (BED_GAIN[bed] ?? 1) * (this.ducked ? DUCKED : 1);
  }

  /** Brings the music in line with what should be playing, fading over `ms`. */
  private syncMusic(ms = 1500) {
    if (!this.unlocked) return;
    try {
      if (!this.musicOn || !this.appActive) {
        this.stopFade();
        this.deck?.player.pause();
        this.spare?.player.pause();
        return;
      }
      const bed = this.wantedBed();
      if (this.deck?.bed !== bed && this.spare?.bed === bed) {
        // Going back to the bed still fading out: swap the two instead of restarting it.
        [this.deck, this.spare] = [this.spare, this.deck];
      } else if (this.deck?.bed !== bed) {
        // The outgoing bed becomes the spare; the incoming one reuses the old spare's player.
        const out = this.deck;
        const player = this.spare?.player ?? createAudioPlayer(sourceFor(bed));
        if (this.spare) player.replace(sourceFor(bed));
        player.loop = true;
        player.volume = 0;
        this.deck = { player, bed, volume: 0 };
        this.spare = out;
      }
      if (!this.deck.player.playing) this.deck.player.play();
      this.fadeTo(ms);
    } catch (e) {
      log.debug('audio', 'music failed', e);
    }
  }

  private stopFade() {
    if (this.fade) clearInterval(this.fade);
    this.fade = null;
  }

  /** Steps the current bed to its level and the spare to silence, then pauses the spare. */
  private fadeTo(ms: number) {
    this.stopFade();
    const STEP = 50;
    const steps = Math.max(1, Math.round(ms / STEP));
    let n = 0;
    const tick = () => {
      n++;
      const k = n / steps;
      const deck = this.deck;
      const spare = this.spare;
      try {
        if (deck) {
          const target = this.level(deck.bed);
          deck.volume += (target - deck.volume) * Math.min(1, 1 / (steps - n + 1));
          deck.player.volume = deck.volume;
        }
        if (spare && spare.volume > 0) {
          spare.volume = Math.max(0, spare.volume * (1 - k));
          spare.player.volume = spare.volume;
          if (n >= steps) {
            spare.volume = 0;
            spare.player.pause();
          }
        }
      } catch (e) {
        log.debug('audio', 'fade failed', e);
      }
      if (n >= steps) this.stopFade();
    };
    this.fade = setInterval(tick, STEP);
  }
}

function sourceFor(bed: string): number {
  return MUSIC_BEDS[bed] ?? MUSIC_BEDS.menu ?? MUSIC;
}

export const sound = new SoundSystem();
