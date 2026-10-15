// Web build: a plain audio element, so a line cut off before it starts does not surface the
// browser's "play() was interrupted" rejection as a page error.
import { Asset } from 'expo-asset';
import type { ClipPlayer } from './voiceClipPlayer';

export type { ClipPlayer } from './voiceClipPlayer';

export const expoClipPlayer: ClipPlayer = {
  play(source, onEnd) {
    const audio = new Audio(Asset.fromModule(source).uri);
    audio.onended = () => onEnd();
    audio.play().catch(() => undefined);
    return () => {
      audio.onended = null;
      audio.pause();
      audio.removeAttribute('src');
    };
  },
};
