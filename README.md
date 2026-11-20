[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Riaking89/gta6-cover-art-ria/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Riaking89/gta6-cover-art-ria/reward.svg)](https://make.fun/c/gta6-cover-art-01)

# Vice Cover Studio — GTA-style cover maker

An offline static web app that turns your own photos + a caption into a
Vice City–style multi-panel cover poster. Pick a layout, drop photos into
panels, pan and zoom each one, choose a sunset/neon grade, then export a PNG.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every script, font and sample photo is a
file under `app/`, and photos you upload are read on your machine only.

## Features

- **4 layouts**: Poster (hero + 3 panels), Grid 2×2, Strip (3 vertical panels), Hero (one large photo + caption band).
- **Any photo**: upload up to 6 photos locally; click a photo, then click a panel to place it. Drag a panel to pan, scroll to zoom; zoom / pan sliders per panel.
- **Vice City grade**: Sunset (default), Neon Night, Vice Gold, Mono Noir — warm colour wash, vignette, halftone dots and seeded film grain (deterministic exports: same input, same PNG).
- **Bold caption**: Anton display type with gradient fill and thick dark outline, subtitle bar, original corner badges ("EST. 2026", "LEONIDA").
- **Export PNG**: 1080×1080, 1080×1350 and 1920×1080, rendered offscreen at exact size.

## Originality

No Rockstar logos, wordmarks, artwork, characters or fonts are used anywhere.
The title font is Anton (SIL Open Font License 1.1, see `app/fonts/OFL.txt`).
Sample photos: `boulevard.jpg` and `pier.jpg` were made with an image model
for make.fun and are free to use; `beach.jpg` and `skyline.jpg` are original
images generated locally with Python PIL for this entry. All code in
`app/src/` and the styles were written for this entry.
