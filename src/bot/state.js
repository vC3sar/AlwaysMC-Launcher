function createRuntimeState() {
  return {
    currentHealth: null,
    currentFood: null,
    botReady: false,
    botStatus: "offline",
    reconnectInProgress: false,
  };
}

module.exports = {
  createRuntimeState,
};
