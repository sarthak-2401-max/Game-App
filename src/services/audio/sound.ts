// Replaceable sound system. Each cue maps to one asset; swap files in assets/audio to change
// the sound design without touching code. Failures (missing codec, audio focus lost during a
// call) are swallowed so audio can never block gameplay.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { log } from '../../utils/log';

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
const MUSIC: number = require('../../../assets/audio/music.wav');
 

class SoundSystem {
  private players = new Map<SoundCue, AudioPlayer>();
  private music: AudioPlayer | null = null;
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
    if (Platform.OS !== 'web') for (const cue of Object.keys(SOURCES) as SoundCue[]) this.player(cue);
  }

  private player(cue: SoundCue): AudioPlayer | null {
    let p = this.players.get(cue);
    if (p) return p;
    try {
      p = createAudioPlayer(SOURCES[cue]);
      p.volume = cue === 'move' ? 0.5 : 0.9;
      this.players.set(cue, p);
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
    try {
      if (this.music) this.music.volume = on ? 0.12 : 0.35;
    } catch (e) {
      log.debug('audio', 'duck failed', e);
    }
  }

  play(cue: SoundCue) {
    if (!this.sfxOn || !this.appActive || !this.unlocked) return;
    try {
      const p = this.player(cue);
      if (!p) return;
      p.seekTo(0).catch(() => undefined);
      p.play();
    } catch (e) {
      log.debug('audio', `cue ${cue} failed`, e);
    }
  }

  private syncMusic() {
    if (!this.unlocked) return;
    try {
      if (this.musicOn && this.appActive) {
        if (!this.music) {
          this.music = createAudioPlayer(MUSIC);
          this.music.loop = true;
          this.music.volume = 0.35;
        }
        if (!this.music.playing) this.music.play();
      } else this.music?.pause();
    } catch (e) {
      log.debug('audio', 'music failed', e);
    }
  }
}

export const sound = new SoundSystem();
