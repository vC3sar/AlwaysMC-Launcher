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
  let out = String(text ?? "");
  for (const [bad, good] of MOJIBAKE_REPLACEMENTS) {
    out = out.split(bad).join(good);
  }
  // Drop noisy pseudo-graphic residue commonly seen after bad decode.
  out = out.replace(/[╔╗╚╝╠╣╦╩╬═║┌┐└┘├┤┬┴┼]+/g, " ");
  out = out.replace(/ß┤[A-Za-z0-9]/g, " ");
  out = out.replace(/[ÛøÛ½]+/g, " ");
  return out;
}

function sanitizeVisibleText(input) {
  return normalizeMojibake(input)
    .replace(/\uFFFD+/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  sanitizeVisibleText,
};
