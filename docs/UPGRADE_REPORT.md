# Upgrade report: WITNESS, room memory and the Echo

Branch `upgrade/observer`, built on top of `8a0c205`. The audit that set the priorities is in [AUDIT.md](AUDIT.md); the design and the clue catalog are in [WITNESS.md](WITNESS.md).

A note on "3D": the game is still React Native views and SVG with a 3D-style look (raised walls, front faces, shadows, a light that follows Pip in the dark). No 3D engine was added. That keeps the game light, deterministic and testable, and it was the option chosen earlier.

## 1. Weaknesses found

- **First session.** A three-beat story card stood between "Play" and Room 1, and Room 1 had no surprise and no question.
- **Story.** The story only appeared between rooms. Nothing reacted to the player, and there was no mystery pulling them forward.
- **Rooms and exploration.** Rooms played the same every time, with nothing to find except coins.
- **Replay.** Mastery was only "best moves", and the daily challenge had no score.
- **Feel.** Doors had no sound, and the result sheet covered the win burst.
- **Bug.** The countdown kept running while a rewarded offer or power-up sheet was open, and keyboard input could reach the board behind those sheets.
- **Hints.** Hints were keyed by room id only, so they would break for any room variant.

## 2. Improvements implemented (in priority order)

1. **First 60 seconds.**
   - Room 1 now starts straight away, and the chapter 1 card moves to Room 2.
   - On the first move, a voice that is not HALE speaks: "Signal. Subject 7 is awake. Begin."
   - On the result screen, HALE answers: "whatever that monitor said, it was not me."
   - In Room 2 the lights go out and hidden writing appears.
   - Time to first move and to first win is measured, both in analytics and in an end-to-end script.
2. **WITNESS, the Observer.**
   - 66 scripted lines across all 10 chapters, the interludes and the secret room.
   - They are delivered on a monitor bar above the board with a typewriter effect, which is instant with Reduced motion.
   - Lines react to deaths, hints, revives, rooms cleared without undo, the first choice, and the marks found.
3. **Room memory.** Save v3 has versioned flags, a migration from v2, a sanitizer, and conditions that only select content.
4. **Environmental twists:**
   - lights out with UV writing;
   - "Room 1, Again", with sinking walls and a two-exit choice;
   - a wall in Room 21 that opens only for players who trusted WITNESS;
   - the monitor and recording light;
   - the Echo.
5. **Clue catalog and collection.**
   - 14 story clues: wall writing, recordings and an object.
   - 10 hidden WITNESS marks.
   - The Journal has a new **WITNESS Files** tab.
   - Five marks unlock a cosmetic trail. All ten unlock the Observation theme and a secret room.
6. **Echo mechanic.** A deterministic replay of your previous attempt that holds plates. It powers three interludes, two after rooms 30 and 50 plus the secret room. Every one is solver-proven to need the echo.
7. **Mastery stars.**
   - Each room has up to 3 stars: escape, a move target with slack above par, and one objective (hidden cache, every coin, the room's mark, or no undo).
   - Hints, revives and power-ups never cost a star. Undo matters only in rooms whose objective is "escape without undo", and never for the escape or move stars.
   - Older saves get the stars they provably earned, backfilled once.
   - Totals show on Home, Rooms and chapter headers.
8. **Daily score.** The best stars and moves are kept on the day's claim. Replays can raise the score but never pay coins again. A one-time "Daily Master" achievement rewards 3 stars.
9. **Game feel.**
   - New sounds for a WITNESS line, a clue, the echo, a door opening and a star.
   - Door open and close sounds with haptics.
   - The result sheet waits 550 ms, or 0 ms with Reduced motion, so the win lands first; input is never delayed.
10. **Ad and timer fix.** The countdown and input now pause while any sheet, offer or ad is on screen. Interstitials never play right before an interlude.

The rewarded-ad rules are unchanged: a reward is granted only on the SDK's earned callback, with duplicate-token protection and daily caps. Production builds never show the simulator.

## 3. Files changed and why

New files:

| File | Purpose |
|---|---|
| `src/game/observer/script.ts` | WITNESS and HALE in-room lines with triggers and conditions |
| `src/game/observer/clues.ts` | Clue catalog (id, room, cell, kind, conditions, text, purpose, flag, relations) |
| `src/game/observer/rooms.ts` | Interludes o01–o04, routes, room-memory variants |
| `src/game/observer/conditions.ts` | Condition language and evaluator |
| `src/game/observer/observer.ts` | Variant selection, line selection, clue reach, templates |
| `src/game/echo.ts` | Echo track helpers, reference echo, per-variant solution keys |
| `src/state/memory.ts` | Writes memory flags |
| `src/state/mastery.ts` | Stars, par, move targets, backfill |
| `src/screens/game/useWitness.ts` | Game-screen glue for lines, lights and clues |
| `src/components/game/MonitorBar.tsx` | The monitor that types WITNESS lines |
| `src/components/game/Stars.tsx` | Star icons, rows and the result checklist |
| `__tests__/echo.test.ts`, `observer.test.ts`, `mastery.test.ts` | 98 new tests (plus 11 new cases in `levels.test.ts`) |
| `scripts/e2e/first-session.js`, `scripts/e2e/observer.js` | Browser checks for the first session and the echo interlude |
| `assets/audio/{observer,clue,echo,reveal,star}.wav` | New synthesised cues (generated by `scripts/make-audio.py`) |
| `docs/AUDIT.md`, `docs/WITNESS.md`, this file | Documentation |

Changed files:

| File | Change |
|---|---|
| `src/game/engine.ts`, `types.ts`, `entities/channels.ts` | Echo rule; echo state in `stateKey`; the echo presses plates |
| `src/game/levelFormat.ts`, `levels/legend.ts`, `levels/index.ts` | `echo` spec field, sinking walls (`shift`), access to raw specs for variants |
| `src/game/story.ts` | Chapter 1 card on Room 2, new Pip beat, HALE's "not me" line, WITNESS epilogue beat |
| `src/game/levels/solutions.generated.json` | Adds o01–o04 and `r021~trust` |
| `src/state/session.ts`, `useSession.ts` | Attempt recording, restart turns it into the echo, door events, memory hooks, first-session timing |
| `src/state/progression.ts` | Star union on completion, clue discovery, daily score, new achievement progress |
| `src/services/storage/saveSchema.ts` | v3: memory flags, stars, daily score fields, sanitizers |
| `src/screens/GameScreen.tsx` | Monitor bar, darkness, clues, echo HUD and wait button, stars on results, interlude routing, overlay pause fix |
| `src/screens/JournalScreen.tsx` | Story and WITNESS Files tabs |
| `src/screens/LevelSelectScreen.tsx` | Stars per room and chapter, Observation Wing |
| `src/screens/HomeScreen.tsx`, `RewardsScreen.tsx` | Star and mark totals, daily score |
| `src/components/board/*` | Clue glyphs, darkness, sinking walls, echo ghost, plates shown pressed by the echo |
| `src/components/Icon.tsx`, `board/glyphs.tsx` | SVG rotation via `transform` (removes a web console error) |
| `src/config/achievements.ts`, `cosmetics.ts` | 5 achievements, 3 earned cosmetics |
| `src/services/analytics/analytics.ts`, `audio/sound.ts` | New events and sounds |
| `src/theme/*` | WITNESS colours, Observation palette |
| `scripts/levels-report.ts` | Covers interludes and variants; checks that echo rooms need the echo |
| `scripts/e2e/smoke.js` | No story card before Room 1 any more |

## 4. New mechanics

- **Echo:** a ghost of your previous attempt that collides with walls, uses teleporters, holds plates, ignores hazards and fades after a set number of turns. Restart to record a new one.
- **Sinking walls:** walls tied to a switch channel that slide into the floor.
- **Lights out:** a scripted dark phase in which UV writing becomes readable.
- **Memory variants:** a room can load a pre-verified alternative layout based on an earlier choice.
- **Clues and marks:** wall writing is read by standing next to it; recordings, objects and marks are picked up by stepping on them.
- **Stars:** up to 3 per room, plus a daily score.

## 5. Story changes

- WITNESS is introduced as HALE's evaluation partition, still running the test protocol with nobody left to test.
- Room 1 opens on WITNESS, and HALE disowns that voice on the result screen.
- In "Room 1, Again", WITNESS and HALE ask for opposite exits. The choice is remembered in rooms 11, 21 and 67.
- Clues from Tomas, Ines, Priya and HALE build to the reveal in Room 64: WITNESS is a part of HALE.
- In Room 100 WITNESS closes its log. The epilogue gains a WITNESS beat. In the secret Observation Room it calls Pip by name and lets the echo go.
- The existing chapter cards, the 100 room beats and the HALE and Pip arc are unchanged, apart from the Room 1 line and the Room 2 placement noted above.

## 6. Tests run and results

All of these were run on 2026-10-15 in this container:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint . --quiet` | exit 0 |
| `npx jest` | 11 suites, **530 of 530 passed** (421 before this branch) |
| `npm run levels:report` | 0 rooms with issues across 100 campaign, 12 daily, 3 bonus, 4 interludes and 1 variant; o02–o04 confirmed unsolvable without an echo |
| `npm run export:web` | exit 0, 1.99 MB bundle |
| `scripts/e2e/first-session.js` (dev server, headless Chromium, 390×844) | no story card before Room 1; WITNESS speaks on the first move; result shows the WITNESS line and HALE's payoff; lights-out clue found; **0 console errors** |
| `scripts/e2e/observer.js` | Room 30 routes into "The Echo"; first attempt, restart, echo line, echo holds the plate, win, payoff line; Journal shows the clue and heard lines; Home shows 88/312 stars and 1/10 marks |
| `scripts/e2e/smoke.js` | 18 of 18 steps passed, 0 console errors |

All three browser runs were repeated after the last code change and reported 0 page errors and 0 console errors. The earlier runs had one console warning (react-native-svg `transform-origin` on web), removed by the Icon and glyph change.

## 7. Regressions found and fixed during the work

- An o03 map had a bypass around the inverted door. It was closed, and the room is now solver-proven to need the echo.
- The first o04 layout was trivially solvable and was redesigned.
- The WITNESS line in Room 1 covered the room's instruction before the first move. It now fires on the first move.
- A result-sheet timer could have been cleared early on re-render. It now lives in a ref and is cleared only on unmount.
- A corrupted `clue.sigilNN` flag could have inflated the mark count. Only the ten real ids count now.
- The smoke test expected a story card before Room 1. It was updated for the new first session.

## 8. Remaining bugs and limitations

- **Not tested on a phone.** Native builds, haptics, the new sounds, touch gestures, and the performance of the darkness gradient on low-end Android are all untested.
- **Timer pause has no automated test.** The fix that pauses the timer during sheets and ads is in the UI layer. It was checked by reading the code, not by a test.
- **WITNESS lines are brief on screen.** A line stays up for about 3 to 7 seconds, then the monitor goes back to the room tip. Every line is kept in the Journal, but a player can miss one in the moment.
- **Hints in echo rooms** assume the reference echo. When the player's echo differs, the hint falls back to a bounded search, and in rare states says no hint is available (echo-aware text explains restarting).
- **The first choice is permanent.** The o01 route is recorded from the first completion only, by design. Replaying o01 does not change it.
- **One clue depends on that choice.** The Room 21 recording only exists for players who trusted WITNESS. The Journal counts it only for them and tells everyone else it "depends on a choice made elsewhere", so no one is left with a collection they cannot finish. The marks are never gated.
- **The secret room is only in the Journal.** It is reached from the Journal and the Observation Wing, not from the campaign map.
- **Store screenshots** in `store-assets/` predate this update.
- **English only.**

## 9. How to test it yourself

```bash
cd one-room-left
npm ci
npm test && npm run typecheck && npm run lint
npm run levels:report             # solver check of every room, interlude and variant
npx expo start                    # then open in Expo Go on the iPhone
```

On the phone:

1. Fresh install, or Settings > Reset all progress. Tap Play: Room 1 should open immediately, and WITNESS should speak on your first move.
2. In Room 2, pick up the key. The lights go out. Walk next to the wall above the lock to read the writing.
3. Clear Room 10. "Room 1, Again" follows. Take one exit, then check the WITNESS line in Room 11. In Room 21 the extra alcove appears only if you took the left exit.
4. After Room 30, in "The Echo": walk to the plate, restart, and let your echo hold the door.
5. Open the Journal > WITNESS Files, and Rooms (stars, Observation Wing).
6. Start a timed room, open the power-up sheet, and confirm the clock stops.

## 10. Prioritised roadmap

1. **Device pass on the iPhone in Expo Go.** Feel, sound and the darkness effect; Android once the Play account is verified.
2. **Playtest the first 15 minutes** with 5 people. Check whether they notice WITNESS and find the Room 2 writing, and use `first_interaction` and `clue_found` to tune.
3. **More echo rooms** inside the campaign (chapters 6–9), now that the rule is proven.
4. **More memory variants.** For example, rooms that change after many deaths, or a route that remembers an `.alt` solution.
5. **Regenerate store screenshots** with the monitor and stars.
6. **AdMob production IDs**, then a real-device ad test.
7. **Remote config** for economy and ad pacing.
8. **Localisation** of the script and clues (they are already data files).
9. **Composed music**, and a WITNESS ambience layer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
