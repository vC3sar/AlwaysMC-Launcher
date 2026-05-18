function extractVitals(bot) {
  const healthValue = Number(bot?.health);
  const foodValue = Number(bot?.food);
  return {
    health: Number.isFinite(healthValue) ? Math.max(0, Math.min(20, Math.round(healthValue))) : null,
    food: Number.isFinite(foodValue) ? Math.max(0, Math.min(20, Math.round(foodValue))) : null,
  };
}

module.exports = {
  extractVitals,
};
