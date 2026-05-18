function lifecycleEventNames() {
  return ["login", "spawn", "respawn", "health", "kicked", "disconnect", "error", "end"];
}

module.exports = {
  lifecycleEventNames,
};
