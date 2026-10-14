# Level design

## Format

Rooms are ASCII maps in `src/game/levels/chapterNN.ts`, parsed by `src/game/levelFormat.ts`:

```ts
{
  name: 'Hold the Door',
  map: [
    '#########',
    '#P._..dE#',
    '#########',
  ],
  legend: { d: door(0) },   // optional overrides, builders in levels/legend.ts
  moveLimit: 12,            // optional
  timeLimit: 40,            // optional, seconds of real time
  intro: 'Shown as a banner when the room opens.',
  hint: 'Free hint text.',
}
```

Default legend: `#` wall, `.` floor, `P` start, `E` exit, `*` core (must collect all to open the exit), `$` coin, `?` hidden coin, `^` spikes, `!`/`i` alternating spikes, `~` pit, `%` crumbling floor, `B` block, `C` checkpoint, `k`/`L` gold key/lock, `j`/`J` blue key/lock, `s` switch, `_` plate, `d` door, `x` inverted door, `w` spikes that retract while channel 0 is on, `T`/`U` teleporter pairs, `> < v A` laser emitters. Drones and platforms use `drone('RRDD', 'loop')` / `platform('RR')` with a path from their start cell.

## Rules of the turn

The engine is deterministic and turn-based: hazards (drones, platforms, timed traps) are pure functions of the turn counter, so a room plays the same every time. The real-time countdown is separate and only exists in rooms with `timeLimit`. Order inside one turn: move (and push/unlock) → terrain (crumble, teleport, switch, pickups) → clock advances and platforms carry → drone, fall, spike and laser checks → win, then move limit.

## Tooling

- `npm run levels:room -- 37 --steps` prints a room and walks through its shortest solution.
- `npm run levels:report` solves every room, checks structure, move limits, timer fairness (limit ≥ ⌈0.9 s × shortest + 6 s⌉) and that every coin can be collected on a winning run, then writes `solutions.generated.json` (used for hints and the "Shortest Path" achievement) and `LEVEL_REPORT.md` with difficulty statistics (dead-end states, critical turns).
- `npm run forge` takes a template with variable cells and hill-climbs toward layouts with longer solutions and more dead ends. Its output is a starting point; every forge room in the campaign was then edited by hand and re-verified.
- The test suite re-runs the solver on all 115 rooms, so a broken room fails CI.

## Workflow for a new room

1. Sketch it in the chapter file. Keep to 9 columns and 12 rows for phone readability.
2. `npm run levels:room -- <n> --steps` until it plays the way you intend.
3. `npm run levels:report -- --from <n> --to <n>`; fix any issue it reports.
4. Run the full report before committing so `solutions.generated.json` stays in sync, then `npm test`.
