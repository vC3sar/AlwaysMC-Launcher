(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  function bindClick(id, handler) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener("click", handler);
  }

  NS.actions = {
    bindClick,
    init(ctx) {
      bindClick("menu-play-btn", async () => {
        ctx.showLauncherView("play");
        ctx.switchPlayTab(ctx.getActivePlayTab());
        if (ctx.launcherAPI) {
          const last = await ctx.launcherAPI.getLastProfile();
          if (last) {
            document.getElementById("new-username").value = last.username || "";
            document.getElementById("new-ip").value = last.ip || "";
            document.getElementById("new-port").value = String(last.port || 25565);
            document.getElementById("new-version").value = last.version || "";
          }
          const cfg = await ctx.launcherAPI.getConfig();
          ctx.loadLaunchOptionsFromConfig(cfg);
          if (!ctx.dom.gameUsernameInput.value) ctx.dom.gameUsernameInput.value = String(last?.username || "JugadorOffline");
          ctx.restoreRememberedDistribution();
          ctx.syncVersionTypeFiltersUI();
          ctx.updateFilterVisibilityByDistribution();
          await ctx.refreshMsSessions();
          ctx.updateAuthModeUI();
          if (ctx.getActivePlayTab() === "java") await ctx.ensureJavaCatalogLoadedOnce();
        }
      });

      bindClick("menu-config-btn", ctx.openConfigView);
      bindClick("menu-info-btn", ctx.openInfoView);
      bindClick("menu-fullscreen-btn", ctx.toggleFullscreenMode);
      bindClick("menu-exit-btn", ctx.quitApplication);
      bindClick("play-back-btn", () => ctx.showLauncherView("main"));
      bindClick("config-back-btn", () => ctx.showLauncherView("main"));
      bindClick("info-back-btn", () => ctx.showLauncherView("main"));
      bindClick("continue-last-btn", ctx.bootContinue);
      bindClick("create-new-btn", () => document.getElementById("new-profile-form").classList.remove("hidden"));
      bindClick("start-new-profile-btn", ctx.bootNewProfile);
      bindClick("game-launch-btn", async () => { await ctx.launchSelectedGameFromUI(); });
      bindClick("game-stop-btn", async () => {
        if (!ctx.launcherAPI) return;
        const res = await ctx.launcherAPI.stopGame();
        if (!res?.ok) return ctx.setGameStatus(res?.error || "No se pudo cerrar el juego.", true);
        ctx.setGameStatus("Proceso del juego cerrado.");
      });
      bindClick("game-scan-java-btn", async () => {
        if (!ctx.launcherAPI) return;
        ctx.setGameStatus("Buscando instalaciones de Java...");
        const res = await ctx.launcherAPI.getJavaRuntimes();
        if (!res?.ok) return ctx.setGameStatus(res?.error || "No se pudo detectar Java.", true);
        const runtime = Array.isArray(res.runtimes) && res.runtimes.length ? res.runtimes[0] : null;
        if (!runtime) return ctx.setGameStatus("No se encontró Java automáticamente. Define la ruta manualmente.", true);
        if (ctx.dom.gameJavaPathInput) ctx.dom.gameJavaPathInput.value = runtime.path;
        await ctx.persistLaunchOptionsToConfig();
        await ctx.launcherAPI.setJavaPath(runtime.path);
        ctx.setGameStatus(`Java detectado: ${runtime.path}`);
      });
      bindClick("game-show-diagnostics-btn", async () => { await ctx.showRuntimeDiagnostics(); });

      bindClick("save-config-btn", async () => {
        if (!ctx.launcherAPI) return;
        try {
          const currentConfig = await ctx.launcherAPI.getConfig();
          const parsed = ctx.buildMergedConfig(currentConfig);
          const result = await ctx.launcherAPI.saveConfig(parsed);
          if (!result?.ok) return ctx.setLauncherStatus(result?.error || "No se pudo guardar.", true);
          ctx.setCurrentBgVideoMode(String(parsed.launcher.menuBackgroundMode || "auto").toLowerCase());
          ctx.applyLauncherBackgroundVideo(ctx.getCurrentBgVideoMode());
          ctx.setLauncherStatus("config.json guardado.");
        } catch {
          ctx.setLauncherStatus("JSON invalido en configuracion.", true);
        }
      });

      if (ctx.dom.bgVideoModeSelect) ctx.dom.bgVideoModeSelect.addEventListener("change", () => ctx.applyLauncherBackgroundVideo(ctx.dom.bgVideoModeSelect.value));
      if (ctx.dom.playTabBotBtn) ctx.dom.playTabBotBtn.addEventListener("click", () => ctx.switchPlayTab("bot"));
      if (ctx.dom.playTabJavaBtn) ctx.dom.playTabJavaBtn.addEventListener("click", async () => { ctx.switchPlayTab("java"); await ctx.ensureJavaCatalogLoadedOnce(); });
      if (ctx.dom.gameDistributionSelect) ctx.dom.gameDistributionSelect.addEventListener("change", async () => { ctx.updateFilterVisibilityByDistribution(); ctx.refreshVersionSelect(); await ctx.loadGameCatalog(true); });
      if (ctx.dom.gameVersionSelect) ctx.dom.gameVersionSelect.addEventListener("change", () => { ctx.persistCurrentVersionSelection(); });
      if (ctx.dom.gameVersionSelect) ctx.dom.gameVersionSelect.addEventListener("dblclick", async () => { await ctx.launchSelectedGameFromUI(); });
      if (ctx.dom.filterRelease) ctx.dom.filterRelease.addEventListener("change", async () => { ctx.versionTypeFilters.release = Boolean(ctx.dom.filterRelease.checked); ctx.refreshVersionSelect(); await ctx.loadGameCatalog(true); });
      if (ctx.dom.filterSnapshot) ctx.dom.filterSnapshot.addEventListener("change", async () => { ctx.versionTypeFilters.snapshot = Boolean(ctx.dom.filterSnapshot.checked); ctx.refreshVersionSelect(); await ctx.loadGameCatalog(true); });
      if (ctx.dom.filterOldBeta) ctx.dom.filterOldBeta.addEventListener("change", async () => { ctx.versionTypeFilters.old_beta = Boolean(ctx.dom.filterOldBeta.checked); ctx.refreshVersionSelect(); await ctx.loadGameCatalog(true); });
      if (ctx.dom.filterOldAlpha) ctx.dom.filterOldAlpha.addEventListener("change", async () => { ctx.versionTypeFilters.old_alpha = Boolean(ctx.dom.filterOldAlpha.checked); ctx.refreshVersionSelect(); await ctx.loadGameCatalog(true); });
      if (ctx.dom.gameAuthModeSelect) ctx.dom.gameAuthModeSelect.addEventListener("change", () => {
        if (String(ctx.dom.gameAuthModeSelect.value || "offline") === "microsoft") {
          ctx.dom.gameAuthModeSelect.value = "offline";
          ctx.setGameStatus("Microsoft/Premium está deshabilitado temporalmente.", true);
        }
        ctx.updateAuthModeUI();
      });
      if (ctx.dom.msAccountSelect) ctx.dom.msAccountSelect.addEventListener("change", async () => {
        if (!ctx.launcherAPI || typeof ctx.launcherAPI.setActiveAuthSession !== "function") return;
        const id = String(ctx.dom.msAccountSelect.value || "");
        if (!id) return;
        const res = await ctx.launcherAPI.setActiveAuthSession(id);
        if (!res?.ok) return ctx.setMsAuthStatus(res?.error || "No se pudo cambiar cuenta activa.", true);
        ctx.setMsActiveAccountId(id);
        ctx.renderMsAccounts();
      });
      if (ctx.dom.gameJavaPathInput) ctx.dom.gameJavaPathInput.addEventListener("change", async () => { await ctx.persistLaunchOptionsToConfig(); });
      if (ctx.dom.gameMinMemoryInput) ctx.dom.gameMinMemoryInput.addEventListener("change", async () => { await ctx.persistLaunchOptionsToConfig(); });
      if (ctx.dom.gameMaxMemoryInput) ctx.dom.gameMaxMemoryInput.addEventListener("change", async () => { await ctx.persistLaunchOptionsToConfig(); });
      if (ctx.dom.gameExtraJvmArgsInput) ctx.dom.gameExtraJvmArgsInput.addEventListener("change", async () => { await ctx.persistLaunchOptionsToConfig(); });
      if (ctx.dom.gameExtraGameArgsInput) ctx.dom.gameExtraGameArgsInput.addEventListener("change", async () => { await ctx.persistLaunchOptionsToConfig(); });

      ctx.switchPlayTab("bot");
      if (ctx.dom.gameAuthModeSelect) ctx.dom.gameAuthModeSelect.value = "offline";
      ctx.updateAuthModeUI();
      ctx.showLauncherView("main");
    },
  };
})();
