function resolveBotRuntimeConfig(appConfig, requestedVersion) {
  const launcherConfig = appConfig && typeof appConfig.launcher === "object" ? appConfig.launcher : {};
  const versionCandidates = Array.from(
    new Set(
      [
        String(requestedVersion || "").trim(),
        ...(Array.isArray(launcherConfig.preferredVersions) ? launcherConfig.preferredVersions : []),
      ]
        .map((entry) => String(entry).trim())
        .filter(Boolean),
    ),
  );
  return {
    launcherConfig,
    discordClientId: String(appConfig?.clientId || "").trim(),
    reconnectDelayMs: Number.parseInt(launcherConfig.reconnectDelayMs || "650", 10) || 650,
    authRecoveryWindowMs: Number.parseInt(launcherConfig.authRecoveryWindowMs || "30000", 10) || 30000,
    maxReconnectAttempts: Number.parseInt(launcherConfig.maxReconnectAttempts || "6", 10) || 6,
    reconnectBackoffMaxMs: Number.parseInt(launcherConfig.reconnectBackoffMaxMs || "4000", 10) || 4000,
    reconnectJitterRatio: Number.parseFloat(launcherConfig.reconnectJitterRatio || "0.2") || 0.2,
    velocityCompatMode: Boolean(launcherConfig.velocityCompatMode),
    verboseMode: String(launcherConfig.verboseMode || "app").toLowerCase() === "all" ? "all" : "app",
    debugLifecycleSetting:
      process.env.MC_BETA_DEBUG !== undefined
        ? process.env.MC_BETA_DEBUG
        : launcherConfig.debugLifecycle !== undefined
          ? String(launcherConfig.debugLifecycle)
          : "1",
    versionCandidates,
  };
}

module.exports = {
  resolveBotRuntimeConfig,
};
