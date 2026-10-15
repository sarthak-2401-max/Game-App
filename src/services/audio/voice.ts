// Voiceover: the story read aloud with the device's own text-to-speech (expo-speech), so it
// works offline, in Expo Go and on the web with no audio files to ship. Each character gets its
// own voice settings. One line plays at a time; a new line cuts off the old one. Subtitles are
// always on screen, so nothing is lost when voiceover is off or the phone is muted.
import * as Speech from 'expo-speech';
import { log } from '../../utils/log';
import { sound } from './sound';

export type Speaker = 'HALE' | 'PIP' | 'LOG' | 'WITNESS';

interface Profile {
  /** Preferred system voices by name, best first. The first one installed wins. */
  prefer: string[];
  pitch: number;
  rate: number;
}

// iOS ships these voices by name; Android and the web fall back to the default English voice
// and tell the characters apart by pitch and speed.
export const PROFILES: Record<Speaker, Profile> = {
  // The facility AI: calm, low, measured.
  HALE: { prefer: ['Daniel', 'Arthur', 'Aaron', 'Oliver', 'Gordon'], pitch: 0.88, rate: 0.94 },
  // Pip's lines are narration about Pip: warm and bright.
  PIP: { prefer: ['Samantha', 'Nicky', 'Karen', 'Tessa', 'Catherine'], pitch: 1.12, rate: 1.0 },
  // Recovered staff recordings: a different human voice.
  LOG: { prefer: ['Moira', 'Tessa', 'Karen', 'Serena', 'Martha'], pitch: 1.0, rate: 0.96 },
  // The watcher on the monitors: slow and too low.
  WITNESS: { prefer: ['Fred', 'Ralph', 'Daniel', 'Arthur'], pitch: 0.62, rate: 0.86 },
};

/** What the speech engine should hear: labels and symbols read badly aloud. */
export function speakable(text: string): string {
  return text
    .replace(/UNIT-7/g, 'Unit 7')
    .replace(/\bT\.R\./g, 'T R')
    .replace(/\s+\+\s+/g, ' and ')
    .replace(/[▍★]/g, '')
    .trim();
}

type Engine = Pick<typeof Speech, 'speak' | 'stop' | 'getAvailableVoicesAsync'>;

export class VoiceOver {
  private enabled = true;
  private appActive = true;
  /** Identifies the line playing now, so callbacks from a cut-off line are ignored. */
  private token = 0;
  private speaking = false;
  /** The playing line's onEnd, run if the line is cut off. */
  private pending: (() => void) | null = null;
  private voices: Partial<Record<Speaker, string>> = {};
  private voicesLoaded: Promise<void> | null = null;

  constructor(private engine: Engine = Speech) {}

  configure(opts: { voiceover: boolean }) {
    this.enabled = opts.voiceover;
    if (!this.enabled) this.stop();
  }

  get isEnabled() {
    return this.enabled;
  }

  get isSpeaking() {
    return this.speaking;
  }

  setAppActive(active: boolean) {
    this.appActive = active;
    if (!active) this.stop();
  }

  /** Picks a system voice per character once; failures leave the default voice. */
  loadVoices(): Promise<void> {
    if (this.voicesLoaded) return this.voicesLoaded;
    this.voicesLoaded = (async () => {
      try {
        const all = (await this.engine.getAvailableVoicesAsync()).filter((v) => v.language?.toLowerCase().startsWith('en'));
        for (const who of Object.keys(PROFILES) as Speaker[]) {
          for (const name of PROFILES[who].prefer) {
            const match = all.filter((v) => v.name === name || v.name.startsWith(`${name} (`)).sort((a, b) => (a.quality === 'Enhanced' ? -1 : 0) - (b.quality === 'Enhanced' ? -1 : 0))[0];
            if (match) {
              this.voices[who] = match.identifier;
              break;
            }
          }
        }
      } catch (e) {
        log.debug('voice', 'voice list unavailable', e);
      }
    })();
    return this.voicesLoaded;
  }

  /**
   * Reads a line in a character's voice. `onEnd` runs when it finishes, is cut off, or cannot
   * play at all (voiceover off, app in the background), so callers can always rely on it.
   */
  say(text: string, who: Speaker, onEnd?: () => void): void {
    this.stop();
    const line = speakable(text);
    if (!this.enabled || !this.appActive || !line) {
      onEnd?.();
      return;
    }
    const id = ++this.token;
    const end = () => {
      if (id !== this.token) return;
      this.token++;
      this.speaking = false;
      this.pending = null;
      sound.duck(false);
      onEnd?.();
    };
    const p = PROFILES[who];
    try {
      this.speaking = true;
      this.pending = onEnd ?? null;
      sound.duck(true);
      this.engine.speak(line, {
        language: 'en-US',
        voice: this.voices[who],
        pitch: p.pitch,
        rate: p.rate,
        onDone: end,
        onStopped: end,
        onError: end,
      });
    } catch (e) {
      log.debug('voice', 'speak failed', e);
      end();
    }
  }

  stop() {
    const wasSpeaking = this.speaking;
    const pending = this.pending;
    // Invalidate the old line first so a late onStopped cannot end the next one.
    this.token++;
    this.speaking = false;
    this.pending = null;
    if (!wasSpeaking) return;
    sound.duck(false);
    try {
      void this.engine.stop();
    } catch (e) {
      log.debug('voice', 'stop failed', e);
    }
    pending?.();
  }
}

export const voice = new VoiceOver();
