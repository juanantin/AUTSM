# AUTSM // Automated TSM Protocol

Single-page site for **$AUTSM**, styled as a 1987 CRT computer terminal —
black ground, phosphor-green monochrome UI, scanlines, thin green rules,
pixel-art iconography.

```
You buy AUTSM.
100% of creator fees are used to buy TSM and send to holders.
```

## Running it

The page itself is static, zero dependencies — open `index.html` directly,
or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

That's enough for everything except five dashboard fields. `api/treasury.js`
and `api/dexscreener.js` are Vercel serverless functions, and a plain file
server has no way to run them — `/api/treasury` and `/api/dexscreener` just
404, so `MARKET CAP`, `24H VOLUME`, `TOTAL FEES COLLECTED`, `TOTAL TSM
DISTRIBUTED`, and `// LATEST TRANSACTIONS` fall back to their static values
locally (same as any other fetch failure — nothing breaks, they're just
not live). To exercise the real proxies locally, use the Vercel CLI instead:

```bash
vercel dev
```

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | Whole page — header, hero, mechanism cards, dashboard, footer |
| `styles.css` | Terminal theme, CRT overlays, responsive grid |
| `script.js` | Rotating status line, copy-address, live dashboard data |
| `api/treasury.js` | Vercel serverless function — proxies theindex.finance's indexer server-side to route around its CORS restriction |
| `api/dexscreener.js` | Vercel serverless function — proxies DEX Screener's pairs API for market cap / 24h volume |
| `assets/` | Logo, favicons, and the looping hero video |

## Sections

- **Hero** — pixel headline, the fee mechanic, `BUY AUTSM NOW >_` (links
  straight to the Uniswap swap for $AUTSM on Robinhood Chain)
- **Terminal window** — looping AUTSM graphic plus `// PROTOCOL STATUS`
- **Mechanism** — four cards: `01` buy → `02` fees → `03` buy TSM → `04` holders
- **Dashboard** — `// PROTOCOL STATS` and `// LATEST TRANSACTIONS`, live —
  see [Dashboard data](#dashboard-data) below
- **Footer** — logo, socials, contract address, `AUDIT: VERIFIED`

## Dashboard data

`// PROTOCOL STATS` and `// LATEST TRANSACTIONS` are wired to live sources
in `script.js`, fetched client-side on page load. Every call is wrapped so
a failure — network, CORS, an unexpected response shape — leaves the
element at its static HTML fallback rather than breaking the page. None of
it is verified against the live endpoints from the environment this was
built in (both are network-restricted there); check the browser console
after deploying to confirm.

**Live:**

- `HOLDERS` — Robinhood Chain's public Blockscout API,
  `robinhoodchain.blockscout.com/api/v2/tokens/<AUTSM address>`. Checks
  three plausible field names (`holders_count` / `holders` /
  `holder_count`) since the exact response shape is unverified.
- `MARKET CAP` and `24H VOLUME` — DEX Screener's public pairs API for the
  AUTSM/Robinhood pair. `MARKET CAP` reads `marketCap`, falling back to
  `fdv` (fully diluted valuation) if a true circulating-supply figure
  isn't available — DEX Screener's own UI does the same for young tokens.
  `24H VOLUME` reads `volume.h24`. Both are already USD floats from the
  API, not raw on-chain amounts, so no decimal-scaling concern here.

  DEX Screener's API is built for exactly this kind of external use and
  a CORS block would be surprising — but this build environment couldn't
  reach `api.dexscreener.com` either, so there was no way to confirm it
  wouldn't hit the same wall as the indexer. Proxied through
  `api/dexscreener.js` regardless, both to remove that uncertainty and
  because it comes with edge caching for free (`s-maxage=30`).
- `TOTAL FEES COLLECTED` and `TOTAL TSM DISTRIBUTED` — theindex.finance's
  public indexer (a Ponder-style GraphQL endpoint, no auth required),
  queried for AUTSM's **treasury** contract —
  `0x374f567ea050fde8ec9a5202e4fe30d62f2be4ee`, distinct from the AUTSM
  **token** contract. The treasury collects fees and buys TSM; the token
  is what trades. `TOTAL FEES COLLECTED` reads the treasury's `harvested`
  field (ETH); `TOTAL TSM DISTRIBUTED` reads `treasuryAssets`' `totalPot`
  for the TSM address found in the treasury's `basket` field — reconciled
  against a captured response before wiring: summing the individual
  `harvests` and `rounds` entries lands on `harvested` and `totalPot`
  exactly, to the last wei.

  Worth knowing if this ever needs revisiting: `totalPot` is TSM the
  treasury has *pooled* from fees, not a confirmed count of TSM that has
  reached individual holder wallets — there was originally a separate
  `TOTAL TSM ACQUIRED` row for that reason. Showing this figure under
  DISTRIBUTED instead is a deliberate relabel, not a new data source.

  This one doesn't call theindex.finance directly from the browser — its
  indexer endpoint rejects cross-origin `POST` requests at the CORS
  preflight stage (a plain `GET`, like the Blockscout calls above, never
  triggers that check, which is why holders worked immediately and this
  didn't). `api/treasury.js` is a small Vercel serverless function that
  runs the same query server-to-server, where CORS doesn't apply, and
  `script.js` fetches `/api/treasury` on our own domain instead. Response
  is edge-cached for 60s (`s-maxage`) so concurrent visitors don't each
  trigger a fresh upstream call.
- `// LATEST TRANSACTIONS` — the same indexer's `harvests` list (each fee
  harvest event, with a real `txHash`), replacing the `NO TRANSACTIONS
  YET` empty state with up to 5 rows.
- TSM's decimal count is fetched from Blockscout rather than assumed —
  guessing wrong here would silently scale `TOTAL TSM DISTRIBUTED` off by
  orders of magnitude with no visible error, worse than showing `0`.
- Raw on-chain amounts are formatted with a small BigInt-based helper
  (`formatUnits` in `script.js`), not `Number()` — several of these
  values exceed `Number.MAX_SAFE_INTEGER` and would silently lose
  precision otherwise.

**Deliberately still static:**

- `NEXT DISTRIBUTION` reads `PENDING` and blinks (`.blink` on `#countdown`
  in `index.html`, the same animation as the hero's cursor) rather than
  showing a static value — there's no field in the indexer response to
  back a countdown target with, so blinking signals "watching, nothing
  yet" instead of implying a number that isn't there. Wire up a real
  countdown once the indexer (or the contract) exposes a distribution
  timestamp.
- The `VIEW DISTRIBUTION` link below the stats is real, independent of
  the above — it points at the AUTSM coin page on theindex.finance.
- The Telegram button, commented out in `index.html` next to the X link.
  Uncomment it and set `href` to the invite link to bring it back; the X
  link is live and the chart icon needs no layout change either way.

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
