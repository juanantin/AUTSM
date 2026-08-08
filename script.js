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
