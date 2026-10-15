// Plays one recorded voice line with expo-audio. Kept apart from voice.ts so tests can swap it.
import { createAudioPlayer } from 'expo-audio';

export interface ClipPlayer {
  /** Starts a clip; `onEnd` runs when it finishes. Returns a function that stops and frees it. */
  play(source: number, onEnd: () => void): () => void;
}

export const expoClipPlayer: ClipPlayer = {
  play(source, onEnd) {
    const p = createAudioPlayer(source);
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) onEnd();
    });
    p.play();
    return () => {
      sub.remove();
      try {
        p.pause();
      } finally {
        p.remove();
      }
    };
  },
};
