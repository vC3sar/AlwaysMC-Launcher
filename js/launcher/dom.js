(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.dom = {
    get refs() {
      return {
        launcherStatus: document.getElementById("launcher-status"),
        gameInstallStatus: document.getElementById("game-install-status"),
        msAuthStatus: document.getElementById("ms-auth-status"),
      };
    },
  };
})();
