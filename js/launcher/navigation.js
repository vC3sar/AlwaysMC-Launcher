(function () {
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});

  // ── View descriptor table ─────────────────────────────────────────────────
  // Each entry drives: element retrieval, index get/set, CSS class, and keyboard dispatch.
  // "main" is intentionally separate (buttons only, no scroll, no Escape handler).
  const VIEW_CONFIG = {
    config: {
      cls: "launcher-nav-active",
      getEls: (ctx) => _queryInputs(ctx.dom.launcherConfigView, "input, select, button"),
      getIdx: (ctx) => ctx.getActiveConfigIndex(),
      setIdx: (ctx, v) => ctx.setActiveConfigIndex(v),
      onEscape: true,
    },
    play: {
      cls: "launcher-nav-active",
      getEls: (ctx) => _queryInputs(ctx.dom.launcherPlayView, "input, select, button"),
      getIdx: (ctx) => ctx.getActivePlayIndex(),
      setIdx: (ctx, v) => ctx.setActivePlayIndex(v),
      onEscape: true,
    },
    info: {
      cls: "launcher-nav-active",
      getEls: (ctx) => _queryInputs(ctx.dom.launcherInfoView, "button"),
      getIdx: (ctx) => ctx.getActiveInfoIndex(),
      setIdx: (ctx, v) => ctx.setActiveInfoIndex(v),
      onEscape: true,
    },
  };

  // ── Private helpers ───────────────────────────────────────────────────────
  function _queryInputs(view, selector) {
    if (!view) return [];
    return Array.from(view.querySelectorAll(selector)).filter(
      (el) => !el.disabled && el.type !== "hidden" && el.offsetParent !== null
    );
  }

  function _normalize(index, len) {
    return ((index % len) + len) % len;
  }

  // Generic select: normalize index → mark active class → focus (+ scroll for sub-views).
  function _setSelection(ctx, vcfg, index) {
    const els = vcfg.getEls(ctx);
    if (!els.length) return;
    const norm = _normalize(index, els.length);
    vcfg.setIdx(ctx, norm);
    els.forEach((el, i) => el.classList.toggle(vcfg.cls, i === norm));
    els[norm].focus({ preventScroll: true });
    els[norm].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  function _clearSelection(ctx, vcfg) {
    vcfg.getEls(ctx).forEach((el) => el.classList.remove(vcfg.cls));
  }

  // ── Public API ────────────────────────────────────────────────────────────
  NS.navigation = {
    // ── Named wrappers kept for external callers ──────────────────────────
    getMainMenuButtons(ctx) {
      return ctx.MAIN_MENU_BUTTON_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    },
    setMainMenuSelection(ctx, index) {
      const buttons = NS.navigation.getMainMenuButtons(ctx);
      if (!buttons.length) return;
      const norm = _normalize(index, buttons.length);
      ctx.setActiveMainMenuIndex(norm);
      buttons.forEach((btn, i) => btn.classList.toggle("nav-active", i === norm));
      buttons[norm].focus({ preventScroll: true });
    },
    getConfigNavigableElements: (ctx) => VIEW_CONFIG.config.getEls(ctx),
    getPlayNavigableElements: (ctx) => VIEW_CONFIG.play.getEls(ctx),
    getInfoNavigableElements: (ctx) => VIEW_CONFIG.info.getEls(ctx),
    setConfigSelection: (ctx, i) => _setSelection(ctx, VIEW_CONFIG.config, i),
    setPlaySelection: (ctx, i) => _setSelection(ctx, VIEW_CONFIG.play, i),
    setInfoSelection: (ctx, i) => _setSelection(ctx, VIEW_CONFIG.info, i),
    setLauncherMainMenuControlsVisible(ctx, visible) {
      ctx.dom.launcherControlsHint?.classList.toggle("visible", Boolean(visible));
    },

    // ── View management ───────────────────────────────────────────────────
    showLauncherView(ctx, view, options = {}) {
      if (!options.fromHistory) {
        if (view === "main") ctx.setLauncherViewHistory(["main"]);
        else if (ctx.getCurrentLauncherView() !== view)
          ctx.setLauncherViewHistory([...ctx.getLauncherViewHistory(), view]);
      }
      ctx.setCurrentLauncherView(view);
      ctx.startMenuAudio();

      ctx.dom.launcherMainMenu.style.display = view === "main" ? "flex" : "none";
      const shell = document.querySelector(".launcher-shell");
      if (shell) {
        shell.classList.toggle("main-compact", view === "main");
        if (view !== "play") shell.classList.remove("java-expanded");
      }
      ctx.dom.launcherPlayView.classList.toggle("visible", view === "play");
      ctx.dom.launcherConfigView.classList.toggle("visible", view === "config");
      ctx.dom.launcherInfoView.classList.toggle("visible", view === "info");
      NS.navigation.setLauncherMainMenuControlsVisible(ctx, true);

      // Activate matching view; clear all others.
      if (view === "main") {
        NS.navigation.setMainMenuSelection(ctx, 0);
      } else {
        NS.navigation.getMainMenuButtons(ctx).forEach((b) => b.classList.remove("nav-active"));
      }
      Object.entries(VIEW_CONFIG).forEach(([key, vcfg]) => {
        if (key === view) _setSelection(ctx, vcfg, 0);
        else _clearSelection(ctx, vcfg);
      });

      ctx.setLauncherStatus("");
    },

    goBackLauncherView(ctx) {
      if (ctx.getCurrentLauncherView() === "play") {
        const form = document.getElementById("new-profile-form");
        if (form && !form.classList.contains("hidden")) { form.classList.add("hidden"); return; }
      }
      const history = ctx.getLauncherViewHistory();
      if (history.length > 1) history.pop();
      ctx.setLauncherViewHistory(history);
      NS.navigation.showLauncherView(ctx, history[history.length - 1] || "main", { fromHistory: true });
    },

    // ── Keyboard ──────────────────────────────────────────────────────────
    setupKeyboard(ctx) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "F11") { e.preventDefault(); ctx.toggleFullscreenMode(); return; }

        const view = ctx.getCurrentLauncherView();

        // ── Main menu: arrows move selection, Enter clicks, Escape is a no-op.
        if (view === "main") {
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); NS.navigation.setMainMenuSelection(ctx, ctx.getActiveMainMenuIndex() - 1); return; }
          if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); NS.navigation.setMainMenuSelection(ctx, ctx.getActiveMainMenuIndex() + 1); return; }
          if (e.key === "Enter") {
            e.preventDefault();
            const btns = NS.navigation.getMainMenuButtons(ctx);
            btns[ctx.getActiveMainMenuIndex()]?.click();
          }
          if (e.key === "Escape") e.preventDefault();
          return;
        }

        // ── Sub-views: generic arrow/Enter/Escape handling via VIEW_CONFIG.
        const vcfg = VIEW_CONFIG[view];
        if (!vcfg) return;

        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); _setSelection(ctx, vcfg, vcfg.getIdx(ctx) - 1); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); _setSelection(ctx, vcfg, vcfg.getIdx(ctx) + 1); return; }
        if (e.key === "Enter") {
          const els = vcfg.getEls(ctx);
          const active = els[vcfg.getIdx(ctx)];
          if (!active) return;
          // info-view: all elements are buttons and always get a click.
          // config/play: only BUTTON tags trigger click (inputs/selects handle Enter natively).
          if (view === "info" || active.tagName === "BUTTON") { e.preventDefault(); active.click(); }
          return;
        }
        if (e.key === "Escape" && vcfg.onEscape) { e.preventDefault(); NS.navigation.goBackLauncherView(ctx); }
      });
    },
  };
})();