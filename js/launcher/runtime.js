(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  const i18n = window.MCSharedI18n;
  const t = (key, params) => (i18n?.t ? i18n.t(key, params) : key);

  NS.runtime = {
    async waitInstallCompletion(ctx, installId) {
      const { launcherAPI, setGameStatus } = ctx;
      if (!launcherAPI || !installId) return { ok: false, error: t("launcher.status.installInvalid") };
      while (true) {
        const statusRes = await launcherAPI.getInstallStatus(installId);
        if (!statusRes?.ok) return { ok: false, error: ctx.translateError?.(statusRes) || statusRes?.error || t("launcher.status.installQueryFail") };
        const st = statusRes.status || {};
        const pct = Number.isFinite(st.progress) ? `${Math.max(0, Math.min(100, Math.round(st.progress)))}%` : "";
        const msg = st.message || t("launcher.status.processing");
        setGameStatus(`[${st.phase || "working"}] ${pct} ${msg}`.trim(), st.phase === "error");
        if (!st.busy) {
          if (st.phase === "done") return { ok: true };
          return { ok: false, error: st.error || st.message || t("launcher.status.installIncomplete") };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },

    formatRuntimeDiagnostics(_ctx, st) {
      const lines = [];
      lines.push(t("launcher.runtime.diagTitle"));
      lines.push(`- running: ${Boolean(st?.running)}`);
      lines.push(`- pid: ${st?.pid ?? "n/a"}`);
      lines.push(`- java seleccionado: ${st?.javaPathSelected || "n/a"}`);
      lines.push(`- java probados: ${Array.isArray(st?.javaPathTried) ? st.javaPathTried.join(" | ") || "n/a" : "n/a"}`);
      lines.push(`- lastExitCode: ${st?.lastExitCode ?? "n/a"}`);
      lines.push(`- lastLifecycleEvent: ${st?.lastLifecycleEvent || "n/a"}`);
      lines.push(`- lineCount: ${Number(st?.lineCount || 0)}`);
      if (Number(st?.silenceMs || 0) > 0) lines.push(`- silenceMs: ${st.silenceMs} (threshold ${st?.stallThresholdMs || "n/a"})`);
      if (st?.lastError) lines.push(`- lastError: ${st.lastError}`);
      if (st?.lastErrorLines) {
        lines.push(t("launcher.runtime.lastLines"));
        lines.push(st.lastErrorLines);
      }
      return lines.join("\n");
    },
  };
})();
