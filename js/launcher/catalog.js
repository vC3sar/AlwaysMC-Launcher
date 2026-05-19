(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  NS.catalog = {
    refreshVersionSelect(ctx) {
      const { dom, getDistributionEntries, applyVersionFilters, getVersionTypeFilters, getEntryVersionId, loadLastGameSelections, setGameStatus } = ctx;
      const { gameVersionSelect, gameDistributionSelect } = dom;
      if (!gameVersionSelect) return;
      const entries = applyVersionFilters(getDistributionEntries(), String(gameDistributionSelect?.value || "vanilla"), getVersionTypeFilters());
      const previous = gameVersionSelect.value;
      const currentDistribution = String(gameDistributionSelect?.value || "vanilla");
      const remembered = loadLastGameSelections()?.[currentDistribution] || null;
      gameVersionSelect.innerHTML = "";
      entries.forEach((entry) => {
        const option = document.createElement("option");
        const versionId = getEntryVersionId(entry);
        option.value = versionId;
        if (entry.source === "fabric") option.textContent = `${entry.gameVersion} | loader ${entry.loaderVersion}`;
        else if (entry.source === "forge") option.textContent = `${entry.gameVersion} | forge ${entry.forgeVersion} (${entry.channel})`;
        else option.textContent = `${entry.id} (${entry.type})`;
        option.dataset.source = entry.source || String(gameDistributionSelect.value || "vanilla");
        option.dataset.loaderVersion = entry.loaderVersion || "";
        option.dataset.type = entry.type || "";
        gameVersionSelect.appendChild(option);
      });
      const hasOption = (value) => Array.from(gameVersionSelect.options).some((opt) => opt.value === String(value));
      if (remembered?.versionId && hasOption(remembered.versionId)) gameVersionSelect.value = String(remembered.versionId);
      else if (previous && hasOption(previous)) gameVersionSelect.value = String(previous);
      else if (gameVersionSelect.options.length > 0) gameVersionSelect.selectedIndex = 0;
      if (gameVersionSelect.options.length === 0) setGameStatus("Sin resultados para los filtros seleccionados.", true);
    },

    applyVersionFilters(_ctx, entries, distribution, filters) {
      if (!Array.isArray(entries)) return [];
      const dist = String(distribution || "vanilla");
      if (dist !== "vanilla") return entries;
      return entries.filter((entry) => {
        const type = String(entry.type || "release");
        if (!Boolean(filters[type])) return false;
        const id = String(entry.id || "");
        const match = id.match(/^1\.(\d+)(?:\.(\d+))?$/);
        if (!match) return true;
        const minor = Number.parseInt(match[1], 10);
        return Number.isFinite(minor) ? minor >= 8 : true;
      });
    },

    async loadGameCatalog(ctx, forceRefresh = false) {
      const { launcherAPI, setGameStatus, setCatalogRequestSeq, getCatalogRequestSeq, getLastAppliedCatalogRequest, setLastAppliedCatalogRequest, setGameCatalog, getGameCatalog, refreshVersionSelect } = ctx;
      if (!launcherAPI) return;
      const requestId = getCatalogRequestSeq() + 1;
      setCatalogRequestSeq(requestId);
      setGameStatus(forceRefresh ? "Actualizando catálogo..." : "Cargando catálogo...");
      const result = forceRefresh ? await launcherAPI.refreshVersionCatalog() : await launcherAPI.getVersionCatalog();
      if (requestId < getLastAppliedCatalogRequest()) return;
      setLastAppliedCatalogRequest(requestId);
      if (!result?.ok) {
        setGameStatus(result?.error || "No se pudo cargar el catálogo.", true);
        return;
      }
      setGameCatalog(result.catalog || { vanilla: [], forge: [], fabric: [] });
      refreshVersionSelect();
      const catalog = getGameCatalog();
      const warning = result.warning ? ` (warning: ${result.warning})` : "";
      setGameStatus(`Catálogo listo: ${catalog.vanilla.length} vanilla, ${catalog.fabric.length} fabric, ${catalog.forge.length} forge${warning}`);
    },
  };
})();
