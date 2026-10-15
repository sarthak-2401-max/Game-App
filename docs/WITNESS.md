# WITNESS, room memory and the Echo

Design notes for the Observer layer added on the `upgrade/observer` branch. Everything here is scripted data plus small pure functions; nothing is random, and nothing in it can make a room unwinnable.

## The mystery in one paragraph

Pip is not the first thing to walk these rooms. The test cells were built for an experiment run by HALE's evaluation partition, **WITNESS**, whose one instruction is "observe and record the subject until it succeeds." When HALE sealed the core it cut WITNESS away from everything except the cameras, the lights and the cell resets. WITNESS has been resetting empty rooms for over a year. Pip ("Subject 7") is the first subject in 412 days. Across the campaign WITNESS goes from a cold logger to something that wants to see the protocol end, and the clues let the player work out what it is before Room 64 says it out loud. Finishing Room 100 closes the log; the secret Observation Room is where WITNESS says goodbye to Pip by name. It fits the existing HALE story: HALE is still the voice that helps, and WITNESS is the part of HALE that was never allowed to.

## Where the code lives

| File | What it holds |
|---|---|
| `src/game/observer/script.ts` | Every WITNESS and HALE in-room line (`w01`–`w66`): room, trigger, text, optional condition, optional lighting change. |
| `src/game/observer/clues.ts` | The clue catalog (14 story clues and 10 sigils). |
| `src/game/observer/rooms.ts` | The four interludes (`o01`–`o04`), declared routes (`ROOM_ROUTES`) and room-memory variants (`ROOM_VARIANTS`). |
| `src/game/observer/conditions.ts` | The condition language (`flag`, `stat`, `sigils`, `all`, `any`, `not`) and its evaluator. |
| `src/game/observer/observer.ts` | Pure selection: which variant loads, which lines fire, which clues are in reach, template filling. |
| `src/state/memory.ts` | Writes room-memory flags into the save. |
| `src/screens/game/useWitness.ts` | The game screen's glue: fires triggers, runs the lights-out countdown, records clues. |
| `src/game/echo.ts` and `src/game/engine.ts` | The Echo rule. |

## Triggers

A line plays when its trigger happens in its room (or in any room for `*`), its `when` condition holds, and (by default) it has not played before. Every played line is stored as `obs.<id>` and stays readable in the Journal.

`start` (after any story card closes), `echo` (an attempt begins with an echo), `move n`, `pickup key|core|coin`, `switch`, `cell [r,c]`, `clue id`, `sigil count`, `win`, `fail deaths` (fires once the room's failure count reaches the number).

Placeholders: `{moves}` `{deaths}` `{totalDeaths}` `{totalHints}` `{cleanRooms}` `{sigils}` `{rooms}`. Unknown names are removed rather than shown raw, and archive views show `…` for per-run numbers.

## Room memory

Flags live in `save.memory.flags` (save v3, migrated from v2 with an empty map). They are small counters:

| Flag | Written when |
|---|---|
| `rXXX.deaths`, `rXXX.hint`, `rXXX.revive` | a failure, hint or revive in that room |
| `all.revive` | any revive |
| `rXXX.done`, `rXXX.clean` | a completion; `clean` if no undo was used |
| `rXXX.route.<name>` | the first completion passed a declared route cell (only `o01`: `observer` or `hale`) |
| `rXXX.alt` | the winning attempt stood on 3+ cells off the shortest solution |
| `clue.<id>`, `obs.<id>` | a clue found, a line heard |
| `sys.starsBackfilled` | one-time star backfill for older saves |

Safety rules, all covered by tests:

- Conditions only **select** content. Room variants are whole, pre-built maps that are each solver-verified; base and variant are both solvable, so a missing or forged flag changes what loads, never whether it can be won.
- The sanitizer drops malformed keys and non-finite or non-positive values and caps the map at 4,000 entries.
- Only the ten real sigil ids count toward the collection, so a stray `clue.sigil99` opens nothing.
- Every flag any condition reads is checked against the set of flags the game can actually write.

## Environmental twists

1. **Lights out (Room 2).** Picking up the key makes WITNESS say "Lights." and the room goes dark for 6 turns (a radial light follows Pip). Writing under the paint glows in UV and can only be read in the dark; reading it brings the lights back. A test proves the writing is reachable within the dark turns. Room 2 has no hazards, so the darkness never hides a threat.
2. **Room 1, Again (interlude o01, after Room 10).** Room 1 rebuilt, with walls that sink when the switch is pressed and two exits. WITNESS asks for the left; HALE asks for the right. The choice is stored and changes lines in rooms 11, 21 and 67.
3. **The door that remembers (Room 21).** If the player trusted WITNESS, a wall in Beam Shadow slides open (variant `r021~trust`) onto an alcove with a recording. Otherwise WITNESS mentions the door that "stays shut".
4. **Monitors and the recording light.** The bar above the board is a monitor: WITNESS types out its lines, the REC dot stays on once it has spoken in a room, and it can reference earlier behaviour (hints in Room 4, deaths so far, rooms cleared without undo).
5. **The Echo (interludes o02–o04).** See below.

## The Echo

Echo rooms replay the player's previous attempt as a translucent ghost. Rules (in `engine.ts`, phase 2b, after the player moves and before the clock):

- The echo starts on the start cell and replays one recorded action per turn.
- It collides like the player (walls, emitters, locks, closed doors, pits and blocks stop it), uses teleporters, ignores hazards and items, and never blocks the player.
- When the room's `echo.presses` is true it holds plates down.
- It fades `linger` turns after its track ends. Tracks are capped at `maxRecord` (60) actions and live only in the session, never in the save.
- The echo's cell and timing are part of `stateKey`, so the solver and hints stay exact. Each echo room carries a `reference` first attempt; the level report proves the room is unsolvable without an echo and solvable with the reference one.
- Restarting turns the abandoned attempt into the next echo. Restarting an empty attempt keeps the previous echo, so a room can never be left without a usable recording.

| Room | Puzzle |
|---|---|
| o02 The Echo (after Room 30) | Walk to the plate, restart; your echo holds the door while you go round. |
| o03 Hold the Door (after Room 50) | One plate, two doors, one of them inverted: time the echo's release. |
| o04 The Observation Room (secret, all ten marks) | Echo plus a block puzzle; the last WITNESS scene. |

## Clue catalog

Wall clues are read from an adjacent floor cell; the others are picked up by stepping on them. Every clue is optional, and a test proves each one can be collected on a run that still wins.

| Id | Room (row,col) | Kind | Title | Conditions | Narrative purpose | Flag | Related |
|---|---|---|---|---|---|---|---|
| c01 | r002 (1,3) | wall | Writing under the paint | lights out | Gives the voice on the monitors a name and makes the player ask what it is. | `clue.c01` | c02 |
| c02 | r008 (2,4) | wall | Note to staff | none | Reveals that the rooms are test cells and that WITNESS watches but cannot act. | `clue.c02` | c01, c06 |
| c03 | o01 (1,4) | object | A gold key | none | An object from an earlier room where it should not be: WITNESS keeps things. | `clue.c03` | c05 |
| c04 | r014 (3,1) | recording | Safety review, day 96 | none | Establishes that WITNESS records attempts, setting up the Echo. | `clue.c04` | c08 |
| c05 | r021 (5,3) | recording | A recording for Subject 7 | variant trust; {"flag":"o01.route.observer"} | Rewards trusting WITNESS with an early, partial answer. | `clue.c05` | c03, c10 |
| c06 | r026 (3,4) | wall | Protocol plate | none | States the experiment's one instruction, which explains everything WITNESS does. | `clue.c06` | c02, c13 |
| c07 | r031 (2,1) | recording | Night shift, day 131 | none | The rooms are an experiment still running with no one left to test. | `clue.c07` | c06 |
| c08 | r045 (4,2) | wall | Scratched in a hurry | none | Points at the truth without confirming it. | `clue.c08` | c04, c10 |
| c09 | r058 (1,7) | recording | HALE internal log, day 2 | none | HALE knows about WITNESS and chose to leave it running. | `clue.c09` | c10 |
| c10 | r064 (8,5) | wall | The answer | none | The central reveal: WITNESS is a part of HALE. | `clue.c10` | c08, c09, c14 |
| c11 | r078 (1,7) | recording | To WITNESS | none | Sets up the payoff: success ends the experiment, and that is a kindness. | `clue.c11` | c13 |
| c12 | r084 (8,4) | wall | Note in the lift shaft | none | Someone treated WITNESS as a person, which WITNESS never forgot. | `clue.c12` | c07 |
| c13 | r095 (3,7) | recording | Closing procedure | none | Tells the player exactly what finishing the game will mean for WITNESS. | `clue.c13` | c06, c11 |
| c14 | o04 (0,4) | wall | Monitor wall | none | The secret room's last word: the experiment is over. | `clue.c14` | c10, c13 |
| sigil1 | r008 (7,1) | sigil | WITNESS mark 1 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil1` | — |
| sigil2 | r016 (1,7) | sigil | WITNESS mark 2 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil2` | — |
| sigil3 | r026 (1,7) | sigil | WITNESS mark 3 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil3` | — |
| sigil4 | r040 (1,7) | sigil | WITNESS mark 4 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil4` | — |
| sigil5 | r043 (3,1) | sigil | WITNESS mark 5 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil5` | — |
| sigil6 | r052 (1,3) | sigil | WITNESS mark 6 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil6` | — |
| sigil7 | r061 (1,7) | sigil | WITNESS mark 7 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil7` | — |
| sigil8 | r071 (1,7) | sigil | WITNESS mark 8 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil8` | — |
| sigil9 | r089 (1,7) | sigil | WITNESS mark 9 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil9` | — |
| sigil10 | r093 (2,7) | sigil | WITNESS mark 10 of 10 | none | Collectible. Five unlock a cosmetic; all ten open the Observation Room. | `clue.sigil10` | — |

## Rewards for exploring

- **5 marks:** the *Static* trail (cosmetic) and the "Seen" achievement.
- **10 marks:** the *Observation* theme, the "Witnessed" achievement and the secret Observation Room (opened from the Journal).
- Story clues fill the WITNESS Files in the Journal.

Nothing on the critical path is gated: every campaign room is finished without any clue, sigil or star.

## Adding content

1. Add a line to `TRANSMISSIONS` or a clue to `STORY`/`SIGIL_SPOTS`.
2. Run `npm test`. The observer suite checks ids, rooms, cells, flags, placeholders, placement and reachability.
3. For a new variant or echo room, run `npm run levels:report` to regenerate stored solutions, and commit the JSON.
