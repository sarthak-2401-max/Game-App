# Test results

Recorded 2026-10-14 in a Linux container (Node 22, Expo SDK 57). Everything listed under "Executed" was actually run, and the results are copied from its output. Anything not listed was **not** run.

## Executed

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | exit 0, no errors |
| Lint | `npm run lint` (eslint-config-expo, incl. React Compiler rules) | exit 0, no problems |
| Unit + content tests | `npm test` | 7 suites, 409 tests, all passed (about 20 s) |
| Level report | `npm run levels:report` | "0 room(s) with issues" for 100 campaign + 12 daily + 3 bonus rooms |
| Expo doctor | `npx expo-doctor` | 19/21 checks passed; the 2 failures need network access to Expo's API (blocked here). It caught a missing `expo-asset` peer dependency, which was then installed. |
| Web production export | `npm run export:web` | exit 0, single 1.9 MB JS bundle |
| Browser click-through (production web build) | `scripts/e2e/smoke.js` with headless Chromium, 390×844 | 17/17 steps passed, 0 page errors, 0 console errors |
| Simulated rewarded-ad flow (development web build) | `scripts/e2e/ads-flow.js` | Rooms 1–4 solved by keyboard. No reward offers in rooms 1–3; offer in room 4. Watch ad → simulator → "Finish ad" → coins 60 → 70 (+10, double reward), offer removed afterwards. Only dev-mode library warnings in the console. |

Jest summary:

```
    Test Suites: 7 passed, 7 total
    Tests:       409 passed, 409 total
```

### What the suites cover

- **engine.test.ts (18):** movement and walls, cores sealing the exit, gold keys/locks, switches and plates driving doors, block on plate, static and timed spikes, channel lasers, pits filled by blocks, crumbling floor, drones (incl. swap collisions), platforms carrying the player, teleporters, move limits, checkpoint events, deterministic replay.
- **levels.test.ts (236):** exactly 100 rooms in 10 chapters of 10, unique ids/names/layouts, structural validation of all 115 rooms, every stored solution replays to a win within move and fair time limits, daily selection is deterministic, never repeats on consecutive days over 3 years and covers the whole pool.
- **solver.test.ts (116):** solver correctness on small rooms, then the full BFS solvability check (plus move-limit, timer-fairness and all-coins-collectible rules) for every campaign, daily and bonus room.
- **progression.test.ts (13):** unlock order, completion pays once and replays pay nothing, coins and hidden coins pay once, chapter bonus and achievements, flawless-chapter rule, efficiency/no-undo from chapter 2, daily claim once per day, streak growth/grace/reset/cap, clock-rollback block, shop purchase/owned/insufficient/not-for-sale/equip, bonus room purchase.
- **ads.test.ts (10):** earned, dismissed, failed and unavailable outcomes; duplicate SDK callbacks resolve once and an earned reward survives a late error; token de-duplication; daily limits and next-day reset; double-reward and bonus-room grants; interstitial onboarding block, spacing, interval, rewarded cooldown, consent and daily cap.
- **save.test.ts (8):** v1 → v2 migration, newer-version and non-object rejection, field repair, round-trip with backup, corrupt save quarantined and backup restored, reset without backup, write coalescing, reset keeps a recoverable copy.
- **session.test.ts (8):** undo, restart, revive (rewind / extra moves / extra time, once per attempt), countdown timeout, checkpoint restore with saved time, hints from the stored solution, off-path search and "stuck" detection.

Bugs the tests found and that were fixed: a duplicate room name (r082 renamed "Sentry Shuffle"); an array-shaped save was accepted as a v1 save instead of treated as corrupt; non-boolean settings survived loading.

## Not executed

- Native iOS/Android builds (`eas build`), installation, or any run on a phone or simulator.
- Real AdMob ad requests, UMP consent form, ATT prompt.
- Touch gestures, haptics, audio output, screen readers, performance on low-end devices.
- Manual playthrough of every room by a person (all rooms were solved by the solver, and rooms 1–4 were played through the UI by script).

## Re-running

```bash
npm test && npm run typecheck && npm run lint
npm run levels:report
npm run export:web && (cd dist && python3 -m http.server 8099) &
NODE_PATH=$(npm root -g) node scripts/e2e/smoke.js /tmp/shots   # needs Playwright + Chromium
```

`ads-flow.js` expects a development export (`npx expo export --platform web --dev --output-dir dist-dev`) served on port 8098.

Screenshots from the browser run are in [screenshots/](screenshots/).
