(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.utils = {
    normalizeString(value, fallback = "") {
      const out = String(value ?? "").trim();
      return out || fallback;
    },
    clampNumber(value, min, max, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    },
    optionalElement(id) {
      return document.getElementById(id) || null;
    },
    assertElement(id) {
      const el = document.getElementById(id);
      if (!el) throw new Error(`[Launcher] Missing DOM element: ${id}`);
      return el;
    },
  };
})();
