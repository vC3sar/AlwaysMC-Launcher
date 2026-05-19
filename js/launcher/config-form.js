(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  NS.configForm = {
    loadConfigIntoForm(ctx, cfg) {
      const { dom } = ctx;
      const config = cfg && typeof cfg === "object" ? cfg : {};
      const launcher = config.launcher && typeof config.launcher === "object" ? config.launcher : {};
      const versions = Array.isArray(launcher.preferredVersions) ? launcher.preferredVersions : [];

      document.getElementById("cfg-client-id").value = String(config.clientId || "");
      const versionsSet = new Set(versions.map((v) => String(v).trim()).filter(Boolean));
      const versionsSelect = document.getElementById("cfg-preferred-versions");
      Array.from(versionsSelect.options).forEach((option) => { option.selected = versionsSet.has(option.value); });

      document.getElementById("cfg-reconnect-delay").value = String(launcher.reconnectDelayMs ?? 650);
      document.getElementById("cfg-velocity-compat").checked = Boolean(launcher.velocityCompatMode);
      document.getElementById("cfg-debug-lifecycle").checked = Boolean(launcher.debugLifecycle);
      document.getElementById("cfg-verbose-mode").value = String(launcher.verboseMode || "app").toLowerCase() === "all" ? "all" : "app";
      document.getElementById("cfg-auth-recovery-window").value = String(launcher.authRecoveryWindowMs ?? 30000);
      document.getElementById("cfg-max-reconnect-attempts").value = String(launcher.maxReconnectAttempts ?? 6);
      document.getElementById("cfg-reconnect-backoff-max").value = String(launcher.reconnectBackoffMaxMs ?? 4000);
      document.getElementById("cfg-reconnect-jitter").value = String(launcher.reconnectJitterRatio ?? 0.2);
      if (dom.bgVideoModeSelect) dom.bgVideoModeSelect.value = String(launcher.menuBackgroundMode || dom.bgVideoModeSelect.value || "auto");
    },
  };
})();
