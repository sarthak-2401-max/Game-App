// Builds a mid-campaign save used to capture store screenshots. Output: JSON on stdout.
import { getRoom } from '../../src/game/levels';
import SOLUTIONS from '../../src/game/levels/solutions.generated.json';
import { decodeSolution } from '../../src/game/solver/solver';
import { replay } from '../../src/game/engine';
import { defaultSave } from '../../src/services/storage/saveSchema';
import { claimDaily, completeRoom, purchaseCosmetic, selectCosmetic } from '../../src/state/progression';
import { dayKey } from '../../src/utils/dates';

const upTo = Number(process.argv[2] ?? 79);
let s = defaultSave();
for (let n = 1; n <= upTo; n++) {
  const room = getRoom(n)!;
  const sol = decodeSolution((SOLUTIONS as Record<string, string>)[room.id]);
  const end = replay(room, sol, { requireCoins: false });
  s = completeRoom(s, room, { moves: sol.length, usedUndo: false, itemsTaken: end.itemsTaken, failedAttempts: 0, parMoves: sol.length }).save;
}
for (let d = 5; d >= 1; d--) {
  const day = new Date(Date.now() - d * 86_400_000);
  const r = claimDaily(s, dayKey(day), day);
  if (r.ok) s = r.save;
}
for (const id of ['skin_violet', 'trail_spark']) {
  const r = purchaseCosmetic(s, id);
  if (r.ok) s = selectCosmetic(r.save, id);
}
s = { ...s, tutorialCompleted: true, consent: { ...s.consent, flowCompletedAt: new Date().toISOString(), personalizedAds: false } };
process.stdout.write(JSON.stringify(s));
