# Assets

Every asset in this repository was created for this project. No third-party art, music, fonts or sound packs are included.

| Asset | Origin | Regenerate |
|---|---|---|
| App icon, adaptive icon layers (foreground, background, monochrome), splash mark, favicon | Drawn procedurally by `scripts/make-icons.py` (Pillow) | `npm run assets:icons` |
| Sound effects (move, bump, push, switch, door, coin, key, core, warning, teleport, crumble, fail, win, unlock, tap) and the ambient music loop, `assets/audio/*.wav` | Synthesised from sine/noise envelopes by `scripts/make-audio.py` | `npm run assets:audio` |
| In-game art (tiles, player, hazards, icons) | Vector shapes drawn in code with react-native-svg (`src/components/board/glyphs.tsx`, `src/components/Icon.tsx`) | Edit the components |
| Fonts | Platform system fonts | — |

## Accessibility of visuals

Gameplay-critical colours (cyan accent, amber interactables, red danger) are fixed and not themable. Every hazard also has a distinct shape, channel elements carry pip marks in addition to colour, and timed hazards show a warning state the turn before they activate.

## Store assets still needed

Screenshots for each required device size, a Google Play feature graphic (1024×500) and optional preview video. The in-game look at 390×844 can be captured from the web build (`npm run web`) as a starting point, but stores require captures from the real app.
