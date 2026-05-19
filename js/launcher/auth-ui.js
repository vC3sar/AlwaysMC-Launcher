(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.authUI = {
    isMicrosoftDisabled() {
      const select = document.getElementById("game-auth-mode");
      const option = select ? select.querySelector('option[value="microsoft"]') : null;
      return Boolean(option && option.disabled);
    },
  };
})();
