// Campaign registry. Each chapter file exports exactly ten handcrafted rooms.
import { parseLevel, type LevelSpec } from '../levelFormat';
import type { Room } from '../types';
import { chapter1 } from './chapter01';
import { chapter2 } from './chapter02';
import { chapter3 } from './chapter03';
import { chapter4 } from './chapter04';
import { chapter5 } from './chapter05';
import { chapter6 } from './chapter06';
import { chapter7 } from './chapter07';
import { chapter8 } from './chapter08';
import { chapter9 } from './chapter09';
import { chapter10 } from './chapter10';
import { CHAPTERS } from './chapters';

export { CHAPTERS } from './chapters';

const SPECS: LevelSpec[][] = [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7, chapter8, chapter9, chapter10];

export const roomId = (n: number) => `r${String(n).padStart(3, '0')}`;

function build(): Room[] {
  const rooms: Room[] = [];
  SPECS.forEach((specs, ci) => {
    specs.forEach((spec, ri) => {
      const n = ci * 10 + ri + 1;
      rooms.push(parseLevel(spec, roomId(n), ci + 1, n));
    });
  });
  return rooms;
}

export const CAMPAIGN: readonly Room[] = build();
export const CAMPAIGN_SIZE = CAMPAIGN.length;
export const ROOMS_PER_CHAPTER = 10;

export const getRoom = (n: number): Room | undefined => CAMPAIGN[n - 1];
export const getRoomById = (id: string) => CAMPAIGN.find((r) => r.id === id);
export const chapterOf = (n: number) => CHAPTERS[Math.floor((n - 1) / ROOMS_PER_CHAPTER)];
