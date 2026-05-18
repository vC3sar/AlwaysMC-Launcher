function normalizeChatKey(text) {
  return String(text ?? "").trim().toLowerCase();
}

module.exports = {
  normalizeChatKey,
};
