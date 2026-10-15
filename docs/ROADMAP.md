# Roadmap

Suggested next steps, in priority order. See [UPGRADE_REPORT.md](UPGRADE_REPORT.md) for what the Observer update already shipped.

1. **Device pass.** Expo Go on the iPhone now (feel, sound, the darkness effect, monitor readability); a development build on a mid-range Android once the Play account is verified. Work through STORE_CHECKLIST.md "Device QA".
2. **Playtest the first 15 minutes** with five to ten people. Do they notice WITNESS, find the Room 2 writing, try both o01 exits? Use `first_interaction`, `first_completion`, `clue_found` and `level_failed` to tune.
3. **Echo rooms inside the campaign** (chapters 6–9), now that the rule is solver-proven.
4. **More memory variants:** rooms that soften after many deaths, or change after an `.alt` route.
5. **Store screenshots** regenerated with the monitor, stars and an Echo room.
6. **AdMob production ids**, then a real-device ad test.
7. **Crash reporting** gated on consent, with the privacy docs updated.
8. **Remote config** for `ECONOMY` and `INTERSTITIAL_POLICY`.
9. **Server time for dailies** and optional cloud save (the `KeyValueStore` interface is the seam).
10. **Localisation:** the WITNESS script and clues are already data files.
11. **Composed music** and a WITNESS ambience layer.
