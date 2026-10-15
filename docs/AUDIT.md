# Audit: One Room Left before the "Observer" upgrade

Audited on 15 October 2026 at commit `8a0c205` (main). Baseline: `npx tsc --noEmit` clean, `npx eslint . --quiet` clean, `npx jest` 421 of 421 tests passing.

## What the game actually is

- **Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript 6, Reanimated 4, react-native-svg, zustand, AsyncStorage, react-native-google-mobile-ads 17.2, expo-audio and expo-haptics.
- **Rendering is not 3D.** The board is a grid of absolutely positioned React Native views and SVG glyphs. The "3D-style" look comes from raised walls (a top face and a darker front face), contact shadows, pit shafts and hovering actors. There is no 3D engine, scene graph, camera, lighting model or player controller in the 3D sense. This was the option chosen earlier ("3D-style board") over adopting a 3D engine, and it is kept: it is what makes the game light, fast and testable.
- **Entry point:** `index.ts` loads `App.tsx`. Routing is a small stack in `src/state/useApp.ts` (home, game, levels, rewards, settings, privacy, journal).
- **Rules:** `src/game/engine.ts` is a pure `step(room, state, action)` function. The turn order is: move, then terrain, then clock, then hazards, then win or limit. The UI, the BFS solver (`src/game/solver/solver.ts`) and every test drive this same function.
- **Content:** 100 handcrafted rooms in 10 chapters (`src/game/levels/chapterNN.ts`, ASCII maps), 12 daily rooms and bonus rooms (`src/game/daily/catalog.ts`). Every room is proven solvable by the solver, and CI diffs the stored shortest solutions (`solutions.generated.json`).
- **Session layer:** `src/state/session.ts` holds undo history, checkpoints, revives, the countdown and power-ups.
- **Progression:** `src/state/progression.ts` is pure and covers rewards, unlocks, achievements, daily claims, the ad ledger and interstitial policy.
- **Save:** `src/services/storage/saveSchema.ts` is versioned (v2) with migrations and a field-by-field sanitizer. `saveRepository.ts` keeps a backup and recovers from corruption.
- **Story:** `src/game/story.ts` holds 10 chapter openings, 100 room beats and an epilogue, and the Journal screen archives them.
- **Ads:** `src/services/ads/*`. The real AdMob provider is used in native builds. A labelled simulator runs in development and Expo Go. Rewarded rewards are granted only on the earned callback, with a token de-duplication guard and daily caps.

## 1. What works

- The rules engine is pure, deterministic and fully covered. The solver and the game cannot disagree.
- All 100 rooms are solver-verified. The level report rejects corridor rooms and unfair move or time limits.
- The save system is robust: migrations, a sanitizer, a backup, corruption recovery and tests.
- Rewarded-ad integrity is good: rewards come only from the SDK callback, one result per presentation, duplicate-token protection and daily caps.
- Interstitials follow a conservative policy (none before room 8, then at most one every 4 rooms and 4 minutes, with a cooldown after a rewarded ad and a daily cap).
- Power-ups, the story, the Journal and cosmetics are all in place and tested.
- Performance on device improved after the earlier fixes (memoised glyphs, preloaded sounds, measured board size).

## 2. What is weak or incomplete

| Area | Weakness |
|---|---|
| First 60 seconds | A brand-new player sees a three-beat story card before touching anything. Room 1 is three moves on an empty grid with nothing surprising. There is no hook question. |
| Narrative | The HALE story is told only between rooms (cards and result beats). Nothing happens *inside* rooms, the player's behaviour is never acknowledged, and there is no mystery pulling them forward. |
| Rooms | Every room plays the same way each time. Nothing remembers the player, and there are no environmental changes, set pieces or surprises. |
| Exploration | Hidden coins are the only reason to explore. There are no optional clues and no collection. |
| Mastery | Only a "best moves" number. No stars, no per-room objectives, nothing to come back for. |
| Daily | It pays coins once and has no score; replaying it is pointless. |
| Game feel | Doors opening or closing from a switch or plate have no sound. The result sheet covers the win burst instantly. There are no cues for story moments. |
| Ads (bug) | The countdown keeps running while a rewarded-offer sheet or power-up sheet is open (only the Hint sheet paused it), so in a timed room, thinking about an optional ad costs time. Keyboard input on web can also move the player behind those sheets. |
| Hints | Hints use the solution stored under the room id, so they would be wrong for any future room variant. |
| Tests | No end-to-end measurement of time to first interaction or first completion. |

## 3. Systems that can be extended safely

- **Engine:** new state can be added the way `frozen` was (optional fields, included in `stateKey`), so the solver keeps working. That makes a deterministic Echo possible without breaking purity.
- **Level format:** new tile *looks* (for example a door drawn as a sliding wall) need no rule changes. Whole-room *variants* can be authored as extra maps and solver-verified like any room.
- **Session:** already records hints, undo, deaths and revives per visit, so it can feed a room-memory recorder.
- **Save:** the migration chain makes a v3 with new fields low-risk.
- **Journal:** it is a plain archive screen and can take a second section for clues.
- **Story overlay, toast and Ambient components:** can be reused for in-room transmissions and lighting.

## 4. Highest-impact improvements (in build order)

1. Rework the first session: start room 1 immediately, add an unexplained voice, a small surprise, and a question.
2. Add **WITNESS (the Observer)** as deterministic, scripted in-room transmissions that react to what the player actually did.
3. Add **room memory**: versioned flags in the save, driving messages and solver-verified room variants.
4. Add at least three **environmental twists**: lights failing to reveal a clue, a familiar room rebuilt with shifting walls, and a secret door that depends on an earlier choice.
5. Add a **clue catalog and collection**: optional wall writing, recordings and objects in rooms, plus ten hidden sigils that unlock a cosmetic and a secret room. Archive them in the Journal.
6. Build the **Echo** mechanic: a deterministic replay of the previous attempt that can hold pressure plates, in two short interlude rooms.
7. Add **mastery stars** per room, plus a **daily score**.
8. Polish game feel and fix the ad timer issue.

## 5. Risks

- **Solver and CI:** any rule change (Echo) must stay deterministic and inside `stateKey`, or hints and the solver break. Every new room and variant must be added to the level report and the stored-solution check.
- **Save migration:** v2 to v3 must be additive with safe defaults. Unknown or corrupted memory flags must be dropped without affecting progress.
- **Softlocks:** room variants chosen by memory must each be solvable. Optional clues must never be required. Echo rooms must stay winnable after any attempt (restart always records a fresh echo).
- **Clarity:** darkness and visual twists must never hide a hazard unfairly. Lighting effects stay mild, and every effect respects Reduced motion.
- **Engine purity:** the Observer, clues and lighting are presentation only. Only the Echo touches rules.
- **Expo Go limits:** no native modules can be added. Everything here uses libraries that are already installed.
- **Scope:** content (messages, clues, maps) is handwritten and must be coherent with the existing HALE story rather than random cryptic text.
