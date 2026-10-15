// Warms the assets a room is about to need. Voice lines, music beds and scene paintings are files,
// and the first time one plays it has to be read (in Expo Go, fetched from the dev server), which
// stalls the line and can leave a gap in the music. Fetching them a room ahead, while the player
// is still solving, keeps the next room's opening instant.
import { Asset } from 'expo-asset';
import { TRANSMISSIONS } from '../../game/observer/script';
import { roomId } from '../../game/levels';
import { CHAPTERS } from '../../game/levels/chapters';
import { CHAPTER_STORY, ROOM_ARRIVAL, ROOM_STORY, type StoryBeat } from '../../game/story';
import { voiceKey, type VoiceSpeaker } from '../../game/voiceLines';
import { chapterScenes } from '../story/storyScenes';
import { log } from '../../utils/log';
import { MUSIC_BEDS } from './musicBeds.generated';
import { VOICE_CLIPS } from './voiceClips.generated';

/** Module ids already warmed (or being warmed), so nothing is fetched twice. */
const done = new Set<number>();
/** One at a time, so prefetching never competes with the line playing right now. */
let queue: Promise<void> = Promise.resolve();

function clip(who: VoiceSpeaker, text: string): number | undefined {
  return VOICE_CLIPS[voiceKey(who, text)];
}

function beatClip(b: StoryBeat | undefined): number | undefined {
  return b && clip(b.speaker, b.text);
}

/** Everything campaign room `n` can play: its arrival and escape lines and WITNESS's. */
function assetsForRoom(n: number): number[] {
  const out: (number | undefined)[] = [beatClip(ROOM_ARRIVAL[n - 1]), beatClip(ROOM_STORY[n - 1])];
  const id = roomId(n);
  for (const t of TRANSMISSIONS) if (t.room === id) out.push(clip(t.speaker, t.text));
  // A chapter opening is the heaviest moment: several lines and a full-screen painting each.
  const ch = CHAPTERS.find((c) => c.firstRoom === n);
  const st = ch ? CHAPTER_STORY[ch.number - 1] : undefined;
  if (ch && st) {
    out.push(MUSIC_BEDS[`ch${ch.number}`]);
    for (const b of st.opening) out.push(beatClip(b));
    for (const s of chapterScenes(ch.number, st.opening.length)) out.push(s?.source, MUSIC_BEDS[`story-${s?.mood ?? 'neutral'}`]);
  }
  return out.filter((m): m is number => m !== undefined);
}

/** Fetches the assets for room `n` and the one after it, in the background. */
export function warmRoom(n: number): void {
  const mods = [...assetsForRoom(n), ...assetsForRoom(n + 1)].filter((m) => !done.has(m));
  if (!mods.length) return;
  mods.forEach((m) => done.add(m));
  queue = queue.then(async () => {
    for (const m of mods) {
      try {
        await Asset.fromModule(m).downloadAsync();
      } catch (e) {
        // A miss only costs the pause this avoids, so a failure is never worth surfacing.
        done.delete(m);
        log.debug('audio', 'prefetch failed', e);
      }
    }
  });
}
