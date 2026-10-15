# Test results

Recorded 2026-10-15 in a Linux container (Node 22, Expo SDK 57), on the `upgrade/observer` branch. Everything listed under "Executed" was actually run, and the results are copied from its output. Anything not listed was **not** run.

## Executed

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | exit 0, no errors |
| Lint | `npx eslint . --quiet` | exit 0, no problems |
| Unit + content tests | `npm test` | 11 suites, 530 tests, all passed (about 26 s) |
| Level report | `npm run levels:report` | "0 room(s) with issues" for 100 campaign, 12 daily, 3 bonus, 4 interlude rooms and 1 memory variant; echo rooms o02–o04 confirmed unsolvable without an echo |
| Web production export | `npm run export:web` | exit 0, single 1.99 MB JS bundle |
| First session (dev server, headless Chromium, 390×844) | `scripts/e2e/first-session.js` | Home in 1.3 s; no story card before Room 1; first move at 3.7 s and first escape at 5.8 s (scripted, includes a fixed 1.2 s pause); WITNESS line on the first move; WITNESS and HALE lines on the result; Room 2 lights-out clue found; 0 errors |
| Echo interlude (dev server, seeded save) | `scripts/e2e/observer.js` | Room 30 solved, result routes into "The Echo", restart creates the echo, echo holds the plate, interlude won, payoff line shown, Journal lists the clue and heard lines, Home shows 88/312 stars and 1/10 marks; 0 errors |
| Browser click-through (dev server) | `scripts/e2e/smoke.js` | 18/18 steps passed, 0 page errors, 0 console errors |

Earlier runs (2026-10-14, before this branch) also covered `expo-doctor` (19/21, the two failures need network access) and the simulated rewarded-ad flow (`scripts/e2e/ads-flow.js`). They were not re-run for this branch.

Jest summary:

```
    Test Suites: 11 passed, 11 total
    Tests:       530 passed, 530 total
```

### What the suites cover

- **engine.test.ts (18):** movement and walls, cores sealing the exit, gold keys/locks, switches and plates driving doors, block on plate, static and timed spikes, channel lasers, pits filled by blocks, crumbling floor, drones (incl. swap collisions), platforms carrying the player, teleporters, move limits, checkpoint events, deterministic replay.
- **levels.test.ts (247):** exactly 100 rooms in 10 chapters of 10, unique ids/names/layouts, structural validation of all 120 rooms (including interludes and the memory variant), every stored solution replays to a win within move and fair time limits, no orphaned stored solutions, daily selection is deterministic, never repeats on consecutive days over 3 years and covers the whole pool.
- **solver.test.ts (116):** solver correctness on small rooms, then the full BFS solvability check (plus move-limit, timer-fairness and all-coins-collectible rules) for every campaign, daily and bonus room.
- **progression.test.ts (13):** unlock order, completion pays once and replays pay nothing, coins and hidden coins pay once, chapter bonus and achievements, flawless-chapter rule, efficiency/no-undo from chapter 2, daily claim once per day, streak growth/grace/reset/cap, clock-rollback block, shop purchase/owned/insufficient/not-for-sale/equip, bonus room purchase.
- **ads.test.ts (10):** earned, dismissed, failed and unavailable outcomes; duplicate SDK callbacks resolve once and an earned reward survives a late error; token de-duplication; daily limits and next-day reset; double-reward and bonus-room grants; interstitial onboarding block, spacing, interval, rewarded cooldown, consent and daily cap.
- **save.test.ts (8):** v1 → v2 migration, newer-version and non-object rejection, field repair, round-trip with backup, corrupt save quarantined and backup restored, reset without backup, write coalescing, reset keeps a recoverable copy.
- **echo.test.ts (15):** echo replay order, plates held by the echo, walls stop it, it never blocks the player, fade after the linger, echo in `stateKey`, track cap, o02–o04 need an echo and are solvable with the reference one, restart records the echo, empty attempts keep it, undo trims it, door events.
- **observer.test.ts (68):** unique ids; every line targets a real room, clue, cell and pickup; every condition reads only flags the game writes; every placeholder is known; every clue sits on a sensible cell and can be collected on a run that still wins; the Room 2 writing is reachable before the lights return; dark clues hidden in the light; corrupted flags read as zero; forged sigil flags ignored; both room-21 layouts solvable whatever the memory; o01 route recorded once; both o01 exits reachable; lines play once, react to the first choice, to earlier hints and to failures; template filling.
- **mastery.test.ts (15):** move targets, par for every room and interlude, stars from undo/hints, coin and mark objectives across runs, star union never drops a star, backfill once and idempotent, clue discovery idempotent, five marks pay once and unlock the trail, daily score best-of with no repeat coins, no score without a claim, v2 → v3 migration keeps everything, corrupted flags/stars/daily scores dropped.
- **session.test.ts (8):** undo, restart, revive (rewind / extra moves / extra time, once per attempt), countdown timeout, checkpoint restore with saved time, hints from the stored solution, off-path search and "stuck" detection.

Bugs the tests found and that were fixed: a duplicate room name (r082 renamed "Sentry Shuffle"); an array-shaped save was accepted as a v1 save instead of treated as corrupt; non-boolean settings survived loading.

## Not executed

- Native iOS/Android builds (`eas build`), installation, or any run on a phone or simulator.
- Real AdMob ad requests, UMP consent form, ATT prompt.
- Touch gestures, haptics, audio output, screen readers, performance on low-end devices.
- Manual playthrough of every room by a person (all rooms were solved by the solver; rooms 1–2, 30 and the Echo interlude were played through the UI by script).
- An automated test of the countdown pausing while a sheet, offer or ad is open (UI-layer fix, checked by code review only).

## Re-running

```bash
npm test && npm run typecheck && npm run lint
npm run levels:report
npm run export:web && (cd dist && python3 -m http.server 8099) &
NODE_PATH=$(npm root -g) node scripts/e2e/smoke.js /tmp/shots   # needs Playwright + Chromium
```

`ads-flow.js` expects a development export (`npx expo export --platform web --dev --output-dir dist-dev`) served on port 8098.

Screenshots from the browser run are in [screenshots/](screenshots/).
