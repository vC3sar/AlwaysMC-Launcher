(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  function createLauncherServices(api) {
    const has = (name) => api && typeof api[name] === "function";
    const safeInvoke = async (name, fn, fallback = null) => {
      try {
        return await fn();
      } catch (error) {
        console.warn(`[LauncherServices] ${name} failed:`, error?.message || error);
        return fallback;
      }
    };
    return {
      has,
      safeInvoke,
      api,
    };
  }
  NS.createLauncherServices = createLauncherServices;
})();
