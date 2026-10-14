import { parseLevel, type LevelSpec } from '../src/game/levelFormat';
import type { Room } from '../src/game/types';

let n = 0;
export const room = (map: string[], extra: Partial<LevelSpec> = {}): Room => parseLevel({ name: 'Test', map, ...extra }, `t${++n}`, 1, 1);
