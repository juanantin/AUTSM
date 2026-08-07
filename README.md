# AUTSM // Automated TSM Accumulation Protocol

Single-page site for **$AUTSM**, styled as a 1987 CRT computer terminal —
black ground, phosphor-green monochrome UI, scanlines, thin green rules,
pixel-art iconography.

```
You buy AUTSM.
100% of creator fees are used to buy TSM and send to holders.
```

## Running it

It's a static page with zero dependencies and zero external requests —
open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Whole page — status bar, hero, mechanism cards, dashboard, footer |
| `styles.css` | Terminal theme, CRT overlays, responsive grid |
| `script.js` | Rotating status line, distribution countdown, copy-address |
| `assets/` | Logo, favicons, and the looping hero video |

## Sections

- **Status bar** — protocol version and connection readout
- **Hero** — pixel headline, the fee mechanic, `BUY AUTSM NOW >_`
- **Terminal window** — looping AUTSM graphic plus `// PROTOCOL STATUS`
- **Mechanism** — four cards: `01` buy → `02` fees → `03` buy TSM → `04` holders
- **Dashboard** — `// PROTOCOL STATS` and `// LATEST TRANSACTIONS`
- **Footer** — logo, socials, contract address, `AUDIT: VERIFIED`

## Placeholder content

These are **example values**, not live data. Wire them to a real source
before launch:

- Every figure in `// PROTOCOL STATS` (fees, TSM acquired/distributed, holders)
- Every row in `// LATEST TRANSACTIONS` — labelled *EXAMPLE DATA* on the page
- The countdown in `script.js`, which just loops a 15-minute timer
- The contract address in the footer (`data-copy` on the `.copy` button)
- Social links in the footer, all currently `href="#"`
- `BUY AUTSM NOW` and the header `BUY AUTSM` button, which point at `#protocol`

## Assets

The logo and hero animation were supplied by the project owner. The hero
video ships as H.264/MP4 (audio stripped, `moov` atom moved to the front for
fast start) with `assets/autsm-poster.jpg` as the still fallback if autoplay
is blocked. Favicons are generated from the logo at 32px, 180px and 512px
plus a multi-size `.ico`.

## Notes

- No web fonts, no CDN, no analytics — everything is local
- `prefers-reduced-motion` disables the blink, pulse and scanline animations
- Responsive at 940px (cards → 2-up, panels stack) and 560px (cards → 1-up)
