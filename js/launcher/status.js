(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.status = {
    setLauncherStatus(text, isError = false) {
      const el = document.getElementById("launcher-status");
      if (!el) return;
      el.textContent = text || "";
      el.dataset.kind = isError ? "error" : "ok";
    },
    setGameStatus(text, isError = false) {
      const el = document.getElementById("game-install-status");
      if (!el) return;
      el.textContent = text || "";
      el.dataset.kind = isError ? "error" : "ok";
    },
    setMsAuthStatus(text, isError = false) {
      const el = document.getElementById("ms-auth-status");
      if (!el) return;
      el.textContent = text || "";
      el.dataset.kind = isError ? "error" : "ok";
    },
  };
})();
