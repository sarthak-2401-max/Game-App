// Per-chapter environment palettes. Each chapter of the story is a different part of the
// facility, so the room's floor, walls and glow change as the player goes deeper.
// Hazard colours are never part of a palette (see theme.ts).

export interface Palette {
  /** Screen background behind the board. */
  bg: string;
  floor: string;
  floorAlt: string;
  /** Wall top face, its lit edge and the darker front face. */
  wall: string;
  wallEdge: string;
  wallSide: string;
  /** Ambient light: board glow and accents. */
  glow: string;
}

export const CHAPTER_PALETTES: readonly Palette[] = [
  { bg: '#060A12', floor: '#16202F', floorAlt: '#192436', wall: '#33415F', wallEdge: '#566A96', wallSide: '#1B2336', glow: '#3BE8FF' }, // 1 Intake
  { bg: '#04100F', floor: '#112421', floorAlt: '#142A26', wall: '#2A4B47', wallEdge: '#45766F', wallSide: '#16292A', glow: '#38F2C8' }, // 2 Security Ring
  { bg: '#0B0A10', floor: '#1C1D25', floorAlt: '#20212A', wall: '#41404F', wallEdge: '#6A6880', wallSide: '#24232E', glow: '#FF6B8A' }, // 3 Containment Labs
  { bg: '#0D0905', floor: '#221A12', floorAlt: '#271E15', wall: '#4A3826', wallEdge: '#77593B', wallSide: '#2A2016', glow: '#FFB547' }, // 4 Storage
  { bg: '#09061A', floor: '#1A1530', floorAlt: '#1E1836', wall: '#3B3166', wallEdge: '#5F52A0', wallSide: '#211B3B', glow: '#B38CFF' }, // 5 Time
  { bg: '#070C07', floor: '#172117', floorAlt: '#1A261A', wall: '#344A32', wallEdge: '#56784F', wallSide: '#1C291C', glow: '#7CFF6B' }, // 6 Moving Targets
  { bg: '#0D0614', floor: '#1F1328', floorAlt: '#24162F', wall: '#4A2C5E', wallEdge: '#7A4C98', wallSide: '#2A1836', glow: '#E07CFF' }, // 7 Changing Rooms
  { bg: '#120607', floor: '#261416', floorAlt: '#2B171A', wall: '#552C31', wallEdge: '#8A4850', wallSide: '#2E171B', glow: '#FF7A59' }, // 8 Double Trouble
  { bg: '#05070F', floor: '#121827', floorAlt: '#151C2D', wall: '#2B3550', wallEdge: '#C9A44C', wallSide: '#181F31', glow: '#FFD36E' }, // 9 No Easy Way Out
  { bg: '#020306', floor: '#10141C', floorAlt: '#131821', wall: '#252C3B', wallEdge: '#3BE8FF', wallSide: '#141925', glow: '#9CF5FF' }, // 10 One Room Left
];

export const chapterPalette = (chapter: number): Palette => CHAPTER_PALETTES[Math.max(0, Math.min(CHAPTER_PALETTES.length - 1, chapter - 1))];
