// Cosmetic catalog. Cosmetics are purely visual: they never change hitboxes, hide hazards
// or alter contrast of gameplay-critical elements (hazard red and interactable amber are fixed).

export type CosmeticSlot = 'skin' | 'trail' | 'theme' | 'exit' | 'tile' | 'victory';

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  /** Coin price. 0 = owned from the start. */
  price: number;
  /** Optionally earned by unlocking an achievement instead of buying. */
  achievement?: string;
  /** Visual parameters consumed by the renderer. */
  look: Record<string, string | number>;
}

export const COSMETICS: readonly Cosmetic[] = [
  // Player skins
  { id: 'skin_cyan', slot: 'skin', name: 'Runner', description: 'The original escapee.', price: 0, look: { color: '#3BE8FF', shape: 'circle' } },
  { id: 'skin_mint', slot: 'skin', name: 'Mint', description: 'Cool under pressure.', price: 100, look: { color: '#5CFFB1', shape: 'circle' } },
  { id: 'skin_violet', slot: 'skin', name: 'Phantom', description: 'Slips through the dark.', price: 200, look: { color: '#B38CFF', shape: 'diamond' } },
  { id: 'skin_white', slot: 'skin', name: 'Ghost Light', description: 'Bright enough to see by.', price: 300, look: { color: '#F2F6FF', shape: 'square' } },
  { id: 'skin_star', slot: 'skin', name: 'Constellation', description: 'Earned with 250 mastery stars.', price: 0, achievement: 'stars_250', look: { color: '#CFE3FF', shape: 'diamond' } },
  { id: 'skin_gold', slot: 'skin', name: 'Gilded', description: 'Awarded for finishing the campaign.', price: 0, achievement: 'campaign_complete', look: { color: '#FFD36E', shape: 'diamond' } },
  // Trails
  { id: 'trail_none', slot: 'trail', name: 'No Trail', description: 'Clean and quiet.', price: 0, look: { color: 'transparent' } },
  { id: 'trail_spark', slot: 'trail', name: 'Spark', description: 'A short cyan spark behind each step.', price: 150, look: { color: '#3BE8FF' } },
  { id: 'trail_ember', slot: 'trail', name: 'Ember', description: 'Warm afterglow.', price: 250, look: { color: '#FFB347' } },
  { id: 'trail_static', slot: 'trail', name: 'Static', description: "Earned with five of WITNESS's marks.", price: 0, achievement: 'sigils_5', look: { color: '#DDE3F0' } },
  { id: 'trail_prism', slot: 'trail', name: 'Prism', description: 'Earned with a 7-day streak.', price: 0, achievement: 'streak_7', look: { color: '#E07CFF' } },
  // Room themes (background + wall palette only)
  { id: 'theme_vault', slot: 'theme', name: 'Vault', description: 'Cold steel and shadow.', price: 0, look: { bg: '#07090F', floor: '#121826', floorAlt: '#151C2C', wall: '#262F45', wallEdge: '#3A4766' } },
  { id: 'theme_abyss', slot: 'theme', name: 'Abyss', description: 'Deep ocean blues.', price: 300, look: { bg: '#030A12', floor: '#0B1A2A', floorAlt: '#0E2034', wall: '#16324D', wallEdge: '#22507A' } },
  { id: 'theme_rust', slot: 'theme', name: 'Rust Works', description: 'Old machinery, warm iron.', price: 400, look: { bg: '#0D0806', floor: '#1C1410', floorAlt: '#211812', wall: '#3A2A20', wallEdge: '#5A4030' } },
  { id: 'theme_witness', slot: 'theme', name: 'Observation', description: "WITNESS's white rooms. Earned with all ten marks.", price: 0, achievement: 'sigils_10', look: { bg: '#05060A', floor: '#15171D', floorAlt: '#181B22', wall: '#2D313B', wallEdge: '#C9D3E6' } },
  { id: 'theme_lab', slot: 'theme', name: 'Clean Lab', description: 'Earned by clearing a chapter.', price: 0, achievement: 'chapter_clear', look: { bg: '#0A0D10', floor: '#192026', floorAlt: '#1C242B', wall: '#2E3A44', wallEdge: '#4A5C6A' } },
  // Exit styles
  { id: 'exit_portal', slot: 'exit', name: 'Portal', description: 'The classic glowing door.', price: 0, look: { style: 'portal' } },
  { id: 'exit_hatch', slot: 'exit', name: 'Hatch', description: 'A round blast hatch.', price: 200, look: { style: 'hatch' } },
  { id: 'exit_rift', slot: 'exit', name: 'Rift', description: 'A tear in the room itself.', price: 350, look: { style: 'rift' } },
  // Tile patterns
  { id: 'tile_plain', slot: 'tile', name: 'Plain', description: 'Simple floor plates.', price: 0, look: { pattern: 'plain' } },
  { id: 'tile_grid', slot: 'tile', name: 'Grid', description: 'Engraved grid lines.', price: 120, look: { pattern: 'grid' } },
  { id: 'tile_dots', slot: 'tile', name: 'Rivets', description: 'Riveted steel plates.', price: 180, look: { pattern: 'dots' } },
  // Victory animations
  { id: 'victory_burst', slot: 'victory', name: 'Burst', description: 'A ring of light.', price: 0, look: { style: 'burst' } },
  { id: 'victory_confetti', slot: 'victory', name: 'Confetti', description: 'Celebrate loudly.', price: 250, look: { style: 'confetti' } },
  { id: 'victory_nova', slot: 'victory', name: 'Nova', description: 'Earned with 50 escapes.', price: 0, achievement: 'rooms_50', look: { style: 'nova' } },
];

export const DEFAULT_COSMETICS: Record<CosmeticSlot, string> = {
  skin: 'skin_cyan',
  trail: 'trail_none',
  theme: 'theme_vault',
  exit: 'exit_portal',
  tile: 'tile_plain',
  victory: 'victory_burst',
};

export const getCosmetic = (id: string) => COSMETICS.find((c) => c.id === id);
