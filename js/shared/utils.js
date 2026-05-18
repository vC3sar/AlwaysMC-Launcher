(function (global) {
  const MOJIBAKE_REPLACEMENTS = [
    ["├í", "á"],
    ["├®", "é"],
    ["├¡", "í"],
    ["├│", "ó"],
    ["├║", "ú"],
    ["├▒", "ñ"],
    ["├æ", "Ñ"],
    ["├ü", "Á"],
    ["├ë", "É"],
    ["├ì", "Í"],
    ["├ô", "Ó"],
    ["├Ü", "Ú"],
    ["├£", "Ü"],
    ["├╝", "ü"],
    ["┬í", "¡"],
    ["┬┐", "¿"],
    ["ÔÇª", "..."],
    ["ÔÇó", "•"],
    ["ÔÇ£", "“"],
    ["ÔÇ¥", "”"],
    ["ÔÇÿ", "—"],
    ["ÔÇô", "–"],
    ["ÔÇÖ", "'"],
    ["ÔÇØ", '"'],
    ["ÔÇ", ""],
  ];

  function normalizeMojibake(text) {
    let out = String(text || "");
    for (const [bad, good] of MOJIBAKE_REPLACEMENTS) {
      out = out.split(bad).join(good);
    }
    out = out.replace(/[╔╗╚╝╠╣╦╩╬═║┌┐└┘├┤┬┴┼]+/g, " ");
    out = out.replace(/ß┤[A-Za-z0-9]/g, " ");
    out = out.replace(/[ÛøÛ½]+/g, " ");
    return out;
  }

  function sanitizeVisibleText(value) {
    return normalizeMojibake(value)
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
