function decodeMinecraftText(input, getChatDecoder) {
  if (input === null || input === undefined) return "";
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return "";
    try {
      return decodeMinecraftText(JSON.parse(trimmed), getChatDecoder);
    } catch {
      return trimmed;
    }
  }
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  if (Array.isArray(input)) return input.map((entry) => decodeMinecraftText(entry, getChatDecoder)).join("");
  if (typeof input === "object") {
    if (typeof input.type !== "undefined" && typeof input.value !== "undefined" && Object.keys(input).length <= 3) {
      return decodeMinecraftText(input.value, getChatDecoder);
    }
    try {
      return getChatDecoder().fromNotch(input).toString();
    } catch {
      // Fall back to manual extraction.
    }
    if (typeof input.text !== "undefined" || typeof input.extra !== "undefined" || typeof input.translate !== "undefined") {
      const parts = [];
      if (typeof input.text !== "undefined") parts.push(decodeMinecraftText(input.text, getChatDecoder));
      if (typeof input.extra !== "undefined") parts.push(decodeMinecraftText(input.extra, getChatDecoder));
      if (typeof input.translate === "string") {
        const args = Array.isArray(input.with) ? input.with.map((entry) => decodeMinecraftText(entry, getChatDecoder)).join(" ") : "";
        parts.push([input.translate, args].filter(Boolean).join(" "));
      }
      if (parts.length > 0) return parts.join("");
    }
    if (typeof input.value !== "undefined") return decodeMinecraftText(input.value, getChatDecoder);
  }
  return String(input);
}

function normalizeLore(rawLore, decodeFn) {
  const loreLines = Array.isArray(rawLore) ? rawLore : rawLore ? [rawLore] : [];
  return loreLines
    .map((line) => decodeFn(line).trim())
    .filter(Boolean);
}

function normalizeComponentType(type) {
  return String(type ?? "").trim().toLowerCase().replace(/^minecraft:/, "");
}

function readItemComponent(item, candidates) {
  const wanted = candidates.map(normalizeComponentType);
  if (item?.componentMap instanceof Map) {
    for (const [key, component] of item.componentMap.entries()) {
      if (wanted.includes(normalizeComponentType(key))) return component?.data ?? component?.value ?? component ?? null;
    }
  }
  if (Array.isArray(item?.components)) {
    for (const component of item.components) {
      if (wanted.includes(normalizeComponentType(component?.type))) return component?.data ?? component?.value ?? component ?? null;
    }
  }
  return null;
}

function extractModernDisplayData(item, decodeFn) {
  const customNameComponent = readItemComponent(item, [
    "custom_name",
    "minecraft:custom_name",
    "display_name",
    "minecraft:display_name",
  ]);
  const loreComponent = readItemComponent(item, [
    "lore",
    "minecraft:lore",
    "custom_lore",
    "minecraft:custom_lore",
    "tooltip",
  ]);
  return {
    customName: decodeFn(customNameComponent).trim(),
    lore: normalizeLore(loreComponent, decodeFn),
  };
}

function isPartialReadError(error) {
  const message = String(error?.message || error || "");
  const name = String(error?.name || "");
  return name === "PartialReadError" || message.includes("PartialReadError") || message.includes("Unexpected buffer end while reading VarInt");
}

module.exports = {
  decodeMinecraftText,
  extractModernDisplayData,
  isPartialReadError,
  normalizeLore,
  readItemComponent,
};
