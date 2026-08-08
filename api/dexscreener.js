// Server-side proxy for DEX Screener's public API.
//
// Unlike theindex.finance's indexer, this one is designed for exactly
// this kind of external client-side use, and DEX Screener is one of the
// most widely embedded crypto data APIs there is — a direct CORS block
// here would be surprising. It's proxied anyway for two reasons: this
// build environment couldn't reach api.dexscreener.com to confirm CORS
// behavior either way, so there's no way to verify a direct call would
// actually work; and edge caching here means a burst of visitors costs
// one upstream call every ~30s instead of one per page view.
//
// Fetches two things in one round trip: AUTSM's specific pair (for
// market cap / volume) and TSM's token data (for its USD price, needed
// to value the TOTAL TSM DISTRIBUTED figure in dollars). TSM's exact
// pair address isn't known the way AUTSM's is, so it's looked up by
// token address instead, which can return multiple pairs across chains
// — filtering to Robinhood Chain and picking one happens client-side,
// where the existing TSM_ADDRESS constant already lives.

const CHAIN_ID = "robinhood";
const AUTSM_PAIR_ADDRESS = "0x90ea2cc41bc2824aba4cea96a0139573b6094b91cef79412eaf0700ae1ab77e1";
const TSM_ADDRESS = "0x58FfE4a942d3885bAa22D7520691F611EF09e7AA";

function fetchJSON(url, signal) {
  return fetch(url, { signal }).then(function (res) {
    if (!res.ok) throw new Error(url + " responded " + res.status);
    return res.json();
  });
}

module.exports = async function handler(req, res) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 8000);

  try {
    var results = await Promise.allSettled([
      fetchJSON("https://api.dexscreener.com/latest/dex/pairs/" + CHAIN_ID + "/" + AUTSM_PAIR_ADDRESS, controller.signal),
      fetchJSON("https://api.dexscreener.com/latest/dex/tokens/" + TSM_ADDRESS, controller.signal),
    ]);
    clearTimeout(timer);

    var autsm = results[0].status === "fulfilled" ? results[0].value : null;
    var tsm = results[1].status === "fulfilled" ? results[1].value : null;

    if (!autsm && !tsm) {
      res.status(502).json({ error: "both upstream calls failed" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    res.status(200).json({ autsm: autsm, tsm: tsm });
  } catch (err) {
    clearTimeout(timer);
    res.status(502).json({ error: "proxy fetch failed", detail: String((err && err.message) || err) });
  }
};
