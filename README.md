# AUTSM // Automated TSM Protocol

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
| `index.html` | Whole page — header, hero, mechanism cards, dashboard, footer |
| `styles.css` | Terminal theme, CRT overlays, responsive grid |
| `script.js` | Rotating status line, copy-address |
| `assets/` | Logo, favicons, and the looping hero video |

## Sections

- **Hero** — pixel headline, the fee mechanic, `BUY AUTSM NOW >_` (links
  straight to the Uniswap swap for $AUTSM on Robinhood Chain)
- **Terminal window** — looping AUTSM graphic plus `// PROTOCOL STATUS`
- **Mechanism** — four cards: `01` buy → `02` fees → `03` buy TSM → `04` holders
- **Dashboard** — `// PROTOCOL STATS` and `// LATEST TRANSACTIONS`
- **Footer** — logo, socials, contract address, `AUDIT: VERIFIED`

## Placeholder content

`// PROTOCOL STATS` and `// LATEST TRANSACTIONS` are zeroed out — no fake
numbers, no fabricated transaction rows — since nothing is live yet. Wire
these to a real source before launch:

- `HOLDERS` is live — `script.js` fetches it client-side from Robinhood
  Chain's public Blockscout API
  (`robinhoodchain.blockscout.com/api/v2/tokens/<address>`) on page load
  and falls back to the static `0` if the request fails or the response
  shape differs from what's assumed (`holders_count` / `holders` /
  `holder_count`, checked in that order). This call runs in the visitor's
  browser, so it's unaffected by any server-side network restrictions —
  but it's also unverified against the live endpoint (this environment
  can't reach it either), so check the browser console after deploying.
- The other four figures in `// PROTOCOL STATS` — fees collected, TSM
  acquired, TSM distributed, and `NEXT DISTRIBUTION` (currently
  `PENDING`) — are protocol-specific accounting a generic explorer can't
  answer. Wiring these up needs one of:
  - **A subgraph/indexer** that already tracks these totals, if AUTSM
    has one
  - **The contract's ABI**, if it exposes view functions for them — if
    the contract is verified on Blockscout, the ABI is on its contract
    page there
  - **The API behind theindex.finance's coin page** — that page already
    computes exactly these numbers, so its network requests (DevTools →
    Network → XHR/Fetch, on page load) likely point at the fastest path
    to a live-wired dashboard

  There's no countdown-ticking logic in `script.js` for `NEXT
  DISTRIBUTION` — that was removed when the dashboard was reset, since it
  was counting down against fabricated data. It comes back once there's a
  real distribution time to count down to. The `VIEW DISTRIBUTION` link
  below the stats is already real, pointing at the AUTSM coin page on
  theindex.finance.
- `// LATEST TRANSACTIONS`, which shows a `NO TRANSACTIONS YET` empty
  state (`.tx__empty` in `styles.css`). Replace the single `<li
  class="tx__empty">` with real rows once transactions exist — each row is
  `<li><span class="tx__hash">…</span><span class="tx__kind">…</span><span
  class="tx__amt">…</span></li>`
- The Telegram button, commented out in `index.html` next to the X link.
  Uncomment it and set `href` to the invite link to bring it back; the X
  link is live and the chart icon needs no layout change either way

The contract address (footer `.copy` button), both `BUY AUTSM` buttons,
and the chart button are already wired to the real token —
`0x7f252feed0bcb6db7c40faf320a02ebd2cd3aee8` on Robinhood Chain, swap link
via Uniswap, chart via the DEX Screener pair page. Update all four
together if the token address or pair ever changes.

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
