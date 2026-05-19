(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  NS.navigation = {
    getMainMenuButtons(ctx) {
      return ctx.MAIN_MENU_BUTTON_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    },
    setMainMenuSelection(ctx, index) {
      const buttons = NS.navigation.getMainMenuButtons(ctx);
      if (!buttons.length) return;
      const normalized = ((index % buttons.length) + buttons.length) % buttons.length;
      ctx.setActiveMainMenuIndex(normalized);
      buttons.forEach((button, idx) => button.classList.toggle("nav-active", idx === normalized));
      buttons[normalized].focus({ preventScroll: true });
    },
    setLauncherMainMenuControlsVisible(ctx, visible) {
      if (!ctx.dom.launcherControlsHint) return;
      ctx.dom.launcherControlsHint.classList.toggle("visible", Boolean(visible));
    },
    getConfigNavigableElements(ctx) {
      if (!ctx.dom.launcherConfigView) return [];
      return Array.from(ctx.dom.launcherConfigView.querySelectorAll("input, select, button")).filter((element) => {
        if (element.disabled) return false;
        if (element.type === "hidden") return false;
        return element.offsetParent !== null;
      });
    },
    setConfigSelection(ctx, index) {
      const elements = NS.navigation.getConfigNavigableElements(ctx);
      if (!elements.length) return;
      const normalized = ((index % elements.length) + elements.length) % elements.length;
      ctx.setActiveConfigIndex(normalized);
      elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
      const target = elements[normalized];
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    getPlayNavigableElements(ctx) {
      if (!ctx.dom.launcherPlayView) return [];
      return Array.from(ctx.dom.launcherPlayView.querySelectorAll("input, select, button")).filter((element) => {
        if (element.disabled) return false;
        if (element.type === "hidden") return false;
        return element.offsetParent !== null;
      });
    },
    setPlaySelection(ctx, index) {
      const elements = NS.navigation.getPlayNavigableElements(ctx);
      if (!elements.length) return;
      const normalized = ((index % elements.length) + elements.length) % elements.length;
      ctx.setActivePlayIndex(normalized);
      elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
      const target = elements[normalized];
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    getInfoNavigableElements(ctx) {
      if (!ctx.dom.launcherInfoView) return [];
      return Array.from(ctx.dom.launcherInfoView.querySelectorAll("button")).filter((element) => {
        if (element.disabled) return false;
        return element.offsetParent !== null;
      });
    },
    setInfoSelection(ctx, index) {
      const elements = NS.navigation.getInfoNavigableElements(ctx);
      if (!elements.length) return;
      const normalized = ((index % elements.length) + elements.length) % elements.length;
      ctx.setActiveInfoIndex(normalized);
      elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
      const target = elements[normalized];
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    showLauncherView(ctx, view, options = {}) {
      const fromHistory = Boolean(options.fromHistory);
      const previousView = ctx.getCurrentLauncherView();
      if (!fromHistory) {
        if (view === "main") ctx.setLauncherViewHistory(["main"]);
        else if (previousView !== view) ctx.setLauncherViewHistory([...ctx.getLauncherViewHistory(), view]);
      }
      ctx.setCurrentLauncherView(view);
      ctx.startMenuAudio();
      ctx.dom.launcherMainMenu.style.display = view === "main" ? "flex" : "none";
      const launcherShell = document.querySelector(".launcher-shell");
      if (launcherShell) {
        launcherShell.classList.toggle("main-compact", view === "main");
        if (view !== "play") launcherShell.classList.remove("java-expanded");
      }
      ctx.dom.launcherPlayView.classList.toggle("visible", view === "play");
      ctx.dom.launcherConfigView.classList.toggle("visible", view === "config");
      ctx.dom.launcherInfoView.classList.toggle("visible", view === "info");
      NS.navigation.setLauncherMainMenuControlsVisible(ctx, view === "main" || view === "play" || view === "config" || view === "info");
      if (view === "main") NS.navigation.setMainMenuSelection(ctx, 0);
      else NS.navigation.getMainMenuButtons(ctx).forEach((button) => button.classList.remove("nav-active"));
      if (view === "config") NS.navigation.setConfigSelection(ctx, 0);
      else NS.navigation.getConfigNavigableElements(ctx).forEach((element) => element.classList.remove("launcher-nav-active"));
      if (view === "play") NS.navigation.setPlaySelection(ctx, 0);
      else NS.navigation.getPlayNavigableElements(ctx).forEach((element) => element.classList.remove("launcher-nav-active"));
      if (view === "info") NS.navigation.setInfoSelection(ctx, 0);
      else NS.navigation.getInfoNavigableElements(ctx).forEach((element) => element.classList.remove("launcher-nav-active"));
      ctx.setLauncherStatus("");
    },
    goBackLauncherView(ctx) {
      if (ctx.getCurrentLauncherView() === "play") {
        const newProfileForm = document.getElementById("new-profile-form");
        if (newProfileForm && !newProfileForm.classList.contains("hidden")) {
          newProfileForm.classList.add("hidden");
          return;
        }
      }
      const history = ctx.getLauncherViewHistory();
      if (history.length > 1) {
        history.pop();
        ctx.setLauncherViewHistory(history);
        const previousView = history[history.length - 1] || "main";
        NS.navigation.showLauncherView(ctx, previousView, { fromHistory: true });
        return;
      }
      NS.navigation.showLauncherView(ctx, "main", { fromHistory: true });
    },
    setupKeyboard(ctx) {
      document.addEventListener("keydown", (event) => {
        if (event.key === "F11") {
          event.preventDefault();
          ctx.toggleFullscreenMode();
          return;
        }

        const currentLauncherView = ctx.getCurrentLauncherView();
        if (currentLauncherView === "main") {
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); NS.navigation.setMainMenuSelection(ctx, ctx.getActiveMainMenuIndex() - 1); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); NS.navigation.setMainMenuSelection(ctx, ctx.getActiveMainMenuIndex() + 1); return; }
          if (event.key === "Enter") {
            event.preventDefault();
            const buttons = NS.navigation.getMainMenuButtons(ctx);
            if (!buttons.length) return;
            const target = buttons[ctx.getActiveMainMenuIndex()];
            if (target) target.click();
            return;
          }
          if (event.key === "Escape") event.preventDefault();
          return;
        }

        if (currentLauncherView === "config") {
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); NS.navigation.setConfigSelection(ctx, ctx.getActiveConfigIndex() - 1); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); NS.navigation.setConfigSelection(ctx, ctx.getActiveConfigIndex() + 1); return; }
          if (event.key === "Enter") {
            const elements = NS.navigation.getConfigNavigableElements(ctx);
            if (!elements.length) return;
            const active = elements[ctx.getActiveConfigIndex()];
            if (!active) return;
            if (active.tagName === "BUTTON") { event.preventDefault(); active.click(); }
            return;
          }
          if (event.key === "Escape") { event.preventDefault(); NS.navigation.goBackLauncherView(ctx); }
          return;
        }

        if (currentLauncherView === "play") {
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); NS.navigation.setPlaySelection(ctx, ctx.getActivePlayIndex() - 1); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); NS.navigation.setPlaySelection(ctx, ctx.getActivePlayIndex() + 1); return; }
          if (event.key === "Enter") {
            const elements = NS.navigation.getPlayNavigableElements(ctx);
            if (!elements.length) return;
            const active = elements[ctx.getActivePlayIndex()];
            if (!active) return;
            if (active.tagName === "BUTTON") { event.preventDefault(); active.click(); }
            return;
          }
          if (event.key === "Escape") { event.preventDefault(); NS.navigation.goBackLauncherView(ctx); }
          return;
        }

        if (currentLauncherView === "info") {
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); NS.navigation.setInfoSelection(ctx, ctx.getActiveInfoIndex() - 1); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); NS.navigation.setInfoSelection(ctx, ctx.getActiveInfoIndex() + 1); return; }
          if (event.key === "Enter") {
            const elements = NS.navigation.getInfoNavigableElements(ctx);
            if (!elements.length) return;
            const active = elements[ctx.getActiveInfoIndex()];
            if (!active) return;
            event.preventDefault();
            active.click();
            return;
          }
          if (event.key === "Escape") { event.preventDefault(); NS.navigation.goBackLauncherView(ctx); }
        }
      });
    },
  };
})();
