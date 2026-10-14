export interface ChapterInfo {
  number: number;
  title: string;
  blurb: string;
  firstRoom: number;
}

export const CHAPTERS: readonly ChapterInfo[] = [
  { number: 1, title: 'Learn to Escape', blurb: 'Movement, walls and exits.', firstRoom: 1 },
  { number: 2, title: 'Locked In', blurb: 'Keys, locks, switches and plates.', firstRoom: 11 },
  { number: 3, title: 'Deadly Steps', blurb: 'Spikes, lasers and traps.', firstRoom: 21 },
  { number: 4, title: 'Think Ahead', blurb: 'Blocks, pits and limited moves.', firstRoom: 31 },
  { number: 5, title: 'Time Is Running Out', blurb: 'Countdowns and timed traps.', firstRoom: 41 },
  { number: 6, title: 'Moving Targets', blurb: 'Drones and moving platforms.', firstRoom: 51 },
  { number: 7, title: 'Changing Rooms', blurb: 'Teleporters and crumbling floors.', firstRoom: 61 },
  { number: 8, title: 'Double Trouble', blurb: 'Everything, combined.', firstRoom: 71 },
  { number: 9, title: 'No Easy Way Out', blurb: 'Deliberate, multi-step plans.', firstRoom: 81 },
  { number: 10, title: 'One Room Left', blurb: 'The final escape.', firstRoom: 91 },
];
