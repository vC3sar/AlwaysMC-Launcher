(function (global) {
  function sanitizeVisibleText(value) {
    return String(value || "")
      .replace(/\uFFFD+/g, "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatVital(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--/20";
    const clamped = Math.max(0, Math.min(20, Math.round(n)));
    return `${clamped}/20`;
  }

  global.MCShared = {
    sanitizeVisibleText,
    formatVital,
  };
})(window);
