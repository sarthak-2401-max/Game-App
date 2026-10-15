// Plays one recorded voice line with expo-audio. Kept apart from voice.ts so tests can swap it.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export interface ClipPlayer {
  /**
   * Starts a clip; `onEnd` runs when it finishes and `onDuration` once its length (in seconds)
   * is known. Returns a function that stops it.
   */
  play(source: number, onEnd: () => void, onDuration?: (seconds: number) => void): () => void;
}

// One player, reused for every line. Creating and freeing a native player per line churns the
// iOS audio session and can leave later clips (and the music) silent.
let shared: AudioPlayer | null = null;

export const expoClipPlayer: ClipPlayer = {
  play(source, onEnd, onDuration) {
    if (shared) shared.replace(source);
    else shared = createAudioPlayer(source);
    const p = shared;
    let reported = false;
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (!reported && s.isLoaded && s.duration > 0) {
        reported = true;
        onDuration?.(s.duration);
      }
      if (s.didJustFinish) onEnd();
    });
    p.seekTo(0).catch(() => undefined);
    p.play();
    return () => {
      sub.remove();
      p.pause();
    };
  },
};
