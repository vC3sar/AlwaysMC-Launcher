function getArmorDestination(itemName) {
  const normalized = String(itemName || "").toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("helmet") || normalized.includes("skull") || normalized.includes("head")) return "head";
  if (normalized.includes("chestplate") || normalized.includes("elytra")) return "torso";
  if (normalized.includes("leggings")) return "legs";
  if (normalized.includes("boots")) return "feet";
  return null;
}

function isLikelyFood(itemName) {
  const normalized = String(itemName || "").toLowerCase();
  if (!normalized) return false;

  const foodTokens = [
    "apple", "bread", "beef", "chicken", "cod", "salmon", "mutton", "porkchop", "rabbit", "potato",
    "carrot", "beetroot", "cookie", "melon_slice", "sweet_berries", "glow_berries", "golden_apple",
    "enchanted_golden_apple", "stew", "soup", "pumpkin_pie", "chorus_fruit", "dried_kelp",
    "honey_bottle", "rotten_flesh",
  ];

  return foodTokens.some((token) => normalized.includes(token));
}

module.exports = {
  getArmorDestination,
  isLikelyFood,
};
