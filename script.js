/* AUTSM PROTOCOL — small terminal details, nothing heavy. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- rotating status line ---------------------------------- */
  var statusEl = document.getElementById("status-text");
  var MESSAGES = [
    "ACCUMULATING TSM FOR HOLDERS...",
    "SCANNING FEE STREAM...",
    "EXECUTING MARKET BUY...",
    "DISTRIBUTING TO HOLDERS...",
  ];

  if (statusEl && !reduced) {
    var idx = 0;
    setInterval(function () {
      idx = (idx + 1) % MESSAGES.length;
      statusEl.textContent = MESSAGES[idx];
    }, 3600);
  }

  /* ---- live protocol data -------------------------------------
       Everything below runs client-side, in the visitor's browser
       at page load — not in any build or CI step — so it is
       unaffected by server-side network restrictions. Every call
       is wrapped so a failure (network, CORS, unexpected response
       shape) leaves the corresponding element at its static
       fallback rather than breaking anything. None of this is
       verified against the live endpoints from this build
       environment; check the browser console after deploying. --- */

  var AUTSM_ADDRESS = "0x7f252feed0bcb6db7c40faf320a02ebd2cd3aee8";
  var TSM_ADDRESS = "0x58FfE4a942d3885bAa22D7520691F611EF09e7AA";
  var TREASURY_ID = "0x374f567ea050fde8ec9a5202e4fe30d62f2be4ee";

  function fetchJSON(url, opts, timeoutMs) {
    if (!window.fetch) return Promise.reject(new Error("fetch unsupported"));
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, timeoutMs || 8000);
    var init = opts || {};
    if (controller) init.signal = controller.signal;
    return fetch(url, init)
      .then(function (res) {
        if (!res.ok) throw new Error(url + " responded " + res.status);
        return res.json();
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  /* Formats a raw base-unit integer string (e.g. wei) as a decimal
     string with `displayDecimals` places, using BigInt throughout
     so amounts too large for a safe JS Number don't lose precision
     or round incorrectly. Returns null on unparseable input. */
  function formatUnits(raw, decimals, displayDecimals) {
    decimals = decimals == null ? 18 : decimals;
    displayDecimals = displayDecimals == null ? 3 : displayDecimals;
    var value;
    try {
      value = BigInt(raw);
    } catch (e) {
      return null;
    }
    var neg = value < 0n;
    if (neg) value = -value;

    var scale = 10n ** BigInt(displayDecimals);
    var base = 10n ** BigInt(Math.max(decimals - displayDecimals, 0));
    var scaledTotal = decimals >= displayDecimals
      ? (value + base / 2n) / base /* round to displayDecimals, half-up */
      : value * (10n ** BigInt(displayDecimals - decimals));

    var intPart = scaledTotal / scale;
    var fracPart = (scaledTotal % scale).toString().padStart(displayDecimals, "0");
    var withCommas = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var result = withCommas + (displayDecimals > 0 ? "." + fracPart : "");
    return (neg ? "-" : "") + result;
  }

  function truncateHash(hash) {
    if (typeof hash !== "string" || hash.length < 12) return hash;
    return hash.slice(0, 6) + "…" + hash.slice(-4);
  }

  /* ---- holder count (Robinhood Chain explorer, public API) ----
       Checks three plausible field names since the exact response
       shape is unverified from this environment. -------------- */
  var holdersEl = document.querySelector('[data-stat="holders"]');

  if (holdersEl) {
    fetchJSON("https://robinhoodchain.blockscout.com/api/v2/tokens/" + AUTSM_ADDRESS)
      .then(function (data) {
        var count = data && (data.holders_count ?? data.holders ?? data.holder_count);
        var n = Number(count);
        if (Number.isFinite(n)) holdersEl.textContent = n.toLocaleString();
      })
      .catch(function () { /* left as-is */ });
  }

  /* ---- fees collected + TSM acquired + latest transactions -----
       Source: theindex.finance's public indexer for AUTSM's
       treasury contract (distinct from the AUTSM token contract —
       the treasury holds and routes fees; the token is what
       trades). Verified by reconciling a captured response: the
       treasury's cumulative `harvested` field matches the exact
       sum of individual harvest amounts, and `treasuryAssets`'
       totalPot matches the exact sum of round pots, to the last
       wei — see commit history for the reconciliation.

       TOTAL TSM DISTRIBUTED is deliberately left untouched: nothing
       in this response tracks TSM actually leaving the treasury
       toward holders, only what's been collected and pooled. That
       lines up with NEXT DISTRIBUTION reading PENDING elsewhere on
       the page. Wire it up once a field for it exists. ---------- */
  var feesEl = document.querySelector('[data-stat="fees"]');
  var acquiredEl = document.querySelector('[data-stat="tsm-acquired"]');
  var txList = document.getElementById("tx-list");
  var txNote = document.getElementById("tx-note");

  if (feesEl || acquiredEl || txList) {
    var tsmDecimals = fetchJSON("https://robinhoodchain.blockscout.com/api/v2/tokens/" + TSM_ADDRESS)
      .then(function (data) {
        var d = Number(data && data.decimals);
        return Number.isFinite(d) ? d : 18;
      })
      .catch(function () { return 18; }); /* ERC-20 default if the lookup fails */

    var treasuryQuery = {
      query:
        "{\n    treasurys(where: { id: \"" + TREASURY_ID + "\" }, limit: 1) { items { id creator numeraire boundToken boundSymbol boundName curve boundAt basket\n  epochLength distributeBps harvested creatorAccrued protocolFees rounds } }\n    byToken: treasurys(where: { boundToken: \"" + TREASURY_ID + "\" }, limit: 1) { items { id creator numeraire boundToken boundSymbol boundName curve boundAt basket\n  epochLength distributeBps harvested creatorAccrued protocolFees rounds } }\n    \n  rounds(where: { treasury: \"" + TREASURY_ID + "\" }, orderBy: \"openedAt\", orderDirection: \"desc\", limit: 25) {\n    items { roundId asset pot spent openedAt status }\n  }\n  harvests(where: { treasury: \"" + TREASURY_ID + "\" }, orderBy: \"timestamp\", orderDirection: \"desc\", limit: 25) {\n    items { netCredit toDistributable toCreator protocolFee timestamp txHash }\n  }\n  treasuryAssets(where: { treasury: \"" + TREASURY_ID + "\" }, limit: 100) { items { asset totalPot } }\n  }",
    };

    Promise.all([
      fetchJSON("https://indices.theindex.finance/api/indexer", {
        method: "POST",
        credentials: "omit",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(treasuryQuery),
      }),
      tsmDecimals,
    ])
      .then(function (results) {
        var res = results[0];
        var decimals = results[1];
        var treasury = res && res.data && res.data.treasurys && res.data.treasurys.items && res.data.treasurys.items[0];
        var assets = res && res.data && res.data.treasuryAssets && res.data.treasuryAssets.items;
        var harvests = res && res.data && res.data.harvests && res.data.harvests.items;

        if (feesEl && treasury && treasury.harvested != null) {
          var fees = formatUnits(treasury.harvested, 18, 3); /* numeraire is native ETH */
          if (fees != null) feesEl.textContent = fees + " ETH";
        }

        if (acquiredEl && assets && assets.length) {
          var pooled = assets.find(function (a) {
            return typeof a.asset === "string" && a.asset.toLowerCase() === TSM_ADDRESS.toLowerCase();
          });
          if (pooled) {
            var acquired = formatUnits(pooled.totalPot, decimals, 3);
            if (acquired != null) acquiredEl.textContent = acquired + " TSM";
          }
        }

        if (txList && harvests && harvests.length) {
          var rows = harvests.slice(0, 5).map(function (h) {
            var amt = formatUnits(h.netCredit, 18, 4);
            return (
              "<li>" +
              '<span class="tx__hash">' + truncateHash(h.txHash) + "</span>" +
              '<span class="tx__kind">HARVEST</span>' +
              '<span class="tx__amt">' + (amt != null ? amt : "?") + " ETH</span>" +
              "</li>"
            );
          });
          if (rows.length) {
            txList.innerHTML = rows.join("");
            if (txNote) txNote.textContent = "SOURCE: THEINDEX.FINANCE — FEE HARVEST EVENTS";
          }
        }
      })
      .catch(function () { /* left as-is: indexer unreachable, CORS blocked, or shape differs */ });
  }

  /* ---- copy contract address --------------------------------- */
  var copyBtn = document.querySelector(".copy");

  if (copyBtn) {
    var label = copyBtn.querySelector(".copy__icon");
    copyBtn.addEventListener("click", function () {
      var addr = copyBtn.getAttribute("data-copy") || "";
      var done = function (ok) {
        label.textContent = ok ? "[COPIED]" : "[ERROR]";
        setTimeout(function () {
          label.textContent = "[COPY]";
        }, 1400);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(
          function () { done(true); },
          function () { done(false); }
        );
      } else {
        done(false);
      }
    });
  }

  /* ---- keep the hero video looping on mobile autoplay bail ---- */
  var video = document.querySelector(".window__video");
  if (video) {
    var kick = function () {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked; poster stays */ });
    };
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) kick();
    });
    window.addEventListener("touchstart", kick, { once: true, passive: true });
  }
})();
