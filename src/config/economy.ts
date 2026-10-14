// All balancing values live here so the economy can be tuned (or later remote-configured)
// without touching game code.
export const ECONOMY = {
  firstRoomReward: 20,
  roomReward: 10,
  /** Replays of an already-completed room grant nothing, so retry loops can't farm coins. */
  replayReward: 0,
  chapterBonus: 50,
  dailyReward: 30,
  /** Each coin picked up inside a room pays once, the first time it is collected. */
  roomCoinValue: 5,
  hiddenCoinValue: 15,
  streak: { bonusPerDay: 5, maxBonus: 25, graceDays: 1 },
  ads: {
    bonusCoins: 15,
    bonusCoinsDailyLimit: 5,
    doubleRewardDailyLimit: 10,
    hintDailyLimit: 15,
    reviveDailyLimit: 20,
    revivesPerAttempt: 1,
    bonusRoomUnlockDailyLimit: 3,
    /** Extra turns granted by a revive in a move-limited room. */
    reviveExtraMoves: 5,
    /** Extra seconds granted by a revive in a timed room. */
    reviveExtraSeconds: 15,
  },
  bonusRoomPrice: 150,
} as const;

export type Economy = typeof ECONOMY;
