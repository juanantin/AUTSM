// Server-side proxy for theindex.finance's treasury indexer.
//
// The indexer's POST endpoint appears to reject cross-origin requests —
// a JSON POST body forces the browser to send a CORS preflight first,
// and this call was failing from every origin except theindex.finance's
// own frontend. Server-to-server requests aren't subject to browser
// CORS at all, so this runs the same query from Vercel's infrastructure
// and hands the JSON back same-origin, where the page can just fetch it.
//
// The query is reproduced byte-for-byte from a captured working request
// (see script.js history) — not retyped from memory.

const TREASURY_ID = "0x374f567ea050fde8ec9a5202e4fe30d62f2be4ee";

const QUERY =
  "{\n    treasurys(where: { id: \"" + TREASURY_ID + "\" }, limit: 1) { items { id creator numeraire boundToken boundSymbol boundName curve boundAt basket\n  epochLength distributeBps harvested creatorAccrued protocolFees rounds } }\n    byToken: treasurys(where: { boundToken: \"" + TREASURY_ID + "\" }, limit: 1) { items { id creator numeraire boundToken boundSymbol boundName curve boundAt basket\n  epochLength distributeBps harvested creatorAccrued protocolFees rounds } }\n    \n  rounds(where: { treasury: \"" + TREASURY_ID + "\" }, orderBy: \"openedAt\", orderDirection: \"desc\", limit: 25) {\n    items { roundId asset pot spent openedAt status }\n  }\n  harvests(where: { treasury: \"" + TREASURY_ID + "\" }, orderBy: \"timestamp\", orderDirection: \"desc\", limit: 25) {\n    items { netCredit toDistributable toCreator protocolFee timestamp txHash }\n  }\n  treasuryAssets(where: { treasury: \"" + TREASURY_ID + "\" }, limit: 100) { items { asset totalPot } }\n  }";

module.exports = async function handler(req, res) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 8000);

  try {
    var upstream = await fetch("https://indices.theindex.finance/api/indexer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(502).json({ error: "upstream responded " + upstream.status });
      return;
    }

    var data = await upstream.json();
    // Cached at the edge so a burst of visitors doesn't hammer an API we
    // don't operate; short enough to stay well under one epoch (900s).
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(data);
  } catch (err) {
    clearTimeout(timer);
    res.status(502).json({ error: "proxy fetch failed", detail: String((err && err.message) || err) });
  }
};
