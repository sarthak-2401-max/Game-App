# One Room Left

*One room. One mistake. Can you escape?*

A portrait, turn-based escape-room puzzle game for iOS and Android, built with Expo + TypeScript. Each room is a hand-made grid with one way out: keys and locks, switches and plates, spikes, lasers, drones, moving platforms, teleporters, crumbling floors, push-blocks, move limits and real-time countdowns.

- **100 campaign rooms** in 10 chapters, plus 12 rotating daily challenges and 3 bonus-vault rooms. Every room is proven solvable by a solver that drives the real game engine.
- **Progression:** Escape Coins, 22 cosmetics, 14 achievements, a daily streak with a one-day grace period.
- **Monetisation:** optional rewarded ads (revive, hint, double reward, free coins, bonus rooms) and conservative interstitials, through Google AdMob with UMP consent and iOS App Tracking Transparency.
- **Offline-first:** no account, no server. Progress is a versioned local save with migrations, a backup and corruption recovery.

> Status: feature-complete and verified in automated tests and a browser build. It has **not** yet been built natively, run on a phone, or connected to a real AdMob account. See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) and [docs/STORE_CHECKLIST.md](docs/STORE_CHECKLIST.md).

## Quick start

```bash
npm install
npm test               # 409 tests: engine, all 115 rooms solvable, economy, ads, saves
npm run typecheck
npm run lint
npm run web            # play in a browser (no ads on web)
```

Ads, consent and haptics need native code, so on a phone use a **development build**, not Expo Go:

```bash
npx eas-cli@latest build --profile development --platform android   # or ios
npx expo start --dev-client
```

In Expo Go the game runs with the labelled **ad simulator** ("SIMULATED AD · DEVELOPMENT ONLY") in place of AdMob. See [docs/BUILD.md](docs/BUILD.md).

## Scripts

| Script | What it does |
|---|---|
| `npm test` | Jest (jest-expo) test suites in `__tests__/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` (eslint-config-expo) |
| `npm run levels:report` | Solves and analyses every room; writes `src/game/levels/solutions.generated.json` and `docs/LEVEL_REPORT.md` |
| `npm run levels:room -- 42 --steps` | ASCII view of one room and its solution, step by step |
| `npm run forge` | Level-design assistant (hill-climbs layout variants toward harder rooms) |
| `npm run assets:icons` / `assets:audio` | Regenerate the original icon and sound assets (Python + Pillow) |
| `npm run export:web` | Static web build into `dist/` |

## Project layout

```
App.tsx                      root: providers, router, error boundary, toasts, ad simulator host
app.config.ts / eas.json     Expo + EAS config; all account-specific values come from env vars
src/game/                    pure, deterministic rules (no React)
  engine.ts                  the turn: move, terrain, clock, hazards, win/lose
  entities/                  timing, routes, channels, hazards, lasers
  levelFormat.ts             ASCII room format + legend
  levels/chapter01..10.ts    the 100 rooms
  daily/                     daily pool, bonus rooms, deterministic daily selection
  solver/ validator.ts       BFS solver, structural + solvability validation
  hints.ts                   "next 3 moves" hint
src/state/                   progression (pure), session (pure), zustand stores
src/services/                ads (AdMob, simulator, consent), storage, analytics, audio, haptics
src/components/ screens/     UI (board renderer in components/board)
src/config/                  economy, ad policy, cosmetics, achievements, app placeholders
scripts/                     level report, room viewer, forge, asset generators
docs/                        build, ads, privacy, accounts, assets, tests, checklists
site/                        landing page + privacy policy (GitHub Pages)
store-assets/                framed store screenshots, feature graphic, icons
.github/workflows/           CI, EAS build/submit, Pages
```

Navigation is a small stack in the zustand app store (`src/state/useApp.ts`) rather than Expo Router: the game has six screens, no deep links and one modal-heavy gameplay screen, so a file-based router added weight without benefit. Swapping it in later is straightforward.

## Documentation

- **[PUBLISHING.md](docs/PUBLISHING.md): step-by-step path to the App Store and Google Play**
- [STORE_LISTING.md](docs/STORE_LISTING.md): store copy, screenshot sizes, questionnaire answers (assets in `store-assets/`)
- [BUILD.md](docs/BUILD.md): environments, EAS profiles, environment variables, identifiers
- [ADS.md](docs/ADS.md): AdMob setup, placements, reward integrity, frequency rules
- [PRIVACY.md](docs/PRIVACY.md): consent flow, data inventory, privacy policy template, store privacy forms
- [ACCOUNTS.md](docs/ACCOUNTS.md): accounts and information you need to supply
- [ASSETS.md](docs/ASSETS.md): provenance of every asset
- [ANALYTICS.md](docs/ANALYTICS.md): event list and how to plug in a provider
- [LEVEL_DESIGN.md](docs/LEVEL_DESIGN.md) and [LEVEL_REPORT.md](docs/LEVEL_REPORT.md): room format, tooling, per-room stats
- [TEST_RESULTS.md](docs/TEST_RESULTS.md): what was executed and the results
- [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md), [STORE_CHECKLIST.md](docs/STORE_CHECKLIST.md), [ROADMAP.md](docs/ROADMAP.md)

## License

No license file is included. Choose one before publishing the source.
