# Store listing copy

Ready to paste. Character counts are checked against each store's limits.

## Shared

- **App name** (30): `One Room Left` (13)
- **Category:** Games → Puzzle (secondary: Strategy)
- **Price:** Free, contains ads, no in-app purchases
- **Support / marketing URL:** your GitHub Pages site (see `site/`) or repo URL
- **Privacy policy URL:** `https://sarthak-2401-max.github.io/privacy.html` once the sarthak-2401-max.github.io repo exists

## App Store (iOS)

- **Subtitle** (30): `Escape-room logic puzzles` (25)
- **Promotional text** (170): `100 hand-built rooms, one way out of each. Dodge lasers, outwit patrol drones and beat the clock. Every room is solvable — if you plan it right.` (144)
- **Keywords** (100, comma-separated, no spaces): `escape,room,puzzle,logic,brain,maze,sokoban,offline,strategy,grid,trap,key,laser,daily,challenge` (96)

## Google Play

- **Short description** (80): `100 hand-built escape rooms. Plan every step. One mistake and you start over.` (77)

## Full description (both stores, < 4000)

```
One room. One mistake. Can you escape?

One Room Left is a turn-based escape-room puzzle game. Every room is a small, hand-built trap with exactly one goal: reach the exit. Every move matters — step on the wrong tile, walk into a laser's path or meet a patrol drone, and it's over.

100 ROOMS, 10 CHAPTERS
Start with the basics, then meet a new twist in every chapter: keys and locks, switches and pressure plates, spikes and lasers, push-blocks and chasms, countdown timers, drones and moving platforms, teleporters and crumbling floors — and finally rooms that combine them all.

THINK, DON'T RUSH
The rules never change and nothing is random. Hazards move in fixed rhythms you can read and plan around. Undo a step, restart, or pick up from a checkpoint. Every single room has been proven solvable.

DAILY CHALLENGE
A fresh room every day. Keep your streak going for bonus coins — miss a day and your streak is safe.

UNLOCK YOUR STYLE
Earn Escape Coins and spend them on characters, trails, room themes, exit styles and victory effects. Earn exclusive looks through achievements.

PLAY YOUR WAY
• Plays fully offline
• Swipe, tap or on-screen arrows
• Reduce-motion and haptics settings
• Hazards use shapes as well as colours
• Short rooms, perfect for a quick break

Optional ads let you revive, get a hint or double your reward. You never have to watch one to finish a room.
```

## What's new (first release)

`Welcome to One Room Left! 100 rooms, a daily challenge and plenty of ways to fall into a pit.`

## Screenshots

Framed screenshots are in `store-assets/`:

| Store slot | Folder | Size |
|---|---|---|
| App Store iPhone 6.9" (also accepted for 6.5") | `store-assets/ios-6.9in/` | 1290 × 2796 |
| Google Play phone | `store-assets/android-phone/` | 1080 × 2160 |
| Google Play feature graphic | `store-assets/play-feature-graphic.png` | 1024 × 500 |
| Google Play icon | `store-assets/play-icon-512.png` | 512 × 512 |
| App Store icon | generated from `assets/icon.png` by EAS | 1024 × 1024 |

They were captured from the web build of the same React Native screens (`scripts/store/capture.js`, `scripts/store/compose.py`). Before submission, compare them with the device build: both stores require screenshots to show the actual app, and fonts render slightly differently on iOS/Android.

## Questionnaire answers (suggested)

- **Age rating:** no violence beyond cartoon "you fell into a pit", no user content, no gambling. Ads are limited to rating PG in code. Expect 4+ (Apple) and Everyone / PEGI 3 (IARC), subject to the ads served.
- **Ads:** Yes. **In-app purchases:** No. **Account required:** No.
- **Target audience (Play):** 13+ — do **not** select under-13 age groups unless you reconfigure ads for families (see PRIVACY.md).
- **Data safety / App Privacy:** see PRIVACY.md.
