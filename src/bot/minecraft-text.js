function sanitizeVisibleText(input) {
  return String(input ?? "")
    .replace(/\uFFFD+/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  sanitizeVisibleText,
};
