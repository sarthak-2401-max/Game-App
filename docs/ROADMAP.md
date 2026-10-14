# Roadmap

Suggested next steps, roughly in order.

1. **Device pass.** Development builds on one iPhone and one mid-range Android; work through STORE_CHECKLIST.md "Device QA".
2. **Playtest the curve.** Five to ten players through chapters 1–4; use `level_failed` causes and attempts to rebalance rooms that spike.
3. **Crash reporting** (e.g. Sentry) gated on consent, with the privacy docs updated.
4. **Remote config** for `ECONOMY` and `INTERSTITIAL_POLICY` so ad frequency and rewards can be tuned without a release.
5. **More daily rooms.** Grow the pool from 12 with the forge workflow, or generate seeded variations validated by the solver at build time.
6. **Server time for dailies** to close the forward-clock loophole; optional cloud save (the `KeyValueStore` interface is the seam).
7. **Localisation** (string extraction; layouts already wrap).
8. **Composed music and richer SFX**, with a separate music volume slider.
9. **Level editor** in a dev build, saving ASCII specs that run straight through the validator.
10. **AdMob SSV** if rewards ever carry real value; mediation once traffic justifies it.
