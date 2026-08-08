// Server-side proxy for DEX Screener's public pairs API.
//
// Unlike theindex.finance's indexer, this one is designed for exactly
// this kind of external client-side use, and DEX Screener is one of the
// most widely embedded crypto data APIs there is — a direct CORS block
// here would be surprising. It's proxied anyway for two reasons: this
// build environment couldn't reach api.dexscreener.com to confirm CORS
// behavior either way, so there's no way to verify a direct call would
// actually work; and edge caching here means a burst of visitors costs
// one upstream call every ~30s instead of one per page view.

const CHAIN_ID = "robinhood";
const PAIR_ADDRESS = "0x90ea2cc41bc2824aba4cea96a0139573b6094b91cef79412eaf0700ae1ab77e1";

module.exports = async function handler(req, res) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 8000);

  try {
    var upstream = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/" + CHAIN_ID + "/" + PAIR_ADDRESS,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(502).json({ error: "upstream responded " + upstream.status });
      return;
    }

    var data = await upstream.json();
    // Price/volume move continuously, unlike the treasury data, but
    // still no reason to hit the upstream on every single page view.
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json(data);
  } catch (err) {
    clearTimeout(timer);
    res.status(502).json({ error: "proxy fetch failed", detail: String((err && err.message) || err) });
  }
};
