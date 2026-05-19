(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.state = {
    gameStarted: false,
    menuAudioMuted: false,
    menuAudioPlayPromise: null,
    menuAudioUnlockBound: false,
    currentBgVideoMode: "auto",
    currentBgVideoSrc: "",
    currentLauncherView: "main",
    launcherViewHistory: ["main"],
    activeMainMenuIndex: 0,
    activeConfigIndex: 0,
    activePlayIndex: 0,
    activeInfoIndex: 0,
    gameCatalog: { vanilla: [], forge: [], fabric: [] },
    activeInstallId: "",
    installPollTimer: null,
    activePlayTab: "bot",
    javaSectionCatalogLoaded: false,
    catalogRequestSeq: 0,
    lastAppliedCatalogRequest: 0,
    msAuthState: { accounts: [], activeAccountId: null },
    versionTypeFilters: { release: true, snapshot: false, old_beta: false, old_alpha: false },
  };
})();
