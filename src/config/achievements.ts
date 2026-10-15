export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reward: number;
  /** Progress target for counter achievements (1 for one-off). */
  target: number;
  hidden?: boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first_escape', name: 'First Escape', description: 'Escape the first room.', reward: 10, target: 1 },
  { id: 'rooms_5', name: 'Getting the Hang of It', description: 'Complete five rooms.', reward: 20, target: 5 },
  { id: 'chapter_clear', name: 'Chapter Closed', description: 'Finish an entire chapter.', reward: 50, target: 1 },
  { id: 'no_undo', name: 'No Second Guesses', description: 'Complete a room from chapter 2 onward without using undo.', reward: 15, target: 1 },
  { id: 'efficient', name: 'Shortest Path', description: 'Complete a room from chapter 2 onward in the fewest possible moves.', reward: 25, target: 1 },
  { id: 'daily_first', name: 'Daily Escapee', description: 'Complete a daily challenge.', reward: 20, target: 1 },
  { id: 'hidden_coin', name: 'Treasure Hunter', description: 'Discover a hidden collectible.', reward: 25, target: 1 },
  { id: 'rooms_25', name: 'Seasoned', description: 'Complete 25 rooms.', reward: 40, target: 25 },
  { id: 'rooms_50', name: 'Veteran', description: 'Complete 50 rooms.', reward: 60, target: 50 },
  { id: 'campaign_complete', name: 'One Room Left', description: 'Complete all 100 campaign rooms.', reward: 200, target: 100 },
  { id: 'streak_3', name: 'Habit Forming', description: 'Reach a 3-day daily streak.', reward: 30, target: 3 },
  { id: 'streak_7', name: 'Dedicated', description: 'Reach a 7-day daily streak.', reward: 70, target: 7 },
  { id: 'collector', name: 'Collector', description: 'Own 5 cosmetics you bought or earned.', reward: 30, target: 5 },
  { id: 'sigils_5', name: 'Seen', description: "Find five of WITNESS's marks.", reward: 40, target: 5 },
  { id: 'sigils_10', name: 'Witnessed', description: "Find all ten of WITNESS's marks.", reward: 100, target: 10 },
  { id: 'stars_100', name: 'Rising Star', description: 'Earn 100 mastery stars.', reward: 50, target: 100 },
  { id: 'stars_250', name: 'Constellation', description: 'Earn 250 mastery stars.', reward: 150, target: 250 },
  { id: 'daily_master', name: 'Daily Master', description: 'Earn all three stars on a daily challenge.', reward: 30, target: 1 },
  { id: 'flawless_chapter', name: 'Untouchable', description: 'Clear a whole chapter without failing a single attempt.', reward: 60, target: 1, hidden: true },
];

export const getAchievement = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
