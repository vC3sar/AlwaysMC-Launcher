(function (global) {
  // prettier-ignore
  const MOJIBAKE_REPLACEMENTS = [
    ["├í", "á"], ["├®", "é"], ["├¡", "í"], ["├│", "ó"], ["├║", "ú"],
    ["├▒", "ñ"], ["├æ", "Ñ"], ["├ü", "Á"], ["├ë", "É"], ["├ì", "Í"],
    ["├ô", "Ó"], ["├Ü", "Ú"], ["├£", "Ü"], ["├╝", "ü"],
    ["┬í", "¡"], ["┬┐", "¿"],
    ["ÔÇª", "…"], ["ÔÇó", "•"], ["ÔÇ£", "\u201C"], ["ÔÇ¥", "\u201D"],
    ["ÔÇÿ", "—"], ["ÔÇô", "–"], ["ÔÇÖ", "\u2019"], ["ÔÇØ", '"'], ["ÔÇ", ""],
  ];

  // Box-drawing noise and known garbled byte patterns
  const RE_BOX = /[╔╗╚╝╠╣╦╩╬═║┌┐└┘├┤┬┴┼]+/g;
  const RE_GARBLE = /ß┤[A-Za-z0-9]|[ÛøÛ½]+/g;
  const RE_CTRL = /[\u0000-\u001F\u007F]/g;
  const RE_FFFD = /\uFFFD+/g;
  const RE_SPACE = /\s+/g;

  function normalizeMojibake(text) {
    let out = String(text ?? "");
    for (const [bad, good] of MOJIBAKE_REPLACEMENTS) out = out.split(bad).join(good);
    return out.replace(RE_BOX, " ").replace(RE_GARBLE, " ");
  }

  function sanitizeVisibleText(value) {
    return normalizeMojibake(value)
      .replace(RE_FFFD, "")
      .replace(RE_CTRL, " ")
      .replace(RE_SPACE, " ")
      .trim();
  }

  function formatVital(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${Math.max(0, Math.min(20, Math.round(n)))}/20` : "--/20";
  }

  global.MCShared = { sanitizeVisibleText, formatVital };
})(window);