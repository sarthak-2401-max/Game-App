// Story progress: which chapter openings and the epilogue have been shown.
import type { SaveData } from '../services/storage/saveSchema';

export const chapterIntroSeen = (s: SaveData, chapter: number) => s.story.chaptersSeen.includes(chapter);

export function markChapterIntroSeen(s: SaveData, chapter: number): SaveData {
  if (chapterIntroSeen(s, chapter)) return s;
  return { ...s, story: { ...s.story, chaptersSeen: [...s.story.chaptersSeen, chapter] } };
}

export function markEpilogueSeen(s: SaveData): SaveData {
  return s.story.epilogueSeen ? s : { ...s, story: { ...s.story, epilogueSeen: true } };
}
